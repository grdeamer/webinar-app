-- Additive Run of Show attendee resources and closing survey controls.
-- Safe to run multiple times. No session or agenda rows are modified.

alter table public.event_agenda_items
  add column if not exists resources jsonb not null default '[]'::jsonb,
  add column if not exists show_resources boolean not null default true;

alter table public.event_live_state
  add column if not exists survey_url text null,
  add column if not exists show_survey boolean not null default false;
