-- The server bans the Auth user and disables their profile before calling this
-- capability. It must continue checking profiles.is_active on every protected
-- request: deleting sessions does not invalidate already-issued JWT signatures.
-- No account, event membership, attendee, or audit history is deleted here.

create schema if not exists jupiter_private;
revoke all on schema jupiter_private from public, anon, authenticated;
grant usage on schema jupiter_private to service_role;

-- service_role intentionally has no general DELETE access to the auth schema.
-- Keep the privileged implementation outside the exposed public schema instead
-- of granting the application broad privileges over managed Auth tables.
create or replace function jupiter_private.revoke_team_user_sessions(
  target_user_id uuid,
  actor_user_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_profile public.profiles%rowtype;
  target_profile public.profiles%rowtype;
  sessions_revoked integer;
begin
  -- current_user becomes the function owner in a definer function, whereas the
  -- session's SET ROLE remains the actual PostgREST caller (service_role).
  if pg_catalog.current_setting('role', true) is distinct from 'service_role' then
    raise exception 'Session revocation requires the server service role.' using errcode = '42501';
  end if;
  if target_user_id is null or actor_user_id is null or target_user_id = actor_user_id then
    raise exception 'A different team user is required.' using errcode = '22023';
  end if;
  -- A normal service key has no user subject. If one is supplied, it may not
  -- disagree with the authenticated owner passed by the server route.
  if auth.uid() is not null and auth.uid() <> actor_user_id then
    raise exception 'The acting user does not match the authenticated subject.' using errcode = '42501';
  end if;

  select p.* into actor_profile
  from public.profiles p
  where p.id = actor_user_id
  for share;
  if not found or actor_profile.role is distinct from 'admin'
    or actor_profile.team_role is distinct from 'owner'
    or actor_profile.is_active is distinct from true then
    raise exception 'An active Owner is required.' using errcode = '42501';
  end if;

  select p.* into target_profile
  from public.profiles p
  where p.id = target_user_id
  for update;
  if not found then
    raise exception 'Team member not found.' using errcode = 'P0002';
  end if;
  if target_profile.team_role = 'owner'
    or coalesce(target_profile.role, '') not in ('admin', 'event_member') then
    raise exception 'Only non-owner team accounts can be signed out.' using errcode = '42501';
  end if;
  if target_profile.is_active is distinct from false then
    raise exception 'Disable the team account before revoking sessions.' using errcode = '55000';
  end if;

  -- Refresh tokens with session_id are also covered by the sessions FK cascade;
  -- explicitly delete by user_id to include legacy/sessionless refresh tokens.
  delete from auth.refresh_tokens r where r.user_id = target_user_id::text;
  delete from auth.sessions s where s.user_id = target_user_id;
  get diagnostics sessions_revoked = row_count;

  return sessions_revoked;
end;
$$;

revoke all on function jupiter_private.revoke_team_user_sessions(uuid, uuid) from public, anon, authenticated;
grant execute on function jupiter_private.revoke_team_user_sessions(uuid, uuid) to service_role;

-- Only this non-privileged entry point is exposed through the Data API.
create or replace function public.revoke_team_user_sessions(
  target_user_id uuid,
  actor_user_id uuid
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user <> 'service_role' then
    raise exception 'Session revocation requires the server service role.' using errcode = '42501';
  end if;
  return jupiter_private.revoke_team_user_sessions(target_user_id, actor_user_id);
end;
$$;

revoke all on function public.revoke_team_user_sessions(uuid, uuid) from public, anon, authenticated;
grant execute on function public.revoke_team_user_sessions(uuid, uuid) to service_role;

comment on function public.revoke_team_user_sessions(uuid, uuid) is
  'Server-only owner suspension capability. Revokes sessions for an already-disabled, non-owner Jupiter team account. Does not delete the account or invalidate signed JWTs by itself.';

notify pgrst, 'reload schema';
