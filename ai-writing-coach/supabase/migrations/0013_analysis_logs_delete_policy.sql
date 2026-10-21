-- Keep analysis history and the derived mistake memory in sync.
-- Progress and Practice read public.mistakes, while History reads
-- public.analysis_logs. Rebuild the derived rows after every history deletion
-- so deleting an analysis removes its contribution everywhere atomically.

grant delete on table public.analysis_logs to authenticated, service_role;

drop policy if exists "Users delete own history" on public.analysis_logs;

create policy "Users delete own history" on public.analysis_logs
  for delete using (auth.uid() = user_id);

create or replace function public.rebuild_user_mistakes(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.mistakes as stored
  where stored.user_id = p_user_id
    and not exists (
      select 1
      from public.analysis_logs as log
      cross join lateral jsonb_array_elements(
        case
          when jsonb_typeof(log.mistakes) = 'array' then log.mistakes
          else '[]'::jsonb
        end
      ) as item(value)
      where log.user_id = p_user_id
        and item.value->>'type' = stored.mistake_type
        and item.value->>'wrong_text' = stored.wrong_text
    );

  with expanded as (
    select
      log.user_id,
      log.created_at,
      item.value->>'type' as mistake_type,
      item.value->>'wrong_text' as wrong_text,
      item.value->>'correct_text' as correct_text,
      nullif(item.value->>'explanation', '') as explanation,
      nullif(item.value->>'tip', '') as tip
    from public.analysis_logs as log
    cross join lateral jsonb_array_elements(
      case
        when jsonb_typeof(log.mistakes) = 'array' then log.mistakes
        else '[]'::jsonb
      end
    ) as item(value)
    where log.user_id = p_user_id
      and nullif(item.value->>'type', '') is not null
      and nullif(item.value->>'wrong_text', '') is not null
      and nullif(item.value->>'correct_text', '') is not null
  ), grouped as (
    select
      user_id,
      mistake_type,
      wrong_text,
      (array_agg(correct_text order by created_at desc))[1] as correct_text,
      (array_agg(explanation order by created_at desc)
        filter (where explanation is not null))[1] as explanation,
      (array_agg(tip order by created_at desc)
        filter (where tip is not null))[1] as tip,
      count(*)::int as frequency_count,
      min(created_at) as first_seen_at,
      max(created_at) as last_seen_at
    from expanded
    group by user_id, mistake_type, wrong_text
  )
  insert into public.mistakes (
    user_id,
    mistake_type,
    wrong_text,
    correct_text,
    explanation,
    tip,
    frequency_count,
    first_seen_at,
    last_seen_at
  )
  select
    user_id,
    mistake_type,
    wrong_text,
    correct_text,
    explanation,
    tip,
    frequency_count,
    first_seen_at,
    last_seen_at
  from grouped
  on conflict (user_id, mistake_type, wrong_text)
  do update set
    correct_text = excluded.correct_text,
    explanation = excluded.explanation,
    tip = excluded.tip,
    frequency_count = excluded.frequency_count,
    first_seen_at = excluded.first_seen_at,
    last_seen_at = excluded.last_seen_at;

  -- A repeat notification is derived from the same aggregate. Remove it when
  -- the retained history no longer supports the milestone it announced.
  delete from public.notifications as notification
  where notification.user_id = p_user_id
    and notification.kind = 'repeat_milestone'
    and not exists (
      select 1
      from public.mistakes as stored
      where stored.user_id = p_user_id
        and stored.mistake_type = notification.metadata->>'mistake_type'
        and stored.wrong_text = notification.metadata->>'wrong_text'
        and stored.frequency_count >= case
          when notification.metadata->>'count' ~ '^[0-9]+$'
            then (notification.metadata->>'count')::int
          else 1
        end
    );
end;
$$;

revoke all on function public.rebuild_user_mistakes(uuid) from public;

create or replace function public.sync_mistakes_after_history_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.rebuild_user_mistakes(old.user_id);
  return old;
end;
$$;

revoke all on function public.sync_mistakes_after_history_delete() from public;

drop trigger if exists sync_mistakes_after_history_delete
  on public.analysis_logs;

create trigger sync_mistakes_after_history_delete
  after delete on public.analysis_logs
  for each row
  execute function public.sync_mistakes_after_history_delete();

-- Repair aggregate rows left stale by deletions made before this trigger.
do $$
declare
  target_user record;
begin
  for target_user in
    select user_id from public.analysis_logs
    union
    select user_id from public.mistakes
  loop
    perform public.rebuild_user_mistakes(target_user.user_id);
  end loop;
end;
$$;
