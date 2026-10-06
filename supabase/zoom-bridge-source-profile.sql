alter table public.zoom_bridge_source add column if not exists source_profile jsonb not null default '{}'::jsonb;
alter table public.zoom_bridge_source add constraint zoom_bridge_source_profile_object check (jsonb_typeof(source_profile) = 'object');
