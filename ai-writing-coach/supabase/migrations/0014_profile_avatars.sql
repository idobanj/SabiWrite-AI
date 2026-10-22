-- Shared avatars ship with the frontend. Store only a two-byte selection.
alter table public.profiles
  add column avatar_id smallint not null default 0
  constraint profiles_avatar_id_check check (avatar_id between 0 and 4);

comment on column public.profiles.avatar_id is
  'ID of a built-in avatar (0-4). Image files are not stored per user.';
