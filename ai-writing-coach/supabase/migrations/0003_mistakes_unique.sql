-- ============================================================================
-- 0003_mistakes_unique.sql — dedup key for log-mistake upserts
-- ============================================================================
-- The mistakes table aggregates repeats: a user's recurring "they has" mistake
-- is one row, not many. To do that with ON CONFLICT we need a unique key
-- (user_id, mistake_type, wrong_text). The trigger in 0001 already enforces
-- user-scoping via RLS; this index is purely for upsert correctness.
-- ============================================================================

alter table public.mistakes
  add constraint mistakes_user_type_wrong_unique
  unique (user_id, mistake_type, wrong_text);
