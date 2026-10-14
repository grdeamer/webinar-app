begin;
alter table public.event_registrants add column if not exists registration_status text not null default 'registered' check (registration_status in ('registered','approved','pending_approval','waitlisted','cancelled','declined','checked_in'));
alter table public.event_registrants add column if not exists registration_answers jsonb not null default '{}'::jsonb;
alter table public.event_registrants add column if not exists email_verified_at timestamptz;
create unique index if not exists registrants_event_email_normalized on public.event_registrants(event_id,lower(email));
create table public.event_registration_settings (
 event_id uuid primary key references public.events(id) on delete cascade,
 config jsonb not null, updated_at timestamptz not null default now()
);
create table public.event_registration_challenges (
 id uuid primary key, event_id uuid references public.events(id) on delete cascade,
 email text not null, purpose text not null check(purpose in ('login','register')),
 code_digest text not null, ip_digest text not null, payload jsonb not null default '{}',
 attempts integer not null default 0, consumed_at timestamptz,
 created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '10 minutes'
);
create index on public.event_registration_challenges(email,created_at);
create index on public.event_registration_challenges(ip_digest,created_at);
alter table public.event_registration_settings enable row level security;
alter table public.event_registration_challenges enable row level security;
revoke all on public.event_registration_settings, public.event_registration_challenges from public, anon, authenticated;
grant select,insert,update,delete on public.event_registration_settings, public.event_registration_challenges to service_role;
-- Functions are server-only and run with the invoking service role, never as a definer.
create or replace function public.issue_registration_challenge(p_id uuid,p_event_id uuid,p_email text,p_purpose text,p_digest text,p_ip_digest text,p_payload jsonb) returns boolean
language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 perform pg_advisory_xact_lock(hashtextextended('otp:email:'||lower(p_email),0));
 perform pg_advisory_xact_lock(hashtextextended('otp:ip:'||p_ip_digest,0));
 if (select count(*) from event_registration_challenges where email=lower(p_email) and created_at>now()-interval '10 minutes')>=3
 or (select count(*) from event_registration_challenges where ip_digest=p_ip_digest and created_at>now()-interval '10 minutes')>=20 then return false; end if;
 -- Old expired challenges carry no useful registration payload.
 delete from event_registration_challenges where expires_at<now()-interval '1 day';
 insert into event_registration_challenges(id,event_id,email,purpose,code_digest,ip_digest,payload) values(p_id,p_event_id,lower(p_email),p_purpose,p_digest,p_ip_digest,p_payload);
 return true;
end $$;
create or replace function public.consume_registration_challenge(p_id uuid,p_digest text) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare c event_registration_challenges;
begin
 select * into c from event_registration_challenges where id=p_id for update;
 if not found or c.consumed_at is not null or c.expires_at<=now() or c.attempts>=5 then return null; end if;
 update event_registration_challenges set attempts=attempts+1 where id=p_id;
 if c.code_digest<>p_digest then return null; end if;
 update event_registration_challenges set consumed_at=now(),payload='{}' where id=p_id;
 return jsonb_build_object('email',c.email,'event_id',c.event_id,'purpose',c.purpose,'payload',c.payload);
end $$;
-- A single transaction creates the person and assignments. The event lock serializes seat checks.
create or replace function public.save_event_registration(p_event_id uuid,p_email text,p_first_name text,p_last_name text,p_answers jsonb,p_session_ids uuid[],p_source text default 'admin',p_tag text default 'Registrant',p_notes text default null) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare r event_registrants; cfg jsonb; s jsonb; target_status text:='registered'; occupied integer; v_session_id uuid; uid uuid; existing boolean; normalized text:=lower(trim(p_email));
begin
 perform 1 from events where id=p_event_id for update;
 if not found then raise exception 'Event not found'; end if;
 select * into r from event_registrants where event_id=p_event_id and lower(email)=normalized for update;
 existing:=found;
 if p_source='public' then
  -- Existing registration is idempotent: never overwrite an approved person's assignments via signup.
  if existing then return jsonb_build_object('id',r.id,'status',r.registration_status,'existing',true); end if;
  select config into cfg from event_registration_settings where event_id=p_event_id;
  if cfg is null or not coalesce((cfg->>'enabled')::boolean,false) or cfg->>'mode'='closed' then raise exception 'Registration is closed'; end if;
  if cfg->>'mode'='invite_only' then raise exception 'This event is invitation only. Ask the organizer to add your email.'; end if;
  if cfg->>'mode'='approval_required' then target_status:='pending_approval'; end if;
  if nullif(cfg->>'capacity','') is not null then
   select count(*) into occupied from event_registrants where event_id=p_event_id and registration_status in ('registered','approved','checked_in');
   if occupied >= (cfg->>'capacity')::integer then
    if coalesce((cfg->>'allowWaitlist')::boolean,false) then target_status:='waitlisted'; else raise exception 'Event capacity reached'; end if;
   end if;
  end if;
 end if;
 foreach v_session_id in array coalesce(p_session_ids,'{}'::uuid[]) loop
  if not exists(select 1 from event_sessions where id=v_session_id and event_id=p_event_id) then raise exception 'Session does not belong to this event'; end if;
  if p_source='public' then
   select item into s from jsonb_array_elements(coalesce(cfg->'sessions','[]')) item where item->>'id'=v_session_id::text;
   if s is null then raise exception 'Session is not offered for registration'; end if;
   if nullif(s->>'capacity','') is not null then
    select count(*) into occupied from event_registrant_sessions a join event_registrants person on person.id=a.registrant_id where a.event_id=p_event_id and a.session_id=v_session_id and person.registration_status in ('registered','approved','checked_in');
    if occupied >= (s->>'capacity')::integer then
     if coalesce((s->>'allowWaitlist')::boolean,false) then target_status:='waitlisted'; else raise exception 'Session capacity reached'; end if;
    end if;
   end if;
  end if;
 end loop;
 if existing then
  update event_registrants set email=normalized,first_name=p_first_name,last_name=p_last_name,tag=p_tag,notes=p_notes,registration_answers=coalesce(p_answers,'{}'),updated_at=now() where id=r.id returning * into r;
 else
  insert into event_registrants(event_id,email,first_name,last_name,tag,notes,registration_status,registration_answers,email_verified_at) values(p_event_id,normalized,p_first_name,p_last_name,p_tag,p_notes,target_status,coalesce(p_answers,'{}'),case when p_source='public' then now() end) returning * into r;
 end if;
 -- Retain requested sessions for approval/waitlist without giving access until status changes.
 if p_session_ids is not null then
 delete from event_registrant_sessions where registrant_id=r.id;
 insert into event_registrant_sessions(event_id,registrant_id,session_id) select p_event_id,r.id,x from (select distinct unnest(coalesce(p_session_ids,'{}'::uuid[])) x) ids;
 end if;
 insert into users(email) values(normalized) on conflict(email) do update set email=excluded.email returning id into uid;
 return jsonb_build_object('id',r.id,'status',r.registration_status,'existing',existing,'userId',uid);
