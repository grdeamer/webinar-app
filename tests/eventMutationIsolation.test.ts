import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"
import test from "node:test"
import ts from "typescript"

type Handler = (req: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response>
function load(file: string, dependencies: Record<string, unknown>): Record<string, Handler> {
  const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8")
  const exports = {}
  runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, module: { exports }, Response, Request, console,
    require(name: string) {
      if (name === "next/server") return { NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) } }
      assert.ok(name in dependencies, `Unmocked dependency ${name}`)
      return dependencies[name]
    },
  })
  return exports
}
const foreignId = "22222222-2222-4222-8222-222222222222"
const localId = "11111111-1111-4111-8111-111111111111"
const ctx = { params: Promise.resolve({ id: "event-A" }) }
function dbHarness(people: { id: string }[] = []) {
  const mutations: { table: string; filters: [string, unknown][] }[] = []
  const db = { from(table: string) {
    let mutating = false
    const filters: [string, unknown][] = []
    const q = {
      select() { return q },
      delete() { mutating = true; mutations.push({ table, filters }); return q },
      update() { mutating = true; mutations.push({ table, filters }); return q },
      eq(key: string, value: unknown) { filters.push([key, value]); return q },
      in(key: string, value: unknown) { filters.push([key, value]); return q },
      async maybeSingle() { return { data: { event_id: "event-B" }, error: null as null } },
      then(resolve: (value: unknown) => unknown) { return Promise.resolve(resolve({ data: mutating ? null : people, error: null as null })) },
    }
    return q
  } }
  return { db, mutations }
}

test("legacy session deletion authorizes the persisted event, not query scope", async () => {
  const { db, mutations } = dbHarness()
  const route = load("app/api/admin/sessions/[id]/route.ts", {
    "@/lib/supabase/admin": { supabaseAdmin: db },
    "@/lib/eventTeamAccess": { requireEventOperatorAccess: async (event: string, roles: string[], feature: string) => {
      assert.equal(event, "event-B"); assert.equal(feature, "program"); assert.deepEqual(Array.from(roles), ["event_admin"])
      return Response.json({}, { status: 403 })
    } },
  })
  const result = await route.DELETE(new Request(`https://example.test/api/admin/sessions/${foreignId}?event_id=event-A`, { method: "DELETE" }), { params: Promise.resolve({ id: foreignId }) })
  assert.equal(result.status, 403)
  assert.equal(mutations.length, 0)
})

for (const foreign of [true, false]) {
  test(`bulk deletion ${foreign ? "rejects a mixed-event list before any write" : "scopes every authorized deletion to the event"}`, async () => {
    const { db, mutations } = dbHarness([{ id: localId }])
    const route = load("app/api/admin/events/[id]/attendees/bulk-delete/route.ts", {
      "@/lib/supabase/admin": { supabaseAdmin: db },
      "@/lib/eventTeamAccess": { requireEventOperatorAccess: async (event: string, _roles: string[], feature: string) => {
        assert.equal(event, "event-A"); assert.equal(feature, "people"); return { eventId: event }
      } },
    })
    const result = await route.POST(new Request("https://example.test", { method: "POST", body: JSON.stringify({ attendee_ids: foreign ? [localId, foreignId] : [localId] }) }), ctx)
    assert.equal(result.status, foreign ? 400 : 200)
    assert.equal(mutations.length, foreign ? 0 : 2)
    for (const mutation of mutations) assert.ok(mutation.filters.some(([key, value]) => key === "event_id" && value === "event-A"))
  })
}

test("event update independently authorizes its target even if proxy scope differs", async () => {
  const { db, mutations } = dbHarness()
  const route = load("app/api/admin/events/route.ts", {
    "@/lib/supabase/admin": { supabaseAdmin: db },
    "@/lib/requireAdmin": { requireAdmin: async () => ({ user: { id: "member" } }) },
    "@/lib/cloud/audit": { recordAuditEvent: () => assert.fail("No denied audit write") },
    "@/lib/eventTeamAccess": { requireEventOperatorAccess: async (event: string, _roles: string[], feature: string) => {
      assert.equal(event, "event-B"); assert.equal(feature, "event_details"); return Response.json({}, { status: 403 })
    } },
  })
  const result = await route.PUT(new Request("https://example.test/api/admin/events?event_id=event-A", { method: "PUT", body: JSON.stringify({ id: "event-B", title: "Changed" }) }), ctx)
  assert.equal(result.status, 403)
  assert.equal(mutations.length, 0)
})
