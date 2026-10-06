-- Only the preview subscription expiry is persisted. Media is never stored here.
alter table public.zoom_bridge_rooms add column if not exists preview_until timestamptz;
