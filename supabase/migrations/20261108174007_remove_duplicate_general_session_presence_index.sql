-- Approval required. Apply only in a quiet maintenance window. DROP INDEX takes
-- a table lock; abort promptly rather than waiting behind an active broadcast.
begin;
set local lock_timeout = '2s';
set local statement_timeout = '15s';
do $$
declare
  keep_oid regclass := to_regclass('public.general_session_presence_room_last_seen_idx');
  drop_oid regclass := to_regclass('public.idx_gsp_room_last_seen');
  keep_definition text;
  drop_definition text;
begin
  if keep_oid is null or drop_oid is null then raise exception 'Expected presence indexes missing; review schema drift'; end if;
  select regexp_replace(pg_get_indexdef(keep_oid), '^CREATE INDEX [^ ]+ ', 'CREATE INDEX ') into keep_definition;
  select regexp_replace(pg_get_indexdef(drop_oid), '^CREATE INDEX [^ ]+ ', 'CREATE INDEX ') into drop_definition;
  if keep_definition is distinct from drop_definition
     or exists (select 1 from pg_index where indexrelid in (keep_oid,drop_oid) and (not indisvalid or indisunique or indisprimary))
     or exists (select 1 from pg_constraint where conindid=drop_oid)
  then raise exception 'Presence indexes are not interchangeable; refusing to drop'; end if;
end $$;
drop index public.idx_gsp_room_last_seen;
commit;
