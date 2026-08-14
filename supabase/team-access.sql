alter table public.profiles
  add column if not exists team_role text,
  add column if not exists invite_status text not null default 'active',
  add column if not exists invited_at timestamptz,
  add column if not exists invited_by uuid references auth.users(id) on delete set null;

update public.profiles
set team_role = case when role = 'admin' then 'administrator' else team_role end
where team_role is null;

update public.profiles
set team_role = 'owner'
where id = (
  select id
  from public.profiles
  where role = 'admin' and is_active is not false
  order by created_at asc nulls last
  limit 1
);

alter table public.profiles
  drop constraint if exists profiles_team_role_check;

alter table public.profiles
  add constraint profiles_team_role_check
  check (team_role is null or team_role in ('owner', 'administrator'));

alter table public.profiles
  drop constraint if exists profiles_invite_status_check;

alter table public.profiles
  add constraint profiles_invite_status_check
  check (invite_status in ('active', 'pending'));

comment on column public.profiles.team_role is
  'Jupiter administration role. Owner is protected; administrator has full operational access.';
