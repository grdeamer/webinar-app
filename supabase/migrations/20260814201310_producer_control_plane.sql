alter table if exists public.event_live_stage_state
  add column if not exists preview_blocks jsonb not null default '[]'::jsonb,
  add column if not exists last_command_id uuid;

alter table if exists public.event_live_program_state
  add column if not exists program_blocks jsonb not null default '[]'::jsonb,
  add column if not exists transition_json jsonb not null default '{}'::jsonb,
  add column if not exists active_scene_id uuid,
  add column if not exists last_command_id uuid;

alter table if exists public.event_live_scenes
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.event_live_commands (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  command_id uuid not null,
  command_type text not null,
  actor_id uuid references auth.users(id) on delete set null,
  actor_label text,
  expected_version bigint,
  applied_version bigint,
  payload jsonb not null default '{}'::jsonb,
  result_state jsonb,
  status text not null default 'applied',
  error_message text,
  created_at timestamptz not null default now(),
  constraint event_live_commands_event_command_key unique (event_id, command_id),
  constraint event_live_commands_status_check
    check (status in ('applied', 'rejected', 'failed'))
);

create index if not exists event_live_commands_event_created_idx
  on public.event_live_commands(event_id, created_at desc);

create table if not exists public.event_live_recordings (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  room_name text not null,
  egress_id text not null unique,
  status text not null,
  source text,
  destination text,
  quality text,
  file_name text,
  file_location text,
  file_size bigint,
  error_message text,
  started_by uuid references auth.users(id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists event_live_recordings_event_started_idx
  on public.event_live_recordings(event_id, started_at desc);

create table if not exists public.event_live_assets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  asset_type text not null,
  label text not null,
  storage_path text not null,
  public_url text,
  mime_type text,
  byte_size bigint,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists event_live_assets_event_created_idx
  on public.event_live_assets(event_id, created_at desc);

alter table public.event_live_commands enable row level security;
alter table public.event_live_recordings enable row level security;
alter table public.event_live_assets enable row level security;

revoke all on table public.event_live_commands from anon, authenticated;
revoke all on table public.event_live_recordings from anon, authenticated;
revoke all on table public.event_live_assets from anon, authenticated;
grant all on table public.event_live_commands to service_role;
grant all on table public.event_live_recordings to service_role;
grant all on table public.event_live_assets to service_role;

create or replace function public.producer_take(
  p_event_id uuid,
  p_command_id uuid,
  p_expected_preview_version bigint,
  p_program_blocks jsonb,
  p_transition jsonb,
  p_actor_id uuid,
  p_actor_label text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_existing jsonb;
  v_preview public.event_live_stage_state%rowtype;
  v_program public.event_live_program_state%rowtype;
begin
  select result_state into v_existing
  from public.event_live_commands
  where event_id = p_event_id and command_id = p_command_id;

  if found then
    return v_existing;
  end if;

  select * into v_preview
  from public.event_live_stage_state
  where event_id = p_event_id
  for update;

  if not found then
    raise exception 'Preview state does not exist' using errcode = 'P0002';
  end if;

  if p_expected_preview_version is not null
     and coalesce(v_preview.scene_version, 1) <> p_expected_preview_version then
    raise exception 'Preview changed on another console. Refresh before taking.' using errcode = '40001';
  end if;

  insert into public.event_live_program_state (
    event_id, room_id, is_live, auto_director_enabled, layout,
    stage_participant_ids, primary_participant_id, pinned_participant_id,
    screen_share_participant_id, screen_share_track_id, scene_version,
    headline, message, updated_by, updated_at, program_blocks,
    transition_json, last_command_id
  ) values (
    p_event_id, v_preview.room_id, v_preview.is_live,
    v_preview.auto_director_enabled, v_preview.layout,
    v_preview.stage_participant_ids, v_preview.primary_participant_id,
    v_preview.pinned_participant_id, v_preview.screen_share_participant_id,
    v_preview.screen_share_track_id, 1, v_preview.headline,
    v_preview.message, p_actor_label, now(), coalesce(p_program_blocks, '[]'::jsonb),
    coalesce(p_transition, '{}'::jsonb), p_command_id
  )
  on conflict (event_id) do update set
    room_id = excluded.room_id,
    layout = excluded.layout,
    stage_participant_ids = excluded.stage_participant_ids,
    primary_participant_id = excluded.primary_participant_id,
    pinned_participant_id = excluded.pinned_participant_id,
    screen_share_participant_id = excluded.screen_share_participant_id,
    screen_share_track_id = excluded.screen_share_track_id,
    scene_version = coalesce(public.event_live_program_state.scene_version, 1) + 1,
    headline = excluded.headline,
    message = excluded.message,
    updated_by = excluded.updated_by,
    updated_at = excluded.updated_at,
    program_blocks = excluded.program_blocks,
    transition_json = excluded.transition_json,
    last_command_id = excluded.last_command_id
  returning * into v_program;

  v_existing := to_jsonb(v_program);

  insert into public.event_live_commands (
    event_id, command_id, command_type, actor_id, actor_label,
    expected_version, applied_version, payload, result_state
  ) values (
    p_event_id, p_command_id, 'take', p_actor_id, p_actor_label,
    p_expected_preview_version, v_program.scene_version,
    jsonb_build_object(
      'block_count', jsonb_array_length(coalesce(p_program_blocks, '[]'::jsonb)),
      'transition', coalesce(p_transition, '{}'::jsonb)
    ),
    v_existing
  );

  return v_existing;
end;
$$;

create or replace function public.producer_set_live(
  p_event_id uuid,
  p_command_id uuid,
  p_is_live boolean,
  p_expected_preview_version bigint,
  p_actor_id uuid,
  p_actor_label text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_existing jsonb;
  v_preview public.event_live_stage_state%rowtype;
  v_program public.event_live_program_state%rowtype;
begin
  select result_state into v_existing
  from public.event_live_commands
  where event_id = p_event_id and command_id = p_command_id;

  if found then
    return v_existing;
  end if;

  select * into v_preview
  from public.event_live_stage_state
  where event_id = p_event_id
  for update;

  if not found then
    raise exception 'Preview state does not exist' using errcode = 'P0002';
  end if;

  if p_expected_preview_version is not null
     and coalesce(v_preview.scene_version, 1) <> p_expected_preview_version then
    raise exception 'Preview changed on another console. Refresh before changing live state.' using errcode = '40001';
  end if;

  update public.event_live_stage_state
  set is_live = p_is_live,
      scene_version = coalesce(scene_version, 1) + 1,
      last_command_id = p_command_id,
      updated_by = p_actor_label,
      updated_at = now()
  where event_id = p_event_id
  returning * into v_preview;

  insert into public.event_live_program_state (
    event_id, room_id, is_live, auto_director_enabled, layout,
    stage_participant_ids, primary_participant_id, pinned_participant_id,
    screen_share_participant_id, screen_share_track_id, scene_version,
    headline, message, updated_by, updated_at, last_command_id
  ) values (
    p_event_id, v_preview.room_id, p_is_live, v_preview.auto_director_enabled,
    v_preview.layout, v_preview.stage_participant_ids,
    v_preview.primary_participant_id, v_preview.pinned_participant_id,
    v_preview.screen_share_participant_id, v_preview.screen_share_track_id,
    1, v_preview.headline, v_preview.message, p_actor_label, now(), p_command_id
  )
  on conflict (event_id) do update set
    is_live = excluded.is_live,
    scene_version = coalesce(public.event_live_program_state.scene_version, 1) + 1,
    last_command_id = excluded.last_command_id,
    updated_by = excluded.updated_by,
    updated_at = excluded.updated_at
  returning * into v_program;

  insert into public.event_live_state (
    event_id, mode, destination_type, is_live, updated_by, updated_at
  ) values (
    p_event_id,
    case when p_is_live then 'general_session' else 'off_air' end,
    case when p_is_live then 'general_session' else null end,
    p_is_live,
    p_actor_label,
    now()
  )
  on conflict (event_id) do update set
    is_live = excluded.is_live,
    updated_by = excluded.updated_by,
    updated_at = excluded.updated_at;

  v_existing := jsonb_build_object(
    'preview', to_jsonb(v_preview),
    'program', to_jsonb(v_program),
    'is_live', p_is_live
  );

  insert into public.event_live_commands (
    event_id, command_id, command_type, actor_id, actor_label,
    expected_version, applied_version, payload, result_state
  ) values (
    p_event_id, p_command_id,
    case when p_is_live then 'go_live' else 'go_off_air' end,
    p_actor_id, p_actor_label, p_expected_preview_version,
    v_preview.scene_version, jsonb_build_object('is_live', p_is_live), v_existing
  );

  return v_existing;
end;
$$;

revoke all on function public.producer_take(uuid, uuid, bigint, jsonb, jsonb, uuid, text)
  from public, anon, authenticated;
grant execute on function public.producer_take(uuid, uuid, bigint, jsonb, jsonb, uuid, text)
  to service_role;

revoke all on function public.producer_set_live(uuid, uuid, boolean, bigint, uuid, text)
  from public, anon, authenticated;
grant execute on function public.producer_set_live(uuid, uuid, boolean, bigint, uuid, text)
  to service_role;
