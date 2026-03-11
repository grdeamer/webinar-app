create table if not exists public.event_live_state (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique references public.events(id) on delete cascade,
  mode text not null check (mode in ('lobby','general_session','breakout','replay','off_air')),
  active_breakout_id uuid null references public.event_breakouts(id) on delete set null,
  headline text null,
  message text null,
  force_redirect boolean not null default false,
  updated_by text null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_event_live_state_event_id on public.event_live_state(event_id);
create index if not exists idx_event_live_state_mode on public.event_live_state(mode);
