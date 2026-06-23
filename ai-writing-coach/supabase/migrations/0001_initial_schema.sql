-- ============================================================================
-- AI Writing Coach with Memory — Initial Schema (Phase 0)
-- ============================================================================
-- This migration creates the three core tables and enables Row Level Security
-- (RLS) on all of them. RLS is non-negotiable: even if the client is
-- compromised, users can only access their own data.
--
-- Tables:
--   profiles       — app-specific user data (Supabase auth.users holds auth)
--   mistakes       — the persistent mistake memory that powers the coaching
--   analysis_logs  — raw analysis history for stats and trend computation
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. profiles
-- ----------------------------------------------------------------------------
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  display_name text,
  native_language text,
  target_goal text,
  school text,
  cgpa text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- 2. mistakes
-- ----------------------------------------------------------------------------
-- The heart of the app. Every mistake a user makes is logged here. When the
-- same mistake is seen again, frequency_count is incremented. This drives
-- pattern detection and lesson generation in later phases.
create table public.mistakes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  mistake_type text not null,
  wrong_text text not null,
  correct_text text not null,
  explanation text,
  tip text,
  frequency_count int default 1,
  first_seen_at timestamptz default now(),
  last_seen_at timestamptz default now(),
  resolved boolean default false
);

create index mistakes_user_id_idx on public.mistakes(user_id);
create index mistakes_mistake_type_idx on public.mistakes(mistake_type);
create index mistakes_last_seen_at_idx on public.mistakes(last_seen_at desc);

-- ----------------------------------------------------------------------------
-- 3. analysis_logs
-- ----------------------------------------------------------------------------
-- One row per analysis run. Stats (drafts polished, error density, accuracy,
-- charts) are derived from this table via SQL aggregation in Phase 4.
create table public.analysis_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  original_text text not null,
  corrected_text text not null,
  mistake_count int default 0,
  accuracy_score int default 0,
  focus_area text,
  created_at timestamptz default now()
);

create index analysis_logs_user_id_idx on public.analysis_logs(user_id);
create index analysis_logs_created_at_idx on public.analysis_logs(created_at desc);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.mistakes enable row level security;
alter table public.analysis_logs enable row level security;

-- profiles: users can only see/update their own profile row
create policy "Users see own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- mistakes: users can only see/log/update their own mistakes
create policy "Users see own mistakes"
  on public.mistakes for select
  using (auth.uid() = user_id);

create policy "Users insert own mistakes"
  on public.mistakes for insert
  with check (auth.uid() = user_id);

create policy "Users update own mistakes"
  on public.mistakes for update
  using (auth.uid() = user_id);

-- analysis_logs: users can only see/log their own history
create policy "Users see own history"
  on public.analysis_logs for select
  using (auth.uid() = user_id);

create policy "Users insert own history"
  on public.analysis_logs for insert
  with check (auth.uid() = user_id);

-- ============================================================================
-- TRIGGER: auto-create profile row on signup
-- ============================================================================
-- When a user signs up via Supabase Auth, automatically insert a matching
-- row into public.profiles. The Edge Function in Phase 1 may also create
-- profiles manually — both paths are safe due to the ON CONFLICT clause.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
