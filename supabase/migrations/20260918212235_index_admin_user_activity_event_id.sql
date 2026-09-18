create index if not exists admin_user_activity_event_idx
  on public.admin_user_activity (event_id)
  where event_id is not null;
