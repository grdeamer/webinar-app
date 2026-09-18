create table if not exists public.password_reset_requests (
  id uuid primary key default gen_random_uuid(),
  email_hash text not null,
  ip_hash text not null,
  delivery_status text not null default 'pending',
  resend_email_id text,
  created_at timestamptz not null default now(),
  constraint password_reset_delivery_status_check
    check (delivery_status in ('pending', 'sent', 'failed', 'suppressed'))
);

alter table public.password_reset_requests enable row level security;

revoke all on table public.password_reset_requests from anon, authenticated;

create index if not exists password_reset_requests_email_created_idx
  on public.password_reset_requests (email_hash, created_at desc);

create index if not exists password_reset_requests_ip_created_idx
  on public.password_reset_requests (ip_hash, created_at desc);
