-- Preserve camera behavior on existing profiles; use screen share for new ones.
alter table public.zoom_bridge_rooms add column if not exists publish_mode text not null default 'camera' check (publish_mode in ('camera','share'));
alter table public.zoom_bridge_rooms alter column publish_mode set default 'share';
alter table public.zoom_bridge_source add column if not exists source_kind text not null default 'srt' check (source_kind in ('srt','zoom'));
