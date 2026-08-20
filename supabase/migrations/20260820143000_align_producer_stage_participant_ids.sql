-- Preview and Program must use the same representation so TAKE can copy the
-- routed participant list without a jsonb/text[] cast failure.
alter table public.event_live_program_state
  alter column stage_participant_ids drop default;

alter table public.event_live_program_state
  alter column stage_participant_ids type jsonb
  using to_jsonb(coalesce(stage_participant_ids, array[]::text[]));

alter table public.event_live_program_state
  alter column stage_participant_ids set default '[]'::jsonb;

update public.event_live_program_state
set stage_participant_ids = '[]'::jsonb
where stage_participant_ids is null;

alter table public.event_live_program_state
  alter column stage_participant_ids set not null;

