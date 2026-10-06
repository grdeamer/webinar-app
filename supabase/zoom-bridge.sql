create table if not exists public.zoom_bridge_rooms (
 id uuid primary key default gen_random_uuid(),
 worker_name text not null check (length(worker_name) between 1 and 64),
 meeting_id text not null check (meeting_id ~ '^[0-9]{9,11}$'),
 passcode_ciphertext text not null,
 desired_running boolean not null default false,
 desired_camera boolean not null default false,
 desired_microphone boolean not null default false,
 revision uuid not null default gen_random_uuid(),
 observed jsonb not null default '{}'::jsonb,
 last_seen timestamptz,
 created_at timestamptz not null default now()
);
alter table public.zoom_bridge_rooms enable row level security;
revoke all on public.zoom_bridge_rooms from anon, authenticated;
grant all on public.zoom_bridge_rooms to service_role;
