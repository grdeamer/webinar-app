-- Financial data is server-only. The route additionally verifies the exact confirmed owner email.
create table public.owner_cost_cache (
  key text primary key check (key = 'aws-account'),
  payload jsonb,
  fetched_at timestamptz,
  attempt_day text not null default '1970-01-01' check (attempt_day ~ '^\d{4}-\d{2}-\d{2}$'),
  last_error text
);
alter table public.owner_cost_cache enable row level security;
revoke all on public.owner_cost_cache from public, anon, authenticated;
grant select, update on public.owner_cost_cache to service_role;
insert into public.owner_cost_cache(key) values ('aws-account');
comment on table public.owner_cost_cache is 'Server-only AWS billing cache and atomic daily paid-request reservation. No browser role access.';
