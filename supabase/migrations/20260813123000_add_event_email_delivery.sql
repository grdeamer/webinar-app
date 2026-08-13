create table if not exists public.event_email_campaigns (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  campaign_type text not null check (campaign_type in ('confirmation', 'presenter_access')),
  mode text not null check (mode in ('test', 'production')),
  status text not null default 'sending' check (status in ('sending', 'completed', 'partial', 'failed')),
  requested_by uuid references auth.users(id) on delete set null,
  idempotency_key text not null unique,
  recipient_count integer not null default 0,
  accepted_count integer not null default 0,
  failed_count integer not null default 0,
  error_summary text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists event_email_campaigns_event_created_idx
  on public.event_email_campaigns(event_id, created_at desc);

create table if not exists public.event_email_messages (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.event_email_campaigns(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  registrant_id uuid references public.event_registrants(id) on delete set null,
  recipient_email text not null,
  resend_email_id text unique,
  status text not null default 'accepted',
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists event_email_messages_campaign_idx
  on public.event_email_messages(campaign_id);

create index if not exists event_email_messages_resend_idx
  on public.event_email_messages(resend_email_id)
  where resend_email_id is not null;

create table if not exists public.resend_webhook_events (
  svix_id text primary key,
  event_type text not null,
  resend_email_id text,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

alter table public.event_email_campaigns enable row level security;
alter table public.event_email_messages enable row level security;
alter table public.resend_webhook_events enable row level security;

