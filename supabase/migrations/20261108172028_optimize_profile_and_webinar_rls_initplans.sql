-- Prepared locally only. Requires explicit hosted approval. No grants/roles change.
-- Preserve the existing email-based webinar rule; replacing it with UID would
-- change authorization semantics because public.users is not auth.users.
begin;
set local lock_timeout = '2s';
set local statement_timeout = '15s';
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='profiles'
    and policyname='Users can read own profile' and cmd='SELECT' and roles=array['public']::name[]
    and lower(regexp_replace(qual, '\s', '', 'g'))='(auth.uid()=id)' and with_check is null
  ) then raise exception 'profiles policy drifted; review before changing RLS'; end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='user_webinars'
    and policyname='user can select their webinars' and cmd='SELECT' and roles=array['public']::name[]
    and lower(regexp_replace(qual, '\s', '', 'g'))='(auth.email()=(selectusers.emailfromuserswhere(users.id=user_webinars.user_id)))'
    and with_check is null
  ) then raise exception 'user_webinars policy drifted; review before changing RLS'; end if;
end $$;
alter policy "Users can read own profile" on public.profiles
  using ((select auth.uid()) = id);
alter policy "user can select their webinars" on public.user_webinars
  using ((select auth.email()) = (select users.email from public.users where users.id = user_webinars.user_id));
commit;
