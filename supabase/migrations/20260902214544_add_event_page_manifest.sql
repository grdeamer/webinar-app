create table if not exists public.event_page_manifest (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  page_key text not null,
  title text not null,
  position integer not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published')),
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, page_key),
  check (page_key ~ '^[a-z0-9][a-z0-9_-]{0,63}$')
);

create index if not exists event_page_manifest_event_position_idx
  on public.event_page_manifest(event_id, position, created_at);

insert into public.event_page_manifest (event_id, page_key, title, position, is_system)
select
  event_id,
  page_key,
  initcap(replace(page_key, '_', ' ')),
  (row_number() over (partition by event_id order by case page_key
    when 'event_home' then 0 when 'agenda' then 1 when 'breakouts' then 2
    when 'lobby' then 3 when 'on_demand' then 4 else 50 end) - 1)::integer,
  page_key in ('event_home', 'agenda', 'breakouts', 'lobby', 'on_demand')
from public.event_page_sections
on conflict (event_id, page_key) do nothing;

insert into public.event_page_manifest (event_id, page_key, title, position, is_system)
select events.id, defaults.page_key, defaults.title, defaults.position, true
from public.events
cross join (values
  ('event_home', 'Home', 0),
  ('agenda', 'Agenda', 1),
  ('breakouts', 'Districts', 2),
  ('lobby', 'Lobby', 3),
  ('on_demand', 'Resources', 4),
  ('sessions', 'Sessions', 5),
  ('sponsors', 'Sponsors', 6),
  ('chat', 'Engage', 7),
  ('networking', 'Networking', 8)
) as defaults(page_key, title, position)
on conflict (event_id, page_key) do nothing;

create or replace function public.page_editor_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists event_page_manifest_set_updated_at on public.event_page_manifest;
create trigger event_page_manifest_set_updated_at
before update on public.event_page_manifest
for each row execute function public.page_editor_set_updated_at();

alter table public.event_page_manifest enable row level security;
revoke all on table public.event_page_manifest from anon, authenticated;

create or replace function public.page_editor_replace_manifest_order(p_event_id uuid, p_pages jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  requested_count integer;
  existing_count integer;
begin
  if jsonb_typeof(p_pages) <> 'array' then
    raise exception 'pages must be an array';
  end if;

  requested_count := jsonb_array_length(p_pages);
  if requested_count < 1 or requested_count > 100 then
    raise exception 'pages must contain between 1 and 100 entries';
  end if;

  select count(*) into existing_count from public.event_page_manifest where event_id = p_event_id;
  if requested_count <> existing_count then
    raise exception 'page manifest changed; refresh before reordering';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_pages) item
    where coalesce(item->>'pageKey', '') !~ '^[a-z0-9][a-z0-9_-]{0,63}$'
      or nullif(btrim(item->>'title'), '') is null
  ) or (
    select count(distinct item->>'pageKey') from jsonb_array_elements(p_pages) item
  ) <> requested_count then
    raise exception 'invalid or duplicate page entry';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_pages) item
    left join public.event_page_manifest manifest
      on manifest.event_id = p_event_id and manifest.page_key = item->>'pageKey'
    where manifest.id is null
  ) then
    raise exception 'page manifest changed; refresh before reordering';
  end if;

  update public.event_page_manifest manifest
  set title = left(btrim(item.value->>'title'), 80),
      position = (item.ordinality - 1)::integer
  from jsonb_array_elements(p_pages) with ordinality item(value, ordinality)
  where manifest.event_id = p_event_id
    and manifest.page_key = item.value->>'pageKey';
end;
$$;

create or replace function public.page_editor_delete_page(p_event_id uuid, p_page_key text)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if exists (
    select 1 from public.event_page_manifest
    where event_id = p_event_id and page_key = p_page_key and is_system
  ) then
    raise exception 'system pages cannot be deleted';
  end if;

  delete from public.event_page_sections where event_id = p_event_id and page_key = p_page_key;
  delete from public.event_page_manifest where event_id = p_event_id and page_key = p_page_key;
end;
$$;

revoke all on function public.page_editor_replace_manifest_order(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.page_editor_delete_page(uuid, text) from public, anon, authenticated;
grant execute on function public.page_editor_replace_manifest_order(uuid, jsonb) to service_role;
grant execute on function public.page_editor_delete_page(uuid, text) to service_role;
