create table if not exists public.jupiter_audit_events (
  id uuid primary key default gen_random_uuid(),
  event_id uuid null references public.events(id) on delete set null,
  actor_id uuid null,
  actor_email text null,
  category text not null,
  action text not null,
  summary text not null,
  target_type text null,
  target_id text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists jupiter_audit_events_created_idx
  on public.jupiter_audit_events (created_at desc);

create index if not exists jupiter_audit_events_event_created_idx
  on public.jupiter_audit_events (event_id, created_at desc)
  where event_id is not null;

create table if not exists public.jupiter_usage_snapshots (
  id uuid primary key default gen_random_uuid(),
  event_id uuid null references public.events(id) on delete cascade,
  scope text not null check (scope in ('platform', 'event')),
  source text not null default 'jupiter-cloud',
  metrics jsonb not null default '{}'::jsonb,
  captured_at timestamptz not null default now()
);

create index if not exists jupiter_usage_snapshots_scope_captured_idx
  on public.jupiter_usage_snapshots (scope, captured_at desc);

create index if not exists jupiter_usage_snapshots_event_captured_idx
  on public.jupiter_usage_snapshots (event_id, captured_at desc)
  where event_id is not null;

alter table public.jupiter_audit_events enable row level security;
alter table public.jupiter_usage_snapshots enable row level security;

revoke all on table public.jupiter_audit_events from anon, authenticated;
revoke all on table public.jupiter_usage_snapshots from anon, authenticated;
