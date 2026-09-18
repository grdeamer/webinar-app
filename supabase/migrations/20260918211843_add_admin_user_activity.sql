create table if not exists public.admin_user_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  action text not null check (action in ('sign_in', 'view_page')),
  label text not null check (char_length(label) between 1 and 120),
  path text check (path is null or char_length(path) <= 240),
  created_at timestamptz not null default now()
);

create index if not exists admin_user_activity_user_created_idx
  on public.admin_user_activity (user_id, created_at desc);

alter table public.admin_user_activity enable row level security;

revoke all on table public.admin_user_activity from anon, authenticated;

comment on table public.admin_user_activity is
  'Owner-visible, privacy-limited audit events for Jupiter administrative access. Never store form values, content, passwords, IP addresses, or keystrokes.';
