-- ============================================================================
-- AI Writing Coach with Memory — Initial Schema (Phase 0/1)
-- ============================================================================
-- Four tables + RLS + auto-profile trigger. RLS is non-negotiable: users can
-- only access their own data, even if the client is compromised.
-- ============================================================================

-- 1. User profile (1:1 with auth.users). Auto-created on signup by trigger.
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  target_goal text,                                  -- e.g. "Pass IELTS"
  cgpa numeric,                                      -- 4.32, not "4.32"
  updated_at timestamptz default now()
);

-- 2. The heart of the app: persistent mistake memory.
--    Aggregated across submissions so we can see patterns and repetition.
create table public.mistakes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  mistake_type text not null,                        -- e.g. "subject_verb_agreement"
  wrong_text text not null,
  correct_text text not null,
  explanation text,
  tip text,
  frequency_count int default 1,                     -- bumped on every recurrence
  first_seen_at timestamptz default now(),
  last_seen_at timestamptz default now(),
  resolved boolean default false,
  -- Forward-looking (Phase 8 mastery / Phase 5 lessons)
  mastery_level int default 0,                       -- 0..5
  lesson_id uuid                                     -- FK to lessons table (Phase 5)
);

create index mistakes_user_id_idx on public.mistakes(user_id);
create index mistakes_mistake_type_idx on public.mistakes(mistake_type);
create index mistakes_last_seen_at_idx on public.mistakes(last_seen_at desc);

-- 3. Raw analysis history — every submission gets one row.
--    Powers the History page and the dashboard's "submissions over time" chart.
create table public.analysis_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  original_text text not null,
  corrected_text text not null,
  mistake_count int default 0,
  accuracy_score int default 0,                      -- 0..100
  focus_area text,
  created_at timestamptz default now()
);

create index analysis_logs_user_id_idx on public.analysis_logs(user_id);
create index analysis_logs_created_at_idx on public.analysis_logs(created_at desc);

-- 4. Stub for future quiz/mastery tracking (Phase 6+).
--    Created now so we don't have to migrate later.
create table public.mastery_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  error_type text,
  score int,                                          -- 0..100
  attempted_at timestamptz default now()
);

create index mastery_sessions_user_id_idx on public.mastery_sessions(user_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.mistakes enable row level security;
alter table public.analysis_logs enable row level security;
alter table public.mastery_sessions enable row level security;

-- profiles: owner can read, insert, update. (Delete is cascade only.)
create policy "Users see own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users insert own profile" on public.profiles
  for insert with check (auth.uid() = id);
create policy "Users update own profile" on public.profiles
  for update using (auth.uid() = id);

-- mistakes: owner has full CRUD.
create policy "Users see own mistakes" on public.mistakes
  for select using (auth.uid() = user_id);
create policy "Users insert own mistakes" on public.mistakes
  for insert with check (auth.uid() = user_id);
create policy "Users update own mistakes" on public.mistakes
  for update using (auth.uid() = user_id);
create policy "Users delete own mistakes" on public.mistakes
  for delete using (auth.uid() = user_id);

-- analysis_logs: append-only history (no update/delete from the client).
create policy "Users see own history" on public.analysis_logs
  for select using (auth.uid() = user_id);
create policy "Users insert own history" on public.analysis_logs
  for insert with check (auth.uid() = user_id);

-- mastery_sessions: append-only history.
create policy "Users see own mastery sessions" on public.mastery_sessions
  for select using (auth.uid() = user_id);
create policy "Users insert own mastery sessions" on public.mastery_sessions
  for insert with check (auth.uid() = user_id);

-- ============================================================================
-- AUTO-PROFILE TRIGGER
-- ============================================================================
-- Runs as the function owner (security definer) so it can write into profiles
-- even though RLS would otherwise block inserts from auth.users context.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
