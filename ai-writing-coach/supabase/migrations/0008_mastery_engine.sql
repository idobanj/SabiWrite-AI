-- ============================================================================
-- AI Writing Coach with Memory — Mastery Engine (Phase 8)
-- ============================================================================
-- A mistake row's `mastery_level` (0..5) climbs toward 5 through three
-- paths: quiz success, drought (no repeats in 7 days with 3+ drafts), and
-- manual self-marking. At level 5, resolved flips to true and the row is
-- effectively retired from the active mistake feed.
--
-- The promotion logic lives in PL/pgSQL inside the database rather than in
-- an Edge Function so the rules are deterministic, atomic, and easy to
-- audit. Edge Functions wrap these functions with auth + nice payloads.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- bump_mastery: increment a single mistake's mastery_level by `delta`,
-- clamped at [0, 5]. When the new level is 5, flip resolved = true.
--
-- Returns the (previous_level, new_level, resolved) tuple so the caller
-- can detect promotions and emit notifications.
-- ----------------------------------------------------------------------------
create or replace function public.bump_mastery(
  p_user_id uuid,
  p_mistake_id uuid,
  p_delta int default 1
)
returns table (previous_level int, new_level int, resolved boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prev int;
  v_new  int;
begin
  -- Verify the row exists and belongs to the caller. SECURITY: the
  -- function is SECURITY DEFINER but we still want the explicit check so
  -- a misrouted call (wrong user_id) fails loudly.
  select mastery_level
    into v_prev
    from public.mistakes
   where id = p_mistake_id
     and user_id = p_user_id;

  if not found then
    raise exception 'Mistake % not found for user %', p_mistake_id, p_user_id;
  end if;

  -- Clamp to [0, 5]. p_delta can be negative for future use, but today
  -- every caller passes +1.
  v_new := greatest(0, least(5, v_prev + p_delta));

  update public.mistakes
     set mastery_level = v_new,
         resolved      = (v_new >= 5),
         updated_at    = now()
   where id = p_mistake_id;

  return query select v_prev, v_new, (v_new >= 5);
end;
$$;

-- ----------------------------------------------------------------------------
-- check_drought: for each active mistake belonging to the user that
-- hasn't been seen in 7+ days, AND where the user has submitted 3+
-- drafts in the same window, bump mastery by +1. Idempotent within a
-- day (a mistake only gets one drought bump per 24h) so calling it on
-- every bell-open is cheap.
--
-- Returns the set of promoted mistake rows (id, wrong_text, new_level).
-- ----------------------------------------------------------------------------
create or replace function public.check_drought(p_user_id uuid)
returns table (mistake_id uuid, mistake_type text, wrong_text text, correct_text text, new_level int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seven_days_ago timestamptz := now() - interval '7 days';
  v_recent_drafts int;
begin
  -- Quick exit: fewer than 3 drafts in the last 7 days means nothing
  -- can possibly have promoted.
  select count(*)
    into v_recent_drafts
    from public.analysis_logs
   where user_id = p_user_id
     and created_at >= v_seven_days_ago;

  if v_recent_drafts < 3 then
    return;
  end if;

  return query
  with candidates as (
    select m.id, m.mastery_level
      from public.mistakes m
     where m.user_id = p_user_id
       and m.resolved = false
       and m.last_seen_at < v_seven_days_ago
       -- Skip rows we already promoted in the last 24h.
       and coalesce(
             (m.mastery_level >= 1 and m.last_seen_at < now() - interval '24 hours'),
             true
           )
       for update
  ),
  bumped as (
    update public.mistakes m
       set mastery_level = least(5, m.mastery_level + 1),
           resolved      = (least(5, m.mastery_level + 1) >= 5)
      from candidates c
     where m.id = c.id
    returning m.id, m.mistake_type, m.wrong_text, m.correct_text, m.mastery_level
  )
  select b.id, b.mistake_type, b.wrong_text, b.correct_text, b.mastery_level
    from bumped b;
end;
$$;

-- ----------------------------------------------------------------------------
-- grant execute on both functions to authenticated + service_role.
-- We grant directly here (rather than waiting on 0009) so this migration
-- is self-contained. 0009 is a no-op now but kept for consistency with
-- the prior migration naming convention.
-- ----------------------------------------------------------------------------
grant execute on function public.bump_mastery(uuid, uuid, int) to authenticated, service_role;
grant execute on function public.check_drought(uuid) to authenticated, service_role;