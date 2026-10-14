begin;
create table public.event_registration_receipts (
 idempotency_key text primary key, event_id uuid not null references public.events(id) on delete cascade,
 registrant_id uuid not null references public.event_registrants(id) on delete cascade,
 resend_email_id text, status text not null, error_message text, created_at timestamptz not null default now()
);
create index on public.event_registration_receipts(resend_email_id);
create table public.event_registration_submissions (
 submission_id text primary key, event_id uuid not null references public.events(id) on delete cascade,
 result jsonb, created_at timestamptz not null default now()
);
alter table public.event_registration_receipts enable row level security;
alter table public.event_registration_submissions enable row level security;
revoke all on public.event_registration_receipts, public.event_registration_submissions from public,anon,authenticated;
grant select,insert,update,delete on public.event_registration_receipts, public.event_registration_submissions to service_role;
create or replace function public.save_jotform_registration(p_submission_id text,p_event_id uuid,p_email text,p_first_name text,p_last_name text,p_answers jsonb,p_session_ids uuid[],p_tag text) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare saved jsonb;
begin
 insert into event_registration_submissions(submission_id,event_id) values(p_submission_id,p_event_id) on conflict do nothing;
 select result into saved from event_registration_submissions where submission_id=p_submission_id and event_id=p_event_id for update;
 if not found then raise exception 'Submission event mismatch'; end if;
 if saved is not null then return saved; end if;
 saved:=save_event_registration(p_event_id,p_email,p_first_name,p_last_name,p_answers,p_session_ids,'integration',p_tag,null);
 update event_registration_submissions set result=saved where submission_id=p_submission_id;
 return saved;
end $$;
revoke all on function public.save_jotform_registration(text,uuid,text,text,text,jsonb,uuid[],text) from public,anon,authenticated;
grant execute on function public.save_jotform_registration(text,uuid,text,text,text,jsonb,uuid[],text) to service_role;
commit;
