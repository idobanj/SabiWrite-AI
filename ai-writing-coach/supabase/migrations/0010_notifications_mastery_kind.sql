-- ============================================================================
-- 0010_notifications_mastery_kind.sql — widen notifications.kind (Phase 8)
-- ============================================================================
-- Phase 7's 0006_notifications.sql constrained `kind` to three values:
--   repeat_milestone, streak_at_risk, quiz_followup.
-- Phase 8 adds a fourth: mastery_milestone, fired when a mistake row
-- crosses mastery_level 5. Drop and recreate the CHECK to widen.
-- ============================================================================

alter table public.notifications
  drop constraint if exists notifications_kind_check;

alter table public.notifications
  add constraint notifications_kind_check
  check (kind in (
    'repeat_milestone',
    'streak_at_risk',
    'quiz_followup',
    'mastery_milestone'
  ));