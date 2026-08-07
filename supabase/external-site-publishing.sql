create table if not exists public.event_publish_destinations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  protocol text not null default 'ftps' check (protocol in ('ftp', 'ftps')),
  host text not null,
  port integer not null default 21 check (port between 1 and 65535),
  username text not null,
  password_ciphertext text not null,
  password_iv text not null,
  password_tag text not null,
  remote_path text not null,
  public_url text,
  last_tested_at timestamptz,
  last_published_at timestamptz,
  last_status text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(event_id, name)
);

create table if not exists public.event_publish_deployments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  destination_id uuid not null references public.event_publish_destinations(id) on delete cascade,
  status text not null check (status in ('publishing', 'published', 'failed', 'rolled_back')),
  files jsonb not null default '[]'::jsonb,
  backup_path text,
  error text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists event_publish_destinations_event_idx
  on public.event_publish_destinations(event_id);
create index if not exists event_publish_deployments_destination_idx
  on public.event_publish_deployments(destination_id, created_at desc);

alter table public.event_publish_destinations enable row level security;
alter table public.event_publish_deployments enable row level security;

revoke all on public.event_publish_destinations from anon, authenticated;
revoke all on public.event_publish_deployments from anon, authenticated;
grant all on public.event_publish_destinations to service_role;
grant all on public.event_publish_deployments to service_role;
