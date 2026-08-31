-- ============================================================================
-- AI Writing Coach — Fix bump_mastery SQL function (0012)
-- ============================================================================
-- Fixes column reference in bump_mastery to use last_seen_at (and ensures
-- updated_at column exists for future-proofing).
-- ============================================================================

alter table if exists public.mistakes add column if not exists updated_at timestamptz default now();

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
  select mastery_level
    into v_prev
    from public.mistakes
   where id = p_mistake_id
     and user_id = p_user_id;

  if not found then
    raise exception 'Mistake % not found for user %', p_mistake_id, p_user_id;
  end if;

  v_new := greatest(0, least(5, v_prev + p_delta));

  update public.mistakes
     set mastery_level = v_new,
         resolved      = (v_new >= 5),
         last_seen_at  = now(),
         updated_at    = now()
   where id = p_mistake_id;

  return query select v_prev, v_new, (v_new >= 5);
end;
$$;

grant execute on function public.bump_mastery(uuid, uuid, int) to authenticated, service_role;