end $$;
-- Database integrity also protects administrative assignment paths.
create unique index if not exists event_sessions_event_id_id on event_sessions(event_id,id);
create unique index if not exists event_registrants_event_id_id on event_registrants(event_id,id);
alter table event_registrant_sessions add constraint assignment_same_event_person foreign key(event_id,registrant_id) references event_registrants(event_id,id) on delete cascade;
alter table event_registrant_sessions add constraint assignment_same_event_session foreign key(event_id,session_id) references event_sessions(event_id,id) on delete cascade;
revoke all on function public.issue_registration_challenge(uuid,uuid,text,text,text,text,jsonb),public.consume_registration_challenge(uuid,text),public.save_event_registration(uuid,text,text,text,jsonb,uuid[],text,text,text) from public,anon,authenticated;
grant execute on function public.issue_registration_challenge(uuid,uuid,text,text,text,text,jsonb),public.consume_registration_challenge(uuid,text),public.save_event_registration(uuid,text,text,text,jsonb,uuid[],text,text,text) to service_role;
-- Capture the current live experience once, then keep future autosaves as drafts.
alter table event_page_sections add column published_document jsonb;
update event_page_sections set published_document=jsonb_build_object('sections',sections,'elements',elements,'eventTheme',page_theme,'revision',document_revision);
create or replace function public.publish_event_registration_page(p_event_id uuid,p_page_key text,p_revision bigint,p_config jsonb) returns void
language plpgsql security invoker set search_path=public,pg_temp as $$
declare page event_page_sections;
begin
 select * into page from event_page_sections where event_id=p_event_id and page_key=p_page_key for update;
 if not found or page.document_revision<>p_revision then raise exception 'Draft changed. Refresh and publish again.'; end if;
 if p_config is not null then insert into event_registration_settings(event_id,config) values(p_event_id,p_config) on conflict(event_id) do update set config=excluded.config,updated_at=now(); end if;
 update event_page_sections set published_document=jsonb_build_object('sections',sections,'elements',elements,'eventTheme',page_theme,'revision',document_revision) where event_id=p_event_id and page_key=p_page_key;
 update event_page_manifest set status='published' where event_id=p_event_id and page_key=p_page_key;
end $$;
create or replace function public.set_event_registration_status(p_event_id uuid,p_registrant_id uuid,p_status text) returns void
language plpgsql security invoker set search_path=public,pg_temp as $$
declare cfg jsonb; s jsonb; occupied integer;
begin
 perform 1 from events where id=p_event_id for update;
 if p_status not in ('approved','declined','cancelled','waitlisted') then raise exception 'Invalid registration status'; end if;
 if not exists(select 1 from event_registrants where id=p_registrant_id and event_id=p_event_id) then raise exception 'Registrant not found'; end if;
 select config into cfg from event_registration_settings where event_id=p_event_id;
 if p_status='approved' then
  select count(*) into occupied from event_registrants where event_id=p_event_id and id<>p_registrant_id and registration_status in ('registered','approved','checked_in');
  if nullif(cfg->>'capacity','') is not null and occupied >= (cfg->>'capacity')::integer then raise exception 'Event capacity reached'; end if;
  for s in select item from jsonb_array_elements(coalesce(cfg->'sessions','[]')) item where exists(select 1 from event_registrant_sessions where registrant_id=p_registrant_id and session_id::text=item->>'id') loop
   select count(*) into occupied from event_registrant_sessions a join event_registrants r on r.id=a.registrant_id where a.session_id::text=s->>'id' and r.id<>p_registrant_id and r.registration_status in ('registered','approved','checked_in');
   if nullif(s->>'capacity','') is not null and occupied >= (s->>'capacity')::integer then raise exception 'Session capacity reached'; end if;
  end loop;
 end if;
 update event_registrants set registration_status=p_status,updated_at=now() where id=p_registrant_id and event_id=p_event_id;
end $$;
revoke all on function public.publish_event_registration_page(uuid,text,bigint,jsonb),public.set_event_registration_status(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.publish_event_registration_page(uuid,text,bigint,jsonb),public.set_event_registration_status(uuid,uuid,text) to service_role;

commit;
