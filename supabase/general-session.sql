-- General Session: settings + control room + presence + kick
-- Run in Supabase SQL Editor (public schema)

-- 1) Settings (one row keyed by id=1)
create table if not exists public.general_session_settings (
  id integer primary key default 1,
  title text null,
  source_type text not null default 'mp4', -- mp4 | m3u8 | rtmp
  mp4_path text null,
  m3u8_url text null,
  rtmp_url text null,
  poster_url text null,
  is_published boolean not null default false,

  publish_state text null, -- draft | published | scheduled
  publish_at timestamptz null,

  presenter_key text null,

  updated_at timestamptz not null default now()
);

-- Ensure the singleton row exists (optional)
insert into public.general_session_settings (id)
values (1)
on conflict (id) do nothing;

create index if not exists general_session_settings_updated_idx
  on public.general_session_settings(updated_at desc);

-- 2) Control Room gate (starting soon / live / paused / ended)
create table if not exists public.general_session_control (
  id integer primary key default 1,
  state text not null default 'holding', -- holding | live | paused | ended
  message text null,
  updated_at timestamptz not null default now()
);

insert into public.general_session_control (id)
values (1)
on conflict (id) do nothing;

create index if not exists general_session_control_updated_idx
  on public.general_session_control(updated_at desc);

-- 2b) Program (what attendees see) + lower thirds
create table if not exists public.general_session_program (
  id integer primary key default 1,

  -- Program output
  program_kind text not null default 'video', -- video | slides
  program_source_type text null, -- mp4 | m3u8 | rtmp (when program_kind=video)
  program_mp4_path text null,
  program_m3u8_url text null,
  program_rtmp_url text null,
  program_slide_path text null,
  program_slide_id uuid null,

  -- Lower third (overlay)
  lower_third_active boolean not null default false,
  lower_third_name text null,
  lower_third_title text null,

  updated_at timestamptz not null default now()
);

insert into public.general_session_program (id)
values (1)
on conflict (id) do nothing;

create index if not exists general_session_program_updated_idx
  on public.general_session_program(updated_at desc);

-- 2c) Slides library (admin uploads)
create table if not exists public.general_session_slides (
  id uuid primary key,
  name text not null,
  slide_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists general_session_slides_created_idx
  on public.general_session_slides(created_at desc);

-- 3) Presence (heartbeats)
create table if not exists public.general_session_presence (
  room_key text not null default 'general',
  session_id uuid not null,
  user_id uuid null,
  user_email text null,
  last_seen_at timestamptz not null default now(),
  primary key (room_key, session_id)
);

create index if not exists general_session_presence_room_last_seen_idx
  on public.general_session_presence(room_key, last_seen_at desc);

-- 4) Kicks (soft-remove)
create table if not exists public.general_session_kicks (
  id bigserial primary key,
  room_key text not null default 'general',
  session_id uuid not null,
  reason text null,
  kicked_at timestamptz not null default now()
);

create index if not exists general_session_kicks_room_time_idx
  on public.general_session_kicks(room_key, kicked_at desc);

create index if not exists general_session_kicks_room_session_idx
  on public.general_session_kicks(room_key, session_id);

-- -----------------------------
-- Realtime/RLS notes
-- -----------------------------
-- If you rely on realtime subscriptions (the UI does), you'll typically want realtime enabled for:
--  - general_session_control
--  - general_session_presence
--  - general_session_kicks
--
-- Recommended: keep RLS enabled and do NOT add public write policies.
-- The app's server routes use the Service Role key for writes.
--
-- Enable RLS (optional hardening):
alter table public.general_session_settings enable row level security;
alter table public.general_session_control enable row level security;
alter table public.general_session_presence enable row level security;
alter table public.general_session_kicks enable row level security;
alter table public.general_session_program enable row level security;
alter table public.general_session_slides enable row level security;

-- Public read policies (optional):
-- Attendees should be able to read control row (so overlays update in real time).
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='general_session_control' and policyname='general_session_control_select_public'
  ) then
    create policy general_session_control_select_public
      on public.general_session_control
      for select
      to anon, authenticated
      using (true);
  end if;
end$$;

-- 11) Schema upgrades (safe to run multiple times)
-- Track current slide by id for "Next/Prev" controls
alter table public.general_session_program
  add column if not exists program_slide_id uuid null;

-- Allow admin to control materials viewer height
alter table public.general_session_lower_panel
  add column if not exists height_px integer not null default 520;

-- Attendees need program row to switch in real-time.
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='general_session_program' and policyname='general_session_program_select_public'
  ) then
    create policy general_session_program_select_public
      on public.general_session_program
      for select
      to anon, authenticated
      using (true);
  end if;
end$$;

-- Slides list should be admin-only (no public select policy by default).

-- Presence and kicks are not sensitive; if you want realtime UI to work without Service Role in client,
-- allow select for anon/auth:
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='general_session_presence' and policyname='general_session_presence_select_public'
  ) then
    create policy general_session_presence_select_public
      on public.general_session_presence
      for select
      to anon, authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='general_session_kicks' and policyname='general_session_kicks_select_public'
  ) then
    create policy general_session_kicks_select_public
      on public.general_session_kicks
      for select
      to anon, authenticated
      using (true);
  end if;
end$$;

-- NOTE: Do NOT add insert/update/delete policies for anon/auth. Writes should be via server routes only.

-- 6) Multiview switcher state (slot assignments)
create table if not exists public.general_session_multiview (
  id integer primary key default 1,
  slots jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.general_session_multiview (id)
values (1)
on conflict (id) do nothing;

-- 7) Program/Preview switching fields
alter table public.general_session_program
  add column if not exists program_slot integer null;

alter table public.general_session_program
  add column if not exists preview_slot integer null;

alter table public.general_session_program
  add column if not exists transition_kind text null; -- cut | auto

alter table public.general_session_program
  add column if not exists transition_ms integer not null default 350;

alter table public.general_session_program
  add column if not exists transition_started_at timestamptz null;

-- RLS for multiview (admin writes only via server; public read not required)
alter table public.general_session_multiview enable row level security;

-- Optional: allow authenticated users to read multiview (admin UI may use anon key though).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='general_session_multiview'
      and policyname='general_session_multiview_select_authed'
  ) then
    create policy general_session_multiview_select_authed
      on public.general_session_multiview
      for select
      to anon, authenticated
      using (true);
  end if;
end$$;


-- 9) Theme (General Session only)
create table if not exists public.general_session_theme (
  id integer primary key default 1,
  bg_color text null,
  text_color text null,
  font_family text null,
  updated_at timestamptz not null default now()
);

insert into public.general_session_theme (id)
values (1)
on conflict (id) do nothing;

alter table public.general_session_theme enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='general_session_theme'
      and policyname='general_session_theme_select_public'
  ) then
    create policy general_session_theme_select_public
      on public.general_session_theme
      for select
      to anon, authenticated
      using (true);
  end if;
end$$;


-- 10) Under-player panel (PDF/Image shown under the player)
create table if not exists public.general_session_lower_panel (
  id integer primary key default 1,
  kind text null, -- pdf | image
  name text null,
  path text null,
  updated_at timestamptz not null default now()
);

insert into public.general_session_lower_panel (id)
values (1)
on conflict (id) do nothing;

alter table public.general_session_lower_panel enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='general_session_lower_panel'
      and policyname='general_session_lower_panel_select_public'
  ) then
    create policy general_session_lower_panel_select_public
      on public.general_session_lower_panel
      for select
      to anon, authenticated
      using (true);
  end if;
end$$;
