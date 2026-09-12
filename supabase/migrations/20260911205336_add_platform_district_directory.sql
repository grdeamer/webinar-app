-- Districts are specialized event sessions. The directory is opt-in per event
-- because enabling it reveals each configured district destination to signed-in
-- attendees on the event's Districts page.
alter table public.events
  add column if not exists district_directory_enabled boolean not null default false;

alter table public.event_sessions
  add column if not exists district_parent_id uuid null
  references public.event_sessions(id) on delete set null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'event_sessions_district_parent_not_self'
  ) then
    alter table public.event_sessions
      add constraint event_sessions_district_parent_not_self
      check (district_parent_id is null or district_parent_id <> id);
  end if;
end $$;

create index if not exists event_sessions_event_district_parent_idx
  on public.event_sessions(event_id, district_parent_id, sort_order)
  where session_kind in ('district_zone', 'district_region', 'district', 'breakout');

-- A plain index also supports the self-referencing foreign key when a parent
-- node is updated or removed.
create index if not exists event_sessions_district_parent_id_idx
  on public.event_sessions(district_parent_id);

comment on column public.events.district_directory_enabled is
  'Shows the signed-in attendee Districts page as a clickable hierarchy with destination links.';

comment on column public.event_sessions.district_parent_id is
  'Parent in the Zone → Region → District directory. Only leaf District nodes are roster-assignable sessions.';

-- Load the supplied CAPLYTA hierarchy into the matching event. This is safe to
-- rerun because every node is matched by event, node kind, parent, and title.
do $$
declare
  target_event_id uuid;
  zone_record record;
  region_record record;
  district_name text;
  zone_id uuid;
  region_id uuid;
  zone_index integer := 0;
  region_index integer := 0;
  district_index integer := 0;
  hierarchy jsonb := '[
    {"name":"East","regions":[
      {"name":"Carolinas","districts":["Asheville","Charlotte","Northern GA","Raleigh","South Atlantic","Southern GA","Winston-Salem"]},
      {"name":"Central","districts":["Eastern Kentucky","Evansville","Indianapolis","Knoxville","Lexington","Louisville","Nashville","Southern Kentucky"]},
      {"name":"Mid-Atlantic","districts":["Baltimore","Brooklyn","Capitol","Long Island","Manhattan","North Jersey","Philadelphia","South Jersey"]},
      {"name":"Northeast","districts":["Boston","Buffalo","Central CT","Hartford","Hudson Valley","Maine","Providence","Stamford","Upstate NY"]},
      {"name":"PA Virginia","districts":["Arlington","Chesapeake","Cleveland","Lancaster","Ohio Valley","Pittsburgh East","Pittsburgh West","Scranton","Virginias"]},
      {"name":"Southeast","districts":["Eastern Florida","Gulf Coast","North Alabama","Northern Florida","Orlando","Panhandle","Southern Florida","Western Florida"]}
    ]},
    {"name":"West","regions":[
      {"name":"Delta","districts":["Arkansas","Kansas City","Mississippi","Missouri","New Orleans","Saint Louis","West Louisiana","Western TN"]},
      {"name":"Great Lakes","districts":["Ann Arbor","Central Michigan","Central Ohio","Detroit","Green Bay","Indiana North","Western Ohio"]},
      {"name":"North Central","districts":["Chicago North","Chicago South","Des Moines","Great Plains","Milwaukee","Minnesota","Omaha","Springfield"]},
      {"name":"Northwest","districts":["Denver","Kansas","North California","Northern Rockies","Pacific NW","Portland","Salt Lake City","Seattle"]},
      {"name":"Texas","districts":["Dallas","Fort Worth","Houston North","Houston South","Oklahoma","South Texas","West Texas"]},
      {"name":"West Coast","districts":["Central California","Las Vegas","Los Angeles North","Los Angeles South","Phoenix","Sacramento","San Diego","San Francisco","South California"]}
    ]}
  ]'::jsonb;
begin
  select id into target_event_id from public.events where slug = 'caplyta-september-poa-meeting' limit 1;
  if target_event_id is null then return; end if;

  update public.events set district_directory_enabled = true where id = target_event_id;

  for zone_record in select value from jsonb_array_elements(hierarchy)
  loop
    zone_index := zone_index + 1;
    select id into zone_id from public.event_sessions
      where event_id = target_event_id and session_kind = 'district_zone'
        and district_parent_id is null and title = zone_record.value->>'name' limit 1;
    if zone_id is null then
      insert into public.event_sessions(event_id,code,title,session_kind,visibility_mode,delivery_mode,sort_order)
      values(target_event_id,'ZONE-' || lpad(zone_index::text,2,'0'),zone_record.value->>'name','district_zone','hidden','directory',zone_index)
      returning id into zone_id;
    end if;

    region_index := 0;
    for region_record in select value from jsonb_array_elements(zone_record.value->'regions')
    loop
      region_index := region_index + 1;
      select id into region_id from public.event_sessions
        where event_id = target_event_id and session_kind = 'district_region'
          and district_parent_id = zone_id and title = region_record.value->>'name' limit 1;
      if region_id is null then
        insert into public.event_sessions(event_id,code,title,session_kind,district_parent_id,visibility_mode,delivery_mode,sort_order)
        values(target_event_id,'REG-' || lpad(zone_index::text,2,'0') || '-' || lpad(region_index::text,2,'0'),region_record.value->>'name','district_region',zone_id,'hidden','directory',region_index)
        returning id into region_id;
      end if;

      for district_name in select jsonb_array_elements_text(region_record.value->'districts')
      loop
        district_index := district_index + 1;
        if not exists (
          select 1 from public.event_sessions where event_id = target_event_id
            and session_kind in ('district','breakout') and district_parent_id = region_id and title = district_name
        ) then
          insert into public.event_sessions(event_id,code,title,session_kind,district_parent_id,visibility_mode,delivery_mode,sort_order)
          values(target_event_id,'DIST-' || lpad(district_index::text,3,'0'),district_name,'district',region_id,'assigned','external',district_index);
        end if;
      end loop;
    end loop;
  end loop;
end $$;
