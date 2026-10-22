-- Retire saved quiz attempts and the mastery feature. Analysis history,
-- recurring mistake memory, and current-quiz scoring remain available.
-- Applied migrations are retained so a fresh database reaches this same schema.
begin;

drop function if exists public.bump_mastery(uuid, uuid, integer);
drop function if exists public.check_drought(uuid);

drop table if exists public.quiz_sessions;
drop table if exists public.mastery_sessions;

alter table public.mistakes
  drop column if exists mastery_level,
  drop column if exists resolved;

-- Remove notifications produced by the retired features from the bell too.
delete from public.notifications
where kind in ('quiz_followup', 'mastery_milestone');

alter table public.notifications
  drop constraint if exists notifications_kind_check;

alter table public.notifications
  add constraint notifications_kind_check
  check (kind in ('repeat_milestone', 'streak_at_risk'));

notify pgrst, 'reload schema';
commit;
