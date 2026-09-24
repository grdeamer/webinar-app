import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { runInNewContext } from "node:vm"
import ts from "typescript"
import { changeTeamAccountAccess } from "../lib/teamAccountAccess.ts"

type JsonValue = Record<string, unknown>
type Profile = { role?: string; team_role?: string; is_active?: boolean }
type AccessError = { message: string; status?: number; name?: string }

function loadRoute(path: string, method: string, dependencies: Record<string, unknown>) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8")
    .replace(/^import .*$/gm, "")
    .replace(/^export /gm, "")
  const script = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  return runInNewContext(`${script}\n${method}`, {
    NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) },
    ...dependencies,
  })
}

function accountRouteHarness(options: { actorRole?: string; target?: Profile | null; targetId?: string; revocationResult?: unknown } = {}) {
  const changes: { action: string; id?: string; values: JsonValue }[] = []
  const targetId = options.targetId ?? "target-user"
  let profileReadCount = 0
  const supabaseAdmin = {
    from(table: string) {
      assert.equal(table, "profiles")
      let id = ""
      let update: JsonValue | undefined
      const query = {
        select() { return query },
        eq(column: string, value: string) { assert.equal(column, "id"); id = value; return query },
        or(filter: string) { assert.equal(filter, "team_role.is.null,team_role.neq.owner"); return query },
        update(values: JsonValue) { update = values; return query },
        async maybeSingle() {
          profileReadCount += 1
          return { data: profileReadCount === 1 ? { team_role: options.actorRole ?? "owner" } : options.target === undefined ? { team_role: "administrator" } : options.target }
        },
        async single() {
          assert.ok(update)
          changes.push({ action: "profile", id, values: update })
          return { data: { id }, error: null as null }
        },
      }
      return query
    },
    auth: { admin: { async updateUserById(id: string, values: JsonValue) {
      changes.push({ action: "ban", id, values })
      return { error: null as null }
    } } },
    async rpc(name: string, values: JsonValue) {
      assert.equal(name, "revoke_team_user_sessions")
      changes.push({ action: "revoke", values })
      return { data: options.revocationResult === undefined ? 2 : options.revocationResult, error: null as null }
    },
  }
  const handler = loadRoute("../app/api/admin/team/[id]/route.ts", "PATCH", {
    requireAdmin: async () => ({ user: { id: "owner-user" } }),
    supabaseAdmin,
    changeTeamAccountAccess,
  }) as (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>
  return {
    changes,
    invoke: (body: unknown = { is_active: false }) => handler(new Request("https://example.com/api/admin/team/target-user", {
      method: "PATCH", body: JSON.stringify(body),
    }), { params: Promise.resolve({ id: targetId }) }),
  }
}

test("account access route permits only the owner", async () => {
  const harness = accountRouteHarness({ actorRole: "administrator" })
  assert.equal((await harness.invoke()).status, 403)
  assert.equal(harness.changes.length, 0)
})

test("account access route rejects a missing target", async () => {
  const harness = accountRouteHarness({ target: null })
  assert.equal((await harness.invoke()).status, 404)
  assert.equal(harness.changes.length, 0)
})

for (const options of [{ target: { team_role: "owner" } }, { targetId: "owner-user" }]) {
  test(`account access route protects ${"targetId" in options ? "current sign-in" : "owner target"}`, async () => {
    const harness = accountRouteHarness(options)
    assert.equal((await harness.invoke()).status, 400)
    assert.equal(harness.changes.length, 0)
  })
}

for (const body of [{}, { is_active: "false" }, { is_active: 0 }, { is_active: null }]) {
  test(`account access route rejects nonboolean state ${JSON.stringify(body)}`, async () => {
    const harness = accountRouteHarness()
    assert.equal((await harness.invoke(body)).status, 400)
    assert.equal(harness.changes.length, 0)
  })
}

test("disable route locks the selected profile, bans sign-in and revokes only its sessions", async () => {
  const harness = accountRouteHarness()
  const response = await harness.invoke()
  assert.equal(response.status, 200)
  assert.equal(response.headers.get("cache-control"), "no-store")
  assert.deepEqual(await response.json(), { ok: true, is_active: false, sessions_revoked: 2 })
  assert.deepEqual(harness.changes.map((change) => change.action), ["profile", "ban", "revoke"])
  assert.equal(harness.changes[0].id, "target-user")
  assert.equal(harness.changes[0].values.is_active, false)
  assert.deepEqual({ ...harness.changes[1], values: { ...harness.changes[1].values } }, { action: "ban", id: "target-user", values: { ban_duration: "876000h" } })
  assert.deepEqual({ ...harness.changes[2].values }, { target_user_id: "target-user", actor_user_id: "owner-user" })
})

test("restore route clears stale sessions before unbanning and reactivating", async () => {
  const harness = accountRouteHarness()
  const response = await harness.invoke({ is_active: true })
  assert.equal(response.status, 200)
  assert.deepEqual(harness.changes.map((change) => change.action), ["profile", "revoke", "ban", "profile"])
  assert.equal(harness.changes[2].values.ban_duration, "none")
  assert.equal(harness.changes[3].values.is_active, true)
})

for (const result of [null, "2", -1, 0.5]) {
  test(`disable route never claims success for unconfirmed revocation ${JSON.stringify(result)}`, async () => {
    const harness = accountRouteHarness({ revocationResult: result })
    const response = await harness.invoke()
    assert.equal(response.status, 502)
    assert.equal((await response.json()).is_active, false)
  })
}

function statusRouteHarness(options: { user?: boolean; authError?: AccessError; profile?: Profile | null; profileError?: boolean } = {}) {
  let profileReads = 0
  const query = {
    select() { return query },
    eq(column: string, id: string) { assert.equal(column, "id"); assert.equal(id, "session-user"); return query },
    async maybeSingle() {
      profileReads += 1
      return { data: options.profile === undefined ? { role: "admin", is_active: true } : options.profile, error: options.profileError ? { message: "Unavailable" } : null }
    },
  }
  const handler = loadRoute("../app/api/auth/access-status/route.ts", "GET", {
    createClient: async () => ({ auth: { getUser: async () => ({ data: { user: options.user === false ? null : { id: "session-user" } }, error: options.authError ?? null }) } }),
    supabaseAdmin: { from: (table: string) => { assert.equal(table, "profiles"); return query } },
  }) as () => Promise<Response>
  return { invoke: handler, get profileReads() { return profileReads } }
}

async function assertPrivateStatus(response: Response, expectedStatus: number, allowed?: boolean) {
  assert.equal(response.status, expectedStatus)
  assert.equal(response.headers.get("cache-control"), "no-store, private")
  if (allowed !== undefined) assert.equal((await response.json()).allowed, allowed)
}

test("access status denies missing or invalid authentication without reading profiles", async () => {
  for (const options of [{ user: false }, { authError: { message: "Invalid JWT", status: 401 } }]) {
    const harness = statusRouteHarness(options)
    await assertPrivateStatus(await harness.invoke(), 401, false)
    assert.equal(harness.profileReads, 0)
  }
})

test("access status denies inactive, missing and non-team profiles", async () => {
  const profiles: (Profile | null)[] = [{ role: "admin", is_active: false }, null, { role: "attendee", is_active: true }]
  for (const profile of profiles) {
    await assertPrivateStatus(await statusRouteHarness({ profile }).invoke(), 403, false)
  }
})

test("access status permits active administrators and event team members", async () => {
  for (const role of ["admin", "event_member"]) {
    await assertPrivateStatus(await statusRouteHarness({ profile: { role, is_active: true } }).invoke(), 200, true)
  }
})

test("access status distinguishes a database outage from disabled access", async () => {
  await assertPrivateStatus(await statusRouteHarness({ profileError: true }).invoke(), 503)
})

test("access status keeps transient Auth failures separate from invalid sessions", async () => {
  const errors: AccessError[] = [
    { message: "Auth unavailable", status: 500, name: "AuthApiError" },
    { message: "Network timeout", status: 0, name: "AuthRetryableFetchError" },
    { message: "Network unavailable", name: "Error" },
  ]
  for (const authError of errors) {
    const harness = statusRouteHarness({ authError })
    await assertPrivateStatus(await harness.invoke(), 503)
    assert.equal(harness.profileReads, 0)
  }
  await assertPrivateStatus(await statusRouteHarness({ authError: { message: "Missing session", name: "AuthSessionMissingError" } }).invoke(), 401, false)
})
