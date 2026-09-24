import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { runInNewContext } from "node:vm"
import ts from "typescript"

type Profile = { role: string; team_role: string | null; is_active: boolean }
type Mutation = { table: string; values: Record<string, unknown> }
type Handler = (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>

const routes = {
  eventInvite: "../app/api/admin/events/[id]/team/invite/route.ts",
  adminInvite: "../app/api/admin/team/invite/route.ts",
  access: "../app/api/admin/team/[id]/access/route.ts",
}

// Execute the real route with injected server dependencies; no database or emails are used.
function routeHarness(route: keyof typeof routes, profile: Profile | null, profileError = false) {
  const mutations: Mutation[] = []
  let linksCreated = 0
  let emailsSent = 0
  const authUser = { id: "target", email: "member@example.com", email_confirmed_at: "2026-09-01", user_metadata: {} }
  const supabaseAdmin = {
    from(table: string) {
      let id: unknown
      const query = {
        select() { return query },
        eq(_column: string, value: unknown) { id = value; return query },
        update(values: Record<string, unknown>) { mutations.push({ table, values }); return query },
        upsert(values: Record<string, unknown>) { mutations.push({ table, values }); return query },
        async maybeSingle() {
          if (table === "events") return { data: { id: "event", title: "Event" }, error: null as null }
          if (id === "actor") return { data: { team_role: "owner" }, error: null as null }
          return { data: profile, error: profileError ? { message: "Profile lookup failed" } : null }
        },
        async single() { return { data: { id: "membership" }, error: null as null } },
      }
      return query
    },
    auth: {
      admin: {
        async listUsers() { return { data: { users: profile ? [authUser] : [] }, error: null as null } },
        async generateLink() {
          linksCreated += 1
          return { data: { user: authUser, properties: { action_link: "https://example.com/invite" } }, error: null as null }
        },
      },
    },
  }
  const source = readFileSync(new URL(routes[route], import.meta.url), "utf8")
    .replace(/^import .*$/gm, "")
    .replace(/^export /gm, "")
  const script = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  const method = route === "access" ? "PATCH" : "POST"
  const handler = runInNewContext(`${script}\n${method}`, {
    NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) },
    supabaseAdmin,
    requireAdmin: async () => ({ user: { id: "actor" } }),
    getEventTeamAccess: async () => ({ role: "owner", eventId: "event", user: { id: "actor" } }),
    canManageEventAccess: () => true,
    getAppUrl: () => "https://example.com",
    normalizeEventFeatures: (value: unknown) => Array.isArray(value) ? value : [],
    EVENT_ROLE_FEATURES: { producer: ["people"] },
    buildJupiterInviteEmail: () => ({}),
    getEmailFrom: () => "team@example.com",
    getResendClient: () => ({ emails: { send: async () => { emailsSent += 1; return {} } } }),
    resendErrorMessage: () => "Email error",
    console,
  }) as Handler
  return {
    mutations,
    get linksCreated() { return linksCreated },
    get emailsSent() { return emailsSent },
    invoke: (scope = "event") => handler(new Request("https://example.com/api", {
      method,
      body: JSON.stringify({ email: authUser.email, role: "producer", featurePermissions: ["people"], promoteExisting: true, sendInvitation: false, eventId: "event", scope }),
    }), { params: Promise.resolve({ id: "target" }) }),
  }
}

for (const role of ["admin", "event_member"]) {
  for (const route of ["eventInvite", "adminInvite", "access"] as const) {
    test(`${route} does not reactivate a disabled ${role}`, async () => {
      const harness = routeHarness(route, { role, team_role: role === "admin" ? "administrator" : null, is_active: false })
      const response = await harness.invoke()
      assert.equal(response.status, 409)
      const body = await response.json()
      assert.equal(body.code, "account_disabled")
      assert.match(body.error, /restore account access/i)
      assert.equal(harness.mutations.length, 0)
      assert.equal(harness.linksCreated, 0)
      assert.equal(harness.emailsSent, 0)
    })
  }
}

test("global permissions cannot reactivate a disabled account", async () => {
  const harness = routeHarness("access", { role: "event_member", team_role: null, is_active: false })
  assert.equal((await harness.invoke("global")).status, 409)
  assert.equal(harness.mutations.length, 0)
})

for (const scope of ["event", "global"]) {
  test(`active ${scope} permission edits leave account activation state untouched`, async () => {
    const harness = routeHarness("access", { role: "event_member", team_role: null, is_active: true })
    assert.equal((await harness.invoke(scope)).status, 200)
    const profileWrites = harness.mutations.filter((mutation) => mutation.table === "profiles")
    assert.equal(profileWrites.length, 1)
    assert.equal(Object.hasOwn(profileWrites[0].values, "is_active"), false)
  })
}

for (const route of ["eventInvite", "adminInvite"] as const) {
  test(`${route} preserves existing active and new account invitation flows`, async () => {
    const profiles: (Profile | null)[] = [{ role: "event_member", team_role: null, is_active: true }, null]
    for (const profile of profiles) {
      const harness = routeHarness(route, profile)
      assert.equal((await harness.invoke()).status, 200)
      assert.ok(harness.mutations.some((mutation) => mutation.table === "profiles"))
    }
  })
}

test("event invitations fail closed if profile activation status cannot be read", async () => {
  const harness = routeHarness("eventInvite", { role: "event_member", team_role: null, is_active: true }, true)
  assert.equal((await harness.invoke()).status, 500)
  assert.equal(harness.mutations.length, 0)
})
