-- Additive satellite output settings. Existing profiles retain their prior behavior.
alter table public.zoom_bridge_rooms
  add column if not exists video_quality text not null default 'auto' check (video_quality in ('auto','720p','1080p')),
  add column if not exists aspect_ratio text not null default 'original' check (aspect_ratio in ('original','16:9','4:3'));
