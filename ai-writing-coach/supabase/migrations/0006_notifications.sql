-- ============================================================================
-- AI Writing Coach with Memory — Notifications (Phase 7)
-- ============================================================================
-- Server-stored notifications surfaced in the bell icon. Three kinds:
--   1. repeat_milestone — log-mistake fires when a row hits count 3/5/10
--   2. streak_at_risk   — get-notifications fires when streak>=2 + no draft today
--   3. quiz_followup    — practice.js fires when user beats a prior quiz score
--
-- Notifications are append-only from the client's perspective: marking-as-read
-- flips read_at; we never expose delete to the client.
-- ============================================================================

create table public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,

  -- The kind of notification. Keep this enum tight; new kinds go in a new
  -- migration so the existing constraint doesn't need to be rewritten.
  kind text not null check (kind in (
    'repeat_milestone',
    'streak_at_risk',
    'quiz_followup'
  )),

  -- Pre-formatted short headline (e.g. "Recurring slip: 'they has'").
  title text not null,

  -- One-sentence body shown beneath the title in the dropdown.
  body text not null,

  -- Where the bell navigates when the user clicks the row. Can be a
  -- route within the SPA (e.g. '/app/workspace') or null for info-only
  -- notifications.
  link text,

  -- Per-kind display data the UI may want without re-fetching:
  --   repeat_milestone: { count, mistake_type, wrong_text, correct_text }
  --   streak_at_risk:   { streak_days }
  --   quiz_followup:    { topic, topic_label, score, total, previous_score }
  metadata jsonb not null default '{}'::jsonb,

  -- Null = unread. Set by markNotificationRead on the client.
  read_at timestamptz,

  created_at timestamptz default now()
);

-- Fast "recent notifications for this user, newest first" lookup.
create index notifications_user_created_idx
  on public.notifications(user_id, created_at desc);

-- Fast unread count + "open the bell" query.
create index notifications_user_unread_idx
  on public.notifications(user_id)
  where read_at is null;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.notifications enable row level security;

-- Users see only their own notifications.
create policy "Users see own notifications"
  on public.notifications
  for select
  using (auth.uid() = user_id);

-- Users can insert their own notifications. The bell writes a quiz_followup
-- row directly from the client (after saveQuizSession). Edge functions use
-- the service role and bypass RLS entirely.
create policy "Users insert own notifications"
  on public.notifications
  for insert
  with check (auth.uid() = user_id);

-- Users can flip read_at on their own rows. No other fields are writable
-- from the client (kind/title/body/link are server-authoritative).
create policy "Users update own notifications"
  on public.notifications
  for update
  using (auth.uid() = user_id);