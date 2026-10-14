begin;
alter table public.users enable row level security;
alter table public.event_attendees enable row level security;
alter table public.event_registrants enable row level security;
alter table public.event_registrant_sessions enable row level security;
revoke all on public.users, public.event_attendees, public.event_registrants, public.event_registrant_sessions from public, anon, authenticated;
grant select,insert,update,delete on public.users, public.event_attendees, public.event_registrants, public.event_registrant_sessions to service_role;
commit;
