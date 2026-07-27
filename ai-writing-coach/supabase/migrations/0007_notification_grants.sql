-- ============================================================================
-- 0007_notification_grants.sql — grants for public.notifications (Phase 7)
-- ============================================================================
-- Same pattern as 0002_grants.sql. RLS still gates the actual access; these
-- grants just let the roles attempt the queries. The new notifications table
-- is missing these because 0002 shipped before the table existed.
-- ============================================================================

grant select, insert, update on table public.notifications
  to anon, authenticated, service_role;