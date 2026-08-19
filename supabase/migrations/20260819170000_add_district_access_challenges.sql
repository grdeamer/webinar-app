create table if not exists public.event_district_access_challenges (
  id uuid primary key,
  event_id uuid not null references public.events(id) on delete cascade,
  registrant_id uuid references public.event_registrants(id) on delete cascade,
  session_id uuid references public.event_sessions(id) on delete cascade,
  email_hash text not null,
  ip_hash text not null,
  code_digest text not null,
  attempts smallint not null default 0,
  max_attempts smallint not null default 5,
  delivery_status text not null default 'pending',
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint event_district_access_attempts_check check (attempts >= 0 and attempts <= max_attempts),
  constraint event_district_access_delivery_check check (delivery_status in ('pending', 'sent', 'failed', 'suppressed'))
);

alter table public.event_district_access_challenges enable row level security;

revoke all on table public.event_district_access_challenges from anon, authenticated;

create index if not exists event_district_access_event_email_created_idx
  on public.event_district_access_challenges (event_id, email_hash, created_at desc);

create index if not exists event_district_access_event_ip_created_idx
  on public.event_district_access_challenges (event_id, ip_hash, created_at desc);

create index if not exists event_district_access_expires_idx
  on public.event_district_access_challenges (expires_at)
  where consumed_at is null;

