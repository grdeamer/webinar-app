-- Q&A moderation is performed by authenticated server routes. Attendees may
-- only read questions that a moderator has approved for display.
alter table public.qa_messages enable row level security;
alter table public.qa_room_settings enable row level security;

drop policy if exists qa_messages_public_select_general on public.qa_messages;
drop policy if exists qa_select_public_approved on public.qa_messages;

create policy qa_messages_public_read_moderated
on public.qa_messages
for select
to anon, authenticated
using (
  event_id is not null
  and status in ('approved', 'answered')
);

-- Submissions and all state changes go through the validated server APIs.
revoke insert, update, delete on table public.qa_messages from anon, authenticated;
revoke insert, update, delete on table public.qa_room_settings from anon, authenticated;

create index if not exists qa_messages_event_room_status_created_idx
on public.qa_messages (event_id, room_key, status, created_at desc);

create index if not exists qa_messages_event_room_featured_idx
on public.qa_messages (event_id, room_key, is_featured, featured_at desc)
where is_featured = true;
