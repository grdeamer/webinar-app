import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const migration = readFileSync(new URL("../supabase/migrations/20260924215957_add_owner_team_session_revocation.sql", import.meta.url), "utf8")
const privateFunction = migration.slice(migration.indexOf("create or replace function jupiter_private."), migration.indexOf("revoke all on function jupiter_private."))
const publicFunction = migration.slice(migration.indexOf("create or replace function public."), migration.indexOf("revoke all on function public."))

test("session revocation exposes only a service-role-only invoker wrapper", () => {
  assert.match(publicFunction, /security invoker/)
  assert.doesNotMatch(publicFunction, /security definer/)
  assert.match(publicFunction, /current_user <> 'service_role'/)
  for (const schema of ["public", "jupiter_private"]) {
    assert.ok(migration.includes(`revoke all on function ${schema}.revoke_team_user_sessions(uuid, uuid) from public, anon, authenticated;`))
    assert.ok(migration.includes(`grant execute on function ${schema}.revoke_team_user_sessions(uuid, uuid) to service_role;`))
  }
  assert.match(migration, /revoke all on schema jupiter_private from public, anon, authenticated/)
  assert.doesNotMatch(migration, /grant\s+(all|delete|select)\b[^;]*\bon\s+(table\s+)?auth\./i)
})

test("the private privilege boundary is fixed and owner-authorized", () => {
  assert.match(privateFunction, /security definer\s+set search_path = ''/)
  assert.match(privateFunction, /current_setting\('role', true\) is distinct from 'service_role'/)
  assert.match(privateFunction, /auth\.uid\(\) is not null and auth\.uid\(\) <> actor_user_id/)
  assert.match(privateFunction, /actor_profile\.role is distinct from 'admin'/)
  assert.match(privateFunction, /actor_profile\.team_role is distinct from 'owner'/)
  assert.match(privateFunction, /actor_profile\.is_active is distinct from true/)
})

test("session revocation protects owners, self, missing, active, and non-team accounts", () => {
  assert.match(privateFunction, /target_user_id is null or actor_user_id is null or target_user_id = actor_user_id/)
  assert.match(privateFunction, /if not found then\s+raise exception 'Team member not found\.'/)
  assert.match(privateFunction, /target_profile\.team_role = 'owner'/)
  assert.match(privateFunction, /coalesce\(target_profile\.role, ''\) not in \('admin', 'event_member'\)/)
  assert.match(privateFunction, /target_profile\.is_active is distinct from false/)
  assert.ok(privateFunction.indexOf("for update;") < privateFunction.indexOf("delete from auth."))
  assert.ok(privateFunction.indexOf("Disable the team account") < privateFunction.indexOf("delete from auth."))
})

test("session revocation is scoped to one user's tokens and preserves their account", () => {
  assert.match(privateFunction, /delete from auth\.refresh_tokens r where r\.user_id = target_user_id::text;/)
  assert.match(privateFunction, /delete from auth\.sessions s where s\.user_id = target_user_id;/)
  assert.doesNotMatch(migration, /delete\s+from\s+(auth\.users|public\.)/i)
  assert.match(privateFunction, /returns integer/)
  assert.match(privateFunction, /return sessions_revoked;/)
})
