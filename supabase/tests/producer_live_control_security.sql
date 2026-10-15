-- Run as postgres. All DML probes affect zero rows; rollback also protects
-- against future statement triggers. No broadcast or live state is changed.
begin;

do $$
declare
  table_name text;
  role_name text;
  operation text;
  probe text;
  column_name text;
  checks integer := 0;
begin
  foreach table_name in array array[
    'event_live_participants', 'event_live_program_state', 'event_live_rooms',
    'event_live_scenes', 'event_live_stage_state', 'event_live_state',
    'session_stage_state'
  ] loop
    if not (select relrowsecurity from pg_class
            where oid = format('public.%I', table_name)::regclass) then
      raise exception 'RLS is disabled on %', table_name;
    end if;

    select a.attname into strict column_name
    from pg_attribute a
    where a.attrelid = format('public.%I', table_name)::regclass
      and a.attnum > 0 and not a.attisdropped and a.attgenerated = ''
    order by a.attnum limit 1;

    foreach role_name in array array['anon', 'authenticated', 'service_role'] loop
      foreach operation in array array['SELECT', 'INSERT', 'UPDATE', 'DELETE'] loop
        probe := case operation
          when 'SELECT' then format('select * from public.%I where false', table_name)
          when 'INSERT' then format('insert into public.%I (%I) select %I from public.%I where false',
            table_name, column_name, column_name, table_name)
          when 'UPDATE' then format('update public.%I set %I = %I where false',
            table_name, column_name, column_name)
          when 'DELETE' then format('delete from public.%I where false', table_name)
        end;
        execute format('set local role %I', role_name);
        if role_name = 'service_role' then
          execute probe;
        else
          begin
            execute probe;
            raise exception 'Unexpected % access for % on %', operation, role_name, table_name;
          exception when insufficient_privilege then
            null;
          end;
        end if;
        reset role;
        checks := checks + 1;
      end loop;
    end loop;
  end loop;

  -- Privileged Producer commands must also stay behind server authorization.
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('producer_take', 'producer_set_live')
      and (has_function_privilege('anon', p.oid, 'EXECUTE')
        or has_function_privilege('authenticated', p.oid, 'EXECUTE')
        or not has_function_privilege('service_role', p.oid, 'EXECUTE'))
  ) then
    raise exception 'Producer command privileges are unsafe';
  end if;
  raise notice 'Passed % role/operation checks across seven live-control tables', checks;
end;
$$;

select 'Producer live-control security checks passed' as result;
rollback;
