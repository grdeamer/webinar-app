create table if not exists public.page_editor_comments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  page_key text not null,
  element_id text,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists page_editor_comments_page_idx on public.page_editor_comments(event_id, page_key, created_at desc);

drop trigger if exists page_editor_comments_set_updated_at on public.page_editor_comments;
create trigger page_editor_comments_set_updated_at
before update on public.page_editor_comments
for each row execute function public.page_editor_set_updated_at();

create table if not exists public.page_editor_presence (
  event_id uuid not null references public.events(id) on delete cascade,
  page_key text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  color text not null default '#8b5cf6',
  cursor_x double precision,
  cursor_y double precision,
  selected_element_id text,
  last_seen_at timestamptz not null default now(),
  primary key (event_id, page_key, user_id)
);

create index if not exists page_editor_presence_live_idx on public.page_editor_presence(event_id, page_key, last_seen_at desc);

alter table public.page_editor_comments enable row level security;
alter table public.page_editor_presence enable row level security;
revoke all on table public.page_editor_comments from anon, authenticated;
revoke all on table public.page_editor_presence from anon, authenticated;
