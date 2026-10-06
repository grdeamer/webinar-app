create table if not exists public.zoom_bridge_source (
  id text primary key check (id = 'program'),
  meeting_id text not null check (meeting_id ~ '^[0-9]{9,11}$'),
  passcode_ciphertext text not null,
  desired_running boolean not null default false,
  revision uuid not null default gen_random_uuid(),
  observed jsonb not null default '{}'::jsonb,
  last_seen timestamptz,
  created_at timestamptz not null default now()
);
alter table public.zoom_bridge_source enable row level security;
revoke all on public.zoom_bridge_source from anon, authenticated;
grant all on public.zoom_bridge_source to service_role;
