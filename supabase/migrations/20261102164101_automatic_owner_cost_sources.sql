-- Provider financial snapshots remain accessible only through the confirmed-owner route.
create table public.owner_provider_cost_cache (
  id text primary key check (id in ('vercel', 'supabase')),
  payload jsonb,
  fetched_at timestamptz,
  attempt_day text not null default '1970-01-01' check (attempt_day ~ '^\d{4}-\d{2}-\d{2}$'),
  last_error text
);
alter table public.owner_provider_cost_cache enable row level security;
revoke all on public.owner_provider_cost_cache from public, anon, authenticated;
grant select, update on public.owner_provider_cost_cache to service_role;
insert into public.owner_provider_cost_cache(id) values ('vercel'), ('supabase');
