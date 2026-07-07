-- ============================================================================
-- quiz_sessions — Phase 5
-- ============================================================================
-- Stores the result of every generated-and-answered practice quiz so the
-- user can see "last attempt" and we can show trends over time.
--
-- Questions are stored as a jsonb blob (the full QuizQuestion array we sent
-- the user) so we can re-grade on a retry and render past quizzes read-only
-- without re-hitting Gemini.
-- ============================================================================

create table if not exists public.quiz_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  topic text not null,                                -- MistakeType, e.g. "subject_verb_agreement"
  topic_label text not null,                          -- human-readable, e.g. "Subject-Verb Agreement"
  questions jsonb not null default '[]'::jsonb,      -- the QuizQuestion[] we sent the user
  answers jsonb not null default '[]'::jsonb,         -- the [answer_index|null] the user picked
  score int not null default 0,                       -- number of correct answers
  total int not null default 0,                       -- total questions asked
  created_at timestamptz default now()
);

create index quiz_sessions_user_id_idx
  on public.quiz_sessions(user_id);
create index quiz_sessions_created_at_idx
  on public.quiz_sessions(created_at desc);

alter table public.quiz_sessions enable row level security;

create policy "Users see own quiz sessions"
  on public.quiz_sessions
  for select
  using (auth.uid() = user_id);

create policy "Users insert own quiz sessions"
  on public.quiz_sessions
  for insert
  with check (auth.uid() = user_id);
