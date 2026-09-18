drop index if exists public.admin_user_activity_event_idx;

create index if not exists admin_user_activity_event_id_idx
  on public.admin_user_activity (event_id);
