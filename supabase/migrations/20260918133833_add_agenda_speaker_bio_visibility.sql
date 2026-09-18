alter table public.event_agenda_items
  add column if not exists show_speaker_bio boolean not null default true;
