-- Page-scoped Experience Studio elements.
-- Safe to run multiple times and backward-compatible with existing section rows.

alter table public.event_page_sections
  add column if not exists elements jsonb not null default '[]'::jsonb;
