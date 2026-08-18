alter table public.events
  add column if not exists accent_color text;

with ranked_events as (
  select id, row_number() over (order by created_at, id) - 1 as color_index
  from public.events
  where accent_color is null
)
update public.events as events
set accent_color = case ranked_events.color_index % 6
  when 0 then 'blue'
  when 1 then 'violet'
  when 2 then 'cyan'
  when 3 then 'orange'
  when 4 then 'emerald'
  else 'rose'
end
from ranked_events
where events.id = ranked_events.id;

alter table public.events
  alter column accent_color set default 'blue',
  alter column accent_color set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'events_accent_color_check'
  ) then
    alter table public.events
      add constraint events_accent_color_check
      check (accent_color in ('blue', 'violet', 'cyan', 'orange', 'emerald', 'rose'));
  end if;
end $$;
