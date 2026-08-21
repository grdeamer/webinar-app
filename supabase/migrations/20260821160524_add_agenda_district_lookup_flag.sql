alter table public.event_agenda_items
  add column if not exists district_lookup_enabled boolean;

-- Preserve the earlier title-based behavior for existing district/breakout items.
update public.event_agenda_items
set district_lookup_enabled = (
  lower(concat_ws(' ', title, icon_key, track, location)) like '%district%'
  or lower(concat_ws(' ', title, icon_key, track, location)) like '%breakout%'
)
where district_lookup_enabled is null;

alter table public.event_agenda_items
  alter column district_lookup_enabled set default false,
  alter column district_lookup_enabled set not null;

comment on column public.event_agenda_items.district_lookup_enabled is
  'Shows the attendee district lookup while this agenda item is live.';
