alter table public.event_agenda_items
  add column if not exists speakers jsonb not null default '[]'::jsonb;

comment on column public.event_agenda_items.speakers is
  'Ordered agenda speaker profiles with id, name, title, bio, and photo_url fields.';

update public.event_agenda_items
set speakers = jsonb_build_array(
  jsonb_build_object(
    'id', 'legacy-' || id::text,
    'name', speaker,
    'title', speaker_title,
    'bio', speaker_bio,
    'photo_url', speaker_photo_url
  )
)
where jsonb_array_length(speakers) = 0
  and nullif(btrim(speaker), '') is not null;
