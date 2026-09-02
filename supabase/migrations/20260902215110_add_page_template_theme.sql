alter table public.page_templates
  add column if not exists event_theme jsonb not null default '{}'::jsonb;
