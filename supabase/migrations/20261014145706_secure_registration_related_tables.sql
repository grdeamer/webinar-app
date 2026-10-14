begin;
-- These tables contain attendee activity, assignments, delivery details or private meeting links.
-- Their browser workflows use scoped server APIs, not direct client table access.
alter table public.attendee_activity enable row level security;
alter table public.attendee_sessions enable row level security;
alter table public.event_sessions enable row level security;
alter table public.import_jobs enable row level security;
revoke all on public.attendee_activity,public.attendee_sessions,public.event_sessions,public.import_jobs,public.event_email_campaigns,public.event_email_messages,public.resend_webhook_events,public.event_user_webinars,public.user_webinars from public,anon,authenticated;
grant select,insert,update,delete on public.attendee_activity,public.attendee_sessions,public.event_sessions,public.import_jobs,public.event_email_campaigns,public.event_email_messages,public.resend_webhook_events,public.event_user_webinars,public.user_webinars to service_role;
commit;
