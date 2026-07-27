-- Page-scoped Experience Studio elements.
-- Safe to run multiple times and backward-compatible with existing section rows.

alter table public.event_page_sections
  add column if not exists elements jsonb not null default '[]'::jsonb,
  add column if not exists document_revision bigint not null default 0;

create or replace function public.save_event_page_document(
  p_event_id uuid,
  p_page_key text,
  p_sections jsonb,
  p_elements jsonb,
  p_has_elements boolean,
  p_event_theme jsonb,
  p_expected_revision bigint
)
returns table (
  saved_sections jsonb,
  saved_elements jsonb,
  saved_event_theme jsonb,
  saved_revision bigint
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  stored_revision bigint;
  next_revision bigint;
  persisted_sections jsonb;
  persisted_elements jsonb;
  saved_at timestamptz := now();
begin
  select page.document_revision
    into stored_revision
  from public.event_page_sections as page
  where page.event_id = p_event_id
    and page.page_key = p_page_key
  for update;

  if found then
    if stored_revision <> p_expected_revision then
      return;
    end if;

    next_revision := stored_revision + 1;

    update public.event_page_sections
    set
      sections = p_sections,
      elements = case
        when p_has_elements then p_elements
        else event_page_sections.elements
      end,
      document_revision = next_revision,
      updated_at = saved_at
    where event_id = p_event_id
      and page_key = p_page_key
    returning sections, elements
      into persisted_sections, persisted_elements;
  else
    if p_expected_revision <> 0 then
      return;
    end if;

    next_revision := 1;

    begin
      insert into public.event_page_sections (
        event_id,
        page_key,
        sections,
        elements,
        document_revision,
        updated_at
      )
      values (
        p_event_id,
        p_page_key,
        p_sections,
        case when p_has_elements then p_elements else '[]'::jsonb end,
        next_revision,
        saved_at
      )
      returning sections, elements
        into persisted_sections, persisted_elements;
    exception
      when unique_violation then
        return;
    end;
  end if;

  update public.events
  set
    event_theme = p_event_theme,
    updated_at = saved_at
  where id = p_event_id;

  return query
  select
    persisted_sections,
    persisted_elements,
    p_event_theme,
    next_revision;
end;
$$;

revoke all on function public.save_event_page_document(
  uuid,
  text,
  jsonb,
  jsonb,
  boolean,
  jsonb,
  bigint
) from public;

grant execute on function public.save_event_page_document(
  uuid,
  text,
  jsonb,
  jsonb,
  boolean,
  jsonb,
  bigint
) to service_role;
