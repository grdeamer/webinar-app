create table if not exists public.event_broadcast_destinations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  provider text not null,
  label text not null,
  server_url text not null,
  stream_key_ciphertext text not null,
  stream_key_hint text not null,
  enabled boolean not null default true,
  reusable boolean not null default false,
  status text not null default 'ready',
  created_by uuid references auth.users(id) on delete set null,
  last_tested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_broadcast_destinations_provider_check
    check (provider in ('youtube', 'linkedin', 'facebook', 'vimeo', 'custom')),
  constraint event_broadcast_destinations_status_check
    check (status in ('ready', 'disabled', 'error')),
  constraint event_broadcast_destinations_label_length_check
    check (char_length(label) between 1 and 120),
  constraint event_broadcast_destinations_server_url_length_check
    check (char_length(server_url) between 8 and 1000)
);

create index if not exists event_broadcast_destinations_event_created_idx
  on public.event_broadcast_destinations(event_id, created_at desc);

create index if not exists event_broadcast_destinations_created_by_idx
  on public.event_broadcast_destinations(created_by)
  where created_by is not null;

create table if not exists public.event_broadcast_runs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  room_name text not null,
  egress_id text not null unique,
  status text not null default 'starting',
  quality_profile text not null default 'universal-720p30',
  recording_enabled boolean not null default true,
  started_by uuid references auth.users(id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_broadcast_runs_status_check
    check (status in ('starting', 'active', 'ending', 'complete', 'failed', 'aborted', 'limit_reached'))
);

create index if not exists event_broadcast_runs_event_started_idx
  on public.event_broadcast_runs(event_id, started_at desc);

create index if not exists event_broadcast_runs_active_idx
  on public.event_broadcast_runs(event_id, started_at desc)
  where status in ('starting', 'active', 'ending');

create index if not exists event_broadcast_runs_started_by_idx
  on public.event_broadcast_runs(started_by)
  where started_by is not null;

create table if not exists public.event_broadcast_run_destinations (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.event_broadcast_runs(id) on delete cascade,
  destination_id uuid references public.event_broadcast_destinations(id) on delete set null,
  provider text not null,
  label text not null,
  server_url_masked text not null,
  output_fingerprint text not null,
  status text not null default 'starting',
  retries integer not null default 0,
  error_message text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint event_broadcast_run_destinations_provider_check
    check (provider in ('youtube', 'linkedin', 'facebook', 'vimeo', 'custom')),
  constraint event_broadcast_run_destinations_status_check
    check (status in ('starting', 'active', 'stopped', 'complete', 'failed')),
  constraint event_broadcast_run_destinations_fingerprint_length_check
    check (char_length(output_fingerprint) = 64),
  constraint event_broadcast_run_destinations_unique unique (run_id, destination_id)
);

create index if not exists event_broadcast_run_destinations_run_status_idx
  on public.event_broadcast_run_destinations(run_id, status);

create index if not exists event_broadcast_run_destinations_destination_idx
  on public.event_broadcast_run_destinations(destination_id)
  where destination_id is not null;

alter table public.event_broadcast_destinations enable row level security;
alter table public.event_broadcast_runs enable row level security;
alter table public.event_broadcast_run_destinations enable row level security;

revoke all on table public.event_broadcast_destinations from anon, authenticated;
revoke all on table public.event_broadcast_runs from anon, authenticated;
revoke all on table public.event_broadcast_run_destinations from anon, authenticated;

grant select, insert, update, delete on table public.event_broadcast_destinations to service_role;
grant select, insert, update, delete on table public.event_broadcast_runs to service_role;
grant select, insert, update, delete on table public.event_broadcast_run_destinations to service_role;
