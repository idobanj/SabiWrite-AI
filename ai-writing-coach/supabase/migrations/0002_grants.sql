-- ============================================================================
-- 0002_grants.sql — fix missing table-level grants
-- ============================================================================
-- On the hosted Supabase project, the public tables created in 0001 are
-- missing the default GRANT to anon / authenticated / service_role. RLS is
-- still in force — these grants just let the role *attempt* the query;
-- the policies then decide what's allowed. This is the Supabase default
-- that didn't get applied for some reason.
-- ============================================================================

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on table public.profiles
  to anon, authenticated, service_role;

grant select, insert, update, delete on table public.mistakes
  to anon, authenticated, service_role;

grant select, insert on table public.analysis_logs
  to anon, authenticated, service_role;

grant select, insert on table public.mastery_sessions
  to anon, authenticated, service_role;

-- Sequences (e.g. the gen_random_uuid-backed ones) need USAGE so future
-- inserts that rely on them work.
grant usage, select on all sequences in schema public
  to anon, authenticated, service_role;