create table if not exists public.event_team_members (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  is_active boolean not null default true,
  invite_status text not null default 'active',
  invited_at timestamptz,
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_team_members_event_user_key unique (event_id, user_id),
  constraint event_team_members_role_check
    check (role in ('event_admin', 'producer', 'viewer')),
  constraint event_team_members_invite_status_check
    check (invite_status in ('active', 'pending'))
);

create index if not exists event_team_members_user_active_idx
  on public.event_team_members(user_id, is_active);

create index if not exists event_team_members_event_active_idx
  on public.event_team_members(event_id, is_active);

alter table public.event_team_members enable row level security;

revoke all on table public.event_team_members from anon;
revoke insert, update, delete on table public.event_team_members from authenticated;
grant select on table public.event_team_members to authenticated;

drop policy if exists "Members can read own event access" on public.event_team_members;
create policy "Members can read own event access"
  on public.event_team_members
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

comment on table public.event_team_members is
  'Event-scoped administrative access. Global owners and administrators remain in profiles.';

-- Profile authorization fields are server-managed. The previous policy allowed a
-- signed-in user to update their own role and active state through the Data API.
drop policy if exists "Users can update own profile" on public.profiles;
revoke update on table public.profiles from anon, authenticated;
