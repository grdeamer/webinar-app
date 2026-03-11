-- Realtime attendee presence
create table if not exists public.attendee_sessions (
  session_id uuid primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  email text not null,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  user_agent text null
);

create index if not exists attendee_sessions_last_seen_idx
  on public.attendee_sessions(last_seen desc);

-- OPTIONAL RLS: keep it locked down (server/admin only)
alter table public.attendee_sessions enable row level security;

-- No public policies by default.
