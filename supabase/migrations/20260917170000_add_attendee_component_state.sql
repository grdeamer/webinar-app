alter table public.event_live_state
  add column if not exists attendee_component_state jsonb not null
  default '{"countdown":true,"next_up":true,"agenda":true,"countdown_mode":"next_session"}'::jsonb;

comment on column public.event_live_state.attendee_component_state is
  'Live Run of Show visibility and behavior overrides for reusable attendee page components.';
