create index if not exists event_email_campaigns_requested_by_idx
  on public.event_email_campaigns (requested_by);

create index if not exists event_email_messages_event_id_idx
  on public.event_email_messages (event_id);

create index if not exists event_email_messages_registrant_id_idx
  on public.event_email_messages (registrant_id);
