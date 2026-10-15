begin;

-- Live control state is accessed through server routes that authorize the
-- event operator or attendee. Browser clients must not bypass those routes.
-- No client policies are intentional: service_role bypasses RLS, and access
-- for operators/attendees is checked by the application before each query.
alter table public.event_live_participants enable row level security;
alter table public.event_live_program_state enable row level security;
alter table public.event_live_rooms enable row level security;
alter table public.event_live_scenes enable row level security;
alter table public.event_live_stage_state enable row level security;
alter table public.event_live_state enable row level security;
alter table public.session_stage_state enable row level security;

revoke all on table
  public.event_live_participants,
  public.event_live_program_state,
  public.event_live_rooms,
  public.event_live_scenes,
  public.event_live_stage_state,
  public.event_live_state,
  public.session_stage_state
from public, anon, authenticated;

grant select, insert, update, delete on table
  public.event_live_participants,
  public.event_live_program_state,
  public.event_live_rooms,
  public.event_live_scenes,
  public.event_live_stage_state,
  public.event_live_state,
  public.session_stage_state
to service_role;

commit;
