alter table public.events
  add column if not exists badge_image_url text null;
