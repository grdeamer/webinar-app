-- Store only approximate, IP-derived location context for operator Q&A tools.
-- Exact IP addresses and browser GPS coordinates are never persisted.
alter table public.qa_messages
  add column if not exists origin_region text,
  add column if not exists origin_country text,
  add column if not exists origin_city text,
  add column if not exists origin_lat double precision,
  add column if not exists origin_lng double precision,
  add column if not exists origin_source text;

alter table public.qa_messages
  drop constraint if exists qa_messages_origin_lat_check,
  add constraint qa_messages_origin_lat_check
    check (origin_lat is null or origin_lat between -90 and 90),
  drop constraint if exists qa_messages_origin_lng_check,
  add constraint qa_messages_origin_lng_check
    check (origin_lng is null or origin_lng between -180 and 180);

create index if not exists qa_messages_event_origin_created_idx
  on public.qa_messages (event_id, created_at desc)
  where origin_lat is not null and origin_lng is not null;

comment on column public.qa_messages.origin_source is
  'Approximate location source; currently Vercel public-IP geolocation. No raw IP or browser GPS is stored.';
