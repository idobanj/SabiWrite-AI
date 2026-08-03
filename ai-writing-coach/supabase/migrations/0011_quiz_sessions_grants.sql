-- ============================================================================
-- 0011_quiz_sessions_grants.sql -- grants for quiz_sessions table
-- ============================================================================
-- The quiz_sessions table was added in 0004_quiz_sessions.sql but the
-- corresponding grants were missing from 0002_grants.sql. This migration
-- adds the necessary permissions for the authenticated role to interact
-- with the quiz_sessions table.

grant select, insert on table public.quiz_sessions
  to anon, authenticated, service_role;