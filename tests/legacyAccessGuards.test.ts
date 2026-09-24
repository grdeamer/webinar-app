import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { runInNewContext } from "node:vm"
import ts from "typescript"

const root = new URL("../", import.meta.url)
type Route = {
  POST: (request: Request, context?: { params: Promise<{ slug: string; id: string }> }) => Promise<Response>
  GET: () => Promise<Response>
}
type Element = { type: unknown; props: { children?: unknown; [key: string]: unknown } }
type Page = { default: (props?: { searchParams: Promise<Record<string, string>> }) => Promise<Element> }

function load<T>(path: string, mocks: Record<string, unknown>): T {
  const source = readFileSync(new URL(path, root), "utf8")
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    fileName: path,
  }).outputText
  const exports = {}
  const jsx = (type: unknown, props: Element["props"]) => ({ type, props })
  const dependencies = {
    "next/server": { NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) } },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    ...mocks,
  }
  runInNewContext(compiled, {
    exports,
    module: { exports },
    Response,
    process: { env: { LIVEKIT_URL: "wss://example.test", LIVEKIT_API_KEY: "test", LIVEKIT_API_SECRET: "test" } },
    crypto: { randomUUID: () => "test-identity" },
    require(name: string) {
      assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`)
      return dependencies[name as keyof typeof dependencies]
    },
  })
  return exports as T
}

function hasElement(node: unknown, type: unknown): boolean {
  if (Array.isArray(node)) return node.some(child => hasElement(child, type))
  if (!node || typeof node !== "object") return false
  const element = node as Element
  return element.type === type || hasElement(element.props?.children, type)
}

test("producer token rejects a denied event operator before querying sessions or issuing a token", async () => {
  let checks = 0
  const denied = Response.json({ error: "Event access denied" }, { status: 403 })
  const route = load<Route>("app/api/events/[slug]/sessions/[id]/live/producer-token/route.ts", {
    "@/lib/eventTeamAccess": { requireEventOperatorAccess: async (slug: string) => { checks++; assert.equal(slug, "event"); return denied } },
    "@/lib/events": { getEventBySlug: () => assert.fail("Denied user must not query events") },
    "@/lib/repos/sessionsRepo": { getSessionById: () => assert.fail("Denied user must not query sessions") },
    "livekit-server-sdk": { AccessToken: class { constructor() { assert.fail("Denied user must not receive a producer token") } } },
  })
  const response = await route.POST(new Request("https://example.test", { method: "POST" }), { params: Promise.resolve({ slug: "event", id: "session" }) })
  assert.equal(response, denied)
  assert.equal(checks, 1)
})

test("authorized event operators can still receive a scoped producer token", async () => {
  const grants: unknown[] = []
  const route = load<Route>("app/api/events/[slug]/sessions/[id]/live/producer-token/route.ts", {
    "@/lib/eventTeamAccess": { requireEventOperatorAccess: async () => ({ eventId: "event-id" }) },
    "@/lib/events": { getEventBySlug: async () => ({ id: "event-id" }) },
    "@/lib/repos/sessionsRepo": { getSessionById: async () => ({ id: "session", deliveryMode: "livekit", liveRoomName: "event-room" }) },
    "livekit-server-sdk": { AccessToken: class { addGrant(grant: unknown) { grants.push(grant) } async toJwt() { return "producer-token" } } },
  })
  const response = await route.POST(new Request("https://example.test", { method: "POST" }), { params: Promise.resolve({ slug: "event", id: "session" }) })
  assert.equal(response.status, 200)
  assert.equal((await response.json()).token, "producer-token")
  assert.equal((grants[0] as { room: string }).room, "event-room")
})

for (const path of [
  "app/api/general-session/settings/route.ts",
  "app/api/general-session/theme/route.ts",
  "app/api/qa/update/route.ts",
  "app/api/qa/featured/room-settings/route.ts",
]) {
  test(`${path} rejects inactive/nonadmin callers before processing the mutation`, async () => {
    const supabaseAdmin = { from: () => assert.fail("Denied caller must not access privileged data") }
    const route = load<Route>(path, {
      "@/lib/app/auth": { isAdminRequest: async () => false },
      "@/lib/supabase/admin": { supabaseAdmin },
      "@/lib/supabaseAdmin": { supabaseAdmin },
    })
    const request = { json: () => assert.fail("Denied caller must not process mutation body") } as unknown as Request
    assert.equal((await route.POST(request)).status, 401)
  })
}

test("public general-session settings omit the presenter secret", async () => {
  const query = {
    select() { return this }, eq() { return this },
    maybeSingle: async () => ({ data: { title: "General session", presenter_key: "secret-presenter-key" }, error: null as null }),
  }
  const route = load<Route>("app/api/general-session/settings/route.ts", {
    "@/lib/app/auth": { isAdminRequest: async () => false },
    "@/lib/supabase/admin": { supabaseAdmin: { from: () => query } },
  })
  const response = await route.GET()
  const payload = await response.json()
  assert.equal(response.status, 200)
  assert.equal(payload.settings.title, "General session")
  assert.equal(Object.hasOwn(payload.settings, "presenter_key"), false)
})

test("legacy presenter dashboard awaits active-admin authorization", async () => {
  const dashboard = (): null => null
  for (const allowed of [false, true]) {
    const page = load<Page>("app/presenter/page.tsx", {
      "@/lib/app/auth": { isAdminRequest: async () => allowed },
      "@/components/PresenterDashboard": { default: dashboard },
    })
    assert.equal(hasElement(await page.default(), dashboard), allowed)
  }
})

test("legacy presenter control room rejects inactive admins but preserves valid presenter-key access", async () => {
  const controlRoom = (): null => null
  const query = {
    select() { return this }, eq() { return this },
    maybeSingle: async () => ({ data: { id: 1, title: "General session", presenter_key: "valid-key", is_published: false } }),
  }
  for (const [adminAllowed, key, expected] of [[false, "", false], [false, "invalid", false], [true, "", true], [false, "valid-key", true]] as const) {
    const page = load<Page>("app/general-session/presenter/page.tsx", {
      "@/lib/app/auth": { isAdminRequest: async () => adminAllowed },
      "@/lib/supabase/admin": { supabaseAdmin: { from: () => query } },
      "./ui": { default: controlRoom },
    })
    const result = await page.default({ searchParams: Promise.resolve({ key }) })
    assert.equal(hasElement(result, controlRoom), expected)
  }
})
