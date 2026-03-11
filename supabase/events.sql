-- Event Platform tables
-- Safe to run multiple times.

create extension if not exists "pgcrypto";

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text null,
  start_at timestamptz null,
  end_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_agenda_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  start_at timestamptz null,
  end_at timestamptz null,
  title text not null,
  description text null,
  location text null,
  track text null,
  speaker text null,
  sort_index int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.event_breakouts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  title text not null,
  description text null,
  join_link text null,
  start_at timestamptz null,
  end_at timestamptz null,
  created_at timestamptz not null default now()
);

create table if not exists public.event_sponsors (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  description text null,
  logo_url text null,
  website_url text null,
  tier text null,
  sort_index int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.event_library_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  kind text not null default 'link',
  title text not null,
  description text null,
  url text null,
  storage_path text null,
  sort_index int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.event_chat_messages (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  room_key text not null default 'general',
  session_id text null,
  name text null,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.event_networking_profiles (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  session_id text not null,
  name text not null,
  title text null,
  company text null,
  bio text null,
  interests text null,
  created_at timestamptz not null default now(),
  unique(event_id, session_id)
);

create table if not exists public.event_attendees (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(event_id, user_id)
);

alter table public.events enable row level security;
alter table public.event_agenda_items enable row level security;
alter table public.event_breakouts enable row level security;
alter table public.event_sponsors enable row level security;
alter table public.event_library_items enable row level security;
alter table public.event_chat_messages enable row level security;
alter table public.event_networking_profiles enable row level security;
alter table public.event_attendees enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='events' and policyname='events_select_public') then
    create policy events_select_public on public.events for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='event_agenda_items' and policyname='agenda_select_public') then
    create policy agenda_select_public on public.event_agenda_items for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='event_breakouts' and policyname='breakouts_select_public') then
    create policy breakouts_select_public on public.event_breakouts for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='event_sponsors' and policyname='sponsors_select_public') then
    create policy sponsors_select_public on public.event_sponsors for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='event_library_items' and policyname='library_select_public') then
    create policy library_select_public on public.event_library_items for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='event_chat_messages' and policyname='chat_select_public') then
    create policy chat_select_public on public.event_chat_messages for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='event_networking_profiles' and policyname='networking_select_public') then
    create policy networking_select_public on public.event_networking_profiles for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='event_chat_messages' and policyname='chat_insert_public') then
    create policy chat_insert_public on public.event_chat_messages for insert to anon, authenticated with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='event_networking_profiles' and policyname='networking_upsert_public') then
    create policy networking_upsert_public on public.event_networking_profiles for insert to anon, authenticated with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='event_attendees' and policyname='event_attendees_select_public') then
    create policy event_attendees_select_public on public.event_attendees for select to anon, authenticated using (true);
  end if;
end$$;

create index if not exists idx_event_chat_event_created on public.event_chat_messages(event_id, created_at desc);
create index if not exists idx_agenda_event_start on public.event_agenda_items(event_id, start_at, sort_index);

create table if not exists public.event_user_webinars (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  webinar_id uuid not null references public.webinars(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(event_id, user_id, webinar_id)
);

alter table public.event_user_webinars enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='event_user_webinars' and policyname='event_user_webinars_select_public'
  ) then
    create policy event_user_webinars_select_public on public.event_user_webinars for select to anon, authenticated using (true);
  end if;
end$$;


alter table public.webinars add column if not exists thumbnail_url text null;
alter table public.webinars add column if not exists playback_type text null;
alter table public.webinars add column if not exists playback_mp4_url text null;
alter table public.webinars add column if not exists playback_m3u8_url text null;

alter table public.webinars add column if not exists speaker_cards jsonb null;

alter table public.event_breakouts add column if not exists speaker_name text null;
alter table public.event_breakouts add column if not exists speaker_avatar_url text null;
alter table public.event_breakouts add column if not exists manual_live boolean not null default false;
alter table public.event_breakouts add column if not exists auto_open boolean not null default false;
