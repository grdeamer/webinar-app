-- Filtered billing metadata only; this cache remains inaccessible to browser roles.
alter table public.owner_provider_cost_cache add column last_diagnostic jsonb;
comment on column public.owner_provider_cost_cache.last_diagnostic is 'Server-only filtered provider error and price configuration metadata; never credentials or raw API bodies.';
