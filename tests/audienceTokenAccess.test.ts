import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { runInNewContext } from "node:vm"
import ts from "typescript"
import { createAttendeeToken, digest, verifyAttendeeToken } from "../lib/registration/tokens.ts"

process.env.JWT_SECRET = "audience-test-secret-with-at-least-32-characters"

function load<T>(path: string, dependencies: Record<string, unknown>): T {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8")
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const exports = {}
  runInNewContext(compiled, {
    exports, module: { exports }, Response, Date,
    crypto: { randomUUID: () => "test-viewer" },
    require(name: string) {
      assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`)
      return dependencies[name]
    },
  })
  return exports as T
}

type TokenInput = { roomName: string; role: string; metadata: { eventId: string } }
type Route = { POST: (request: Request, context: { params: Promise<{ slug: string }> }) => Promise<Response> }

function setup(cookie: string | undefined, status: string | null = "registered", databaseError = false) {
  let roomCalls = 0
  const issued: TokenInput[] = []
  const supabaseAdmin = {
    from(table: string) {
      assert.ok(["events", "event_registrants"].includes(table))
      const query = {
        select() { return query },
        eq(column: string, value: string) {
          const expected = column === "slug" ? "event-one" : column === "email" ? "viewer@example.test" : "event-id"
          assert.equal(value, expected)
          return query
        },
        async maybeSingle() {
          return {
            data: table === "events" ? { id: "event-id" } : status === null ? null : { id: "registrant-id", email: "viewer@example.test", registration_status: status },
            error: databaseError && table === "event_registrants" ? { message: "private database details" } : null,
          }
        },
      }
      return query
    },
  }
  const server = load<{ getActiveRegistrant: (eventId: string, email: string) => Promise<unknown> }>("lib/registration/server.ts", {
    "@/lib/email/registration": {}, "node:crypto": {},
    "@/lib/supabase/admin": { supabaseAdmin }, "@/lib/email/resend": {}, "./tokens": {}, "./schema": {},
  })
  const auth = load<{ getEventEmailFromCookies: (slug: string) => Promise<string | null> }>("lib/eventAuth.ts", {
    "next/headers": { cookies: async () => ({ get: (name: string) => name === "user_token" ? { value: cookie } : undefined }) },
    "@/lib/supabase/admin": { supabaseAdmin },
    "@/lib/registration/tokens": { verifyAttendeeToken },
    "@/lib/registration/server": server,
  })
  const route = load<Route>("app/api/events/[slug]/live/audience-token/route.ts", {
    "next/server": { NextResponse: { json: (data: unknown, init: ResponseInit) => Response.json(data, init) } },
    "@/lib/events": { getEventBySlug: async () => ({ id: "event-id" }) },
    "@/lib/eventAuth": auth,
    "@/lib/live/protectedPublishers": { roomPublishersAreProtected: async () => true },
    "@/lib/live/stageState": { ensureEventLiveRoom: async () => { roomCalls++; return { room_name: "event-room" } } },
    "@/lib/live/livekit/token": { createLiveKitToken: async (input: TokenInput) => { issued.push(input); return { token: "viewing-token" } } },
  })
  return { route, issued, roomCalls: () => roomCalls }
}

function validCookie(eventId = "event-id", slug = "event-one") {
  return createAttendeeToken({ email: "viewer@example.test", eventId, slug })
}

async function request(route: Route) {
  return route.POST(new Request("https://example.test/api/events/event-one/live/audience-token", { method: "POST" }), { params: Promise.resolve({ slug: "event-one" }) })
}

const expiredBody = Buffer.from(JSON.stringify({ email: "viewer@example.test", eventId: "event-id", slug: "event-one", version: 2, purpose: "attendee", expiresAt: 1 })).toString("base64url")
for (const [label, cookie] of [
  ["missing cookie", undefined], ["raw email", "viewer@example.test"],
  ["tampered cookie", validCookie() + "x"], ["other event slug", validCookie("other-id", "other-event")],
  ["other event ID", validCookie("other-id")], ["expired cookie", `${expiredBody}.${digest(expiredBody)}`],
] as const) {
  test(`audience token rejects ${label} before room creation or token issuance`, async () => {
    const state = setup(cookie)
    const response = await request(state.route)
    assert.equal(response.status, 401)
    assert.equal(state.roomCalls(), 0)
    assert.equal(state.issued.length, 0)
    assert.equal(response.headers.get("Cache-Control"), "no-store")
  })
}

for (const status of ["cancelled", "waitlisted", "pending", "rejected", null]) {
  test(`audience token rejects a ${status} registration despite a valid signed cookie`, async () => {
    const state = setup(validCookie(), status)
    assert.equal((await request(state.route)).status, 401)
    assert.equal(state.roomCalls(), 0)
    assert.equal(state.issued.length, 0)
  })
}

for (const status of ["registered", "approved", "checked_in"]) {
  test(`audience token preserves ${status} attendee access to the event room`, async () => {
    const state = setup(validCookie(), status)
    const response = await request(state.route)
    assert.equal(response.status, 200)
    assert.equal((await response.json()).token, "viewing-token")
    assert.equal(state.roomCalls(), 1)
    assert.equal(state.issued[0].roomName, "event-room")
    assert.equal(state.issued[0].role, "guest")
    assert.equal(state.issued[0].metadata.eventId, "event-id")
    assert.equal(response.headers.get("Cache-Control"), "no-store")
  })
}

test("audience token fails closed on registration lookup failure without leaking details", async () => {
  const state = setup(validCookie(), "registered", true)
  const response = await request(state.route)
  assert.equal(response.status, 500)
  assert.equal(JSON.stringify(await response.json()).includes("private database details"), false)
  assert.equal(state.roomCalls(), 0)
  assert.equal(state.issued.length, 0)
})
