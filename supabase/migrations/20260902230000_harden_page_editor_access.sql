alter table public.event_page_sections enable row level security;
alter table public.page_editor_elements enable row level security;
alter table public.page_editor_sections enable row level security;
alter table public.page_templates enable row level security;

revoke all on table public.event_page_sections from public, anon, authenticated;
revoke all on table public.page_editor_elements from public, anon, authenticated;
revoke all on table public.page_editor_sections from public, anon, authenticated;
revoke all on table public.page_templates from public, anon, authenticated;

grant all on table public.event_page_sections to service_role;
grant all on table public.page_editor_elements to service_role;
grant all on table public.page_editor_sections to service_role;
grant all on table public.page_templates to service_role;

create index if not exists page_editor_comments_author_idx
  on public.page_editor_comments(author_id);

create index if not exists page_editor_comments_resolved_by_idx
  on public.page_editor_comments(resolved_by)
  where resolved_by is not null;

create index if not exists page_editor_presence_user_idx
  on public.page_editor_presence(user_id);
