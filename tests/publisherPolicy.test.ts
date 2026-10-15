import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { runInNewContext } from "node:vm"
import ts from "typescript"
import { TrackSource, TrackType } from "livekit-server-sdk"
import * as audio from "../lib/live/programAudio.ts"
import { createPublisherPolicyToken, verifyPublisherPolicyToken, type PublisherPolicyIdentity } from "../lib/live/publisherPolicyToken.ts"

process.env.JWT_SECRET = "publisher-policy-test-secret-over-32-characters"

function load<T>(path: string, dependencies: Record<string, unknown>, globals: Record<string, unknown> = {}): T {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8")
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const exports = {}
  runInNewContext(compiled, { exports, module: { exports }, Response, Date,
    require(name: string) { assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency ${name}`); return dependencies[name] }, ...globals })
  return exports as T
}

type Policy = typeof import("../lib/live/publisherPolicy.ts")
const policy = load<Policy>("lib/live/publisherPolicy.ts", { "./programAudio": audio })
const tracks = [
  { sid: "mic", kind: "audio", source: "microphone" },
  { sid: "camera", kind: "video", source: "camera" },
  { sid: "screen", kind: "video", source: "screen_share" },
  { sid: "screen-audio", kind: "audio", source: "screen_share_audio" },
  { sid: "unknown", kind: "audio", source: "unknown" },
] as Parameters<Policy["publisherTrackPermissions"]>[1]
const subscribers = [{ identity: "operator", canPublish: true }, { identity: "viewer", canPublish: false }]

test("SFU allowlist gives a viewer only explicit Program tracks, never publisher-wide permission", () => {
  const result = policy.publisherTrackPermissions("speaker", tracks, subscribers, {
    is_live: true, program_blocks: [{ type: "camera", assignedParticipantId: "speaker" }],
  })
  const viewer = result.find(item => item.participantIdentity === "viewer")!
  assert.equal(viewer.allowAll, false)
  assert.deepEqual(Array.from(viewer.allowedTrackSids), ["mic", "camera"])
  assert.equal(result.find(item => item.participantIdentity === "operator")?.allowAll, true)
})

test("backstage, Off Air and hidden source permissions omit viewers entirely", () => {
  for (const program of [null, { is_live: false, primary_participant_id: "speaker" },
    { is_live: true, primary_participant_id: "other" },
    { is_live: true, program_blocks: [{ type: "camera", assignedParticipantId: "speaker", hidden: true }] }]) {
    const result = policy.publisherTrackPermissions("speaker", tracks, subscribers, program)
    assert.equal(result.length, 1)
    assert.equal(result[0].participantIdentity, "operator")
  }
})

test("screen sharing allows screen video/audio independently from presenter microphone", () => {
  const result = policy.publisherTrackPermissions("speaker", tracks, subscribers, {
    is_live: true, program_blocks: [{ type: "screen", assignedParticipantId: "speaker" }],
  })
  assert.deepEqual(Array.from(result[1].allowedTrackSids), ["screen", "screen-audio"])
})

test("policy capabilities are signed, purpose-bound, short-lived and do not reset session age", () => {
  const identity: PublisherPolicyIdentity = { eventId: "event", room: "event_event", identity: "speaker", sessionId: null, startedAt: Date.now() }
  const token = createPublisherPolicyToken(identity)
  assert.deepEqual(verifyPublisherPolicyToken(token), identity)
  assert.deepEqual(verifyPublisherPolicyToken(createPublisherPolicyToken(verifyPublisherPolicyToken(token)!)), identity)
  assert.equal(verifyPublisherPolicyToken(token + "x"), null)
  assert.equal(verifyPublisherPolicyToken(createPublisherPolicyToken({ ...identity, startedAt: Date.now() - 86400001 })), null)
  const realNow = Date.now
  Date.now = () => realNow() + 61000
  try { assert.equal(verifyPublisherPolicyToken(token), null) } finally { Date.now = realNow }
})

type Claims = { sub: string; metadata: string; video: { room: string; roomJoin: boolean; canPublish: boolean } }
type Route = { POST: (request: Request) => Promise<Response> }
function routeFixture(input: { claims?: Claims; active?: boolean; dbError?: boolean; renewed?: boolean } = {}) {
  let queries = 0
  const claims: Claims = input.claims ?? { sub: "speaker", metadata: JSON.stringify({ eventId: "event" }), video: { room: "event_event", roomJoin: true, canPublish: true } }
  const identity: PublisherPolicyIdentity = { eventId: "event", sessionId: null, room: "event_event", identity: "speaker", startedAt: Date.now() }
  const query = { select() { return query }, eq(column: string, value: string) { assert.equal(column, "event_id"); assert.equal(value, "event"); return query }, async maybeSingle() {
    queries++; return { data: { is_live: true, layout: "solo", primary_participant_id: "speaker" }, error: input.dbError ? { message: "private db details" } : null }
  } }
  const route = load<Route>("app/api/livekit/publisher-policy/route.ts", {
    "next/server": { NextResponse: { json: (data: unknown, init: ResponseInit) => Response.json(data, init) } },
    "livekit-server-sdk": { TrackSource, TrackType, TokenVerifier: class { async verify(token: string) { assert.equal(token, "join-token"); return claims } } },
    "@/lib/live/config": { getLiveKitApiKey: () => "test", getLiveKitApiSecret: () => "test", buildEventRoomName: (id: string) => `event_${id}` },
    "@/lib/live/livekit/server": { getLiveKitRoomService: () => ({ listParticipants: async () => [
      { identity: "speaker", permission: { canPublish: input.active !== false }, tracks: [{ sid: "mic", source: TrackSource.MICROPHONE, type: TrackType.AUDIO }] },
      { identity: "viewer", permission: { canPublish: false }, tracks: [] },
    ] }) },
    "@/lib/supabase/admin": { supabaseAdmin: { from(table: string) { assert.equal(table, "event_live_program_state"); return query } } },
    "@/lib/repos/sessionsRepo": { getSessionById: (): null => null },
    "@/lib/app/sessionStageState": {},
    "@/lib/live/publisherPolicy": policy,
    "@/lib/live/publisherPolicyToken": { verifyPublisherPolicyToken: () => input.renewed ? identity : null, createPublisherPolicyToken: () => "renewed-policy-token" },
  })
  return { route, queries: () => queries }
}

test("viewer tokens cannot request publisher allowlists or reach privileged database reads", async () => {
  const state = routeFixture({ claims: { sub: "viewer", metadata: JSON.stringify({ eventId: "event" }), video: { room: "event_event", roomJoin: true, canPublish: false } } })
  const result = await state.route.POST(new Request("https://example.test", { method: "POST", headers: { Authorization: "Bearer join-token" } }))
  assert.equal(result.status, 401)
  assert.equal(state.queries(), 0)
})

for (const renewed of [false, true]) {
  test(`connected publisher receives scoped policy using ${renewed ? "renewable capability" : "signed LiveKit join token"}`, async () => {
    const state = routeFixture({ renewed })
    const result = await state.route.POST(new Request("https://example.test", { method: "POST", headers: { Authorization: `Bearer ${renewed ? "policy-token" : "join-token"}` } }))
    assert.equal(result.status, 200)
    const data = await result.json()
    assert.equal(data.policyToken, "renewed-policy-token")
    assert.deepEqual(data.permissions, [{ participantIdentity: "viewer", allowAll: false, allowedTrackSids: ["mic"] }])
    assert.equal(result.headers.get("Cache-Control"), "no-store")
  })
}

test("revoked publisher permission and failed Program lookup fail closed", async () => {
  for (const options of [{ active: false }, { dbError: true }]) {
    const state = routeFixture(options)
    const response = await state.route.POST(new Request("https://example.test", { method: "POST", headers: { Authorization: "Bearer join-token" } }))
    assert.equal(response.status, options.active === false ? 403 : 503)
    const data = await response.json()
    assert.equal(data.permissions, undefined)
    assert.equal(JSON.stringify(data).includes("private db details"), false)
  }
})

test("older publishers block audience joins; viewer metadata cannot claim publisher protection", async () => {
  for (const [canPublish, metadata, expected] of [
    [true, "{}", false], [true, '{"publisherPolicyVersion":1}', true],
    [false, "{}", true], [true, "invalid", false],
  ] as const) {
    const loaded = load<{ roomPublishersAreProtected: (room: string) => Promise<boolean> }>("lib/live/protectedPublishers.ts", {
      "@/lib/live/livekit/server": { getLiveKitRoomService: () => ({ listParticipants: async () => [{ permission: { canPublish }, metadata }] }) },
    })
    assert.equal(await loaded.roomPublishersAreProtected("room"), expected)
  }
})

test("publisher room denies before connecting, closes an expired policy, and ignores stale reconnect responses", async () => {
  type Permission = { participantIdentity: string; allowAll: boolean; allowedTrackSids: string[] }
  const history: { all: boolean; permissions: Permission[] }[] = []
  const events = new Map<string, () => void>()
  const timers = new Map<number, () => void>()
  const effects: (() => () => void)[] = []
  let resolveRequest: ((response: Response) => void) | undefined
  let now = 1000
  class FakeRoom {
    state = "connected"
    localParticipant = { setTrackSubscriptionPermissions: (all: boolean, permissions: Permission[]) => history.push({ all, permissions }) }
    on(name: string, handler: () => void) { events.set(name, handler); return this }
    off(name: string) { events.delete(name); return this }
  }
  const loaded = load<{ default: (props: { token: string; serverUrl: string }) => unknown }>("components/live/ProtectedLiveKitRoom.tsx", {
    react: { useState: (initial: unknown) => [typeof initial === "function" ? initial() : initial, () => {}], useEffect: (effect: () => () => void) => effects.push(effect) },
    "react/jsx-runtime": { jsx: (type: unknown, props: unknown) => ({ type, props }), jsxs: (type: unknown, props: unknown) => ({ type, props }) },
    "@livekit/components-react": { LiveKitRoom: Symbol("LiveKitRoom") },
    "livekit-client": { Room: FakeRoom, ConnectionState: { Connected: "connected" }, RoomEvent: Object.fromEntries(["Connected", "Reconnected", "Reconnecting", "Disconnected", "ParticipantConnected", "ParticipantDisconnected", "LocalTrackPublished", "LocalTrackUnpublished"].map(name => [name, name])) },
  }, {
    Date: { now: () => now }, AbortController,
    window: { setInterval: (fn: () => void, duration: number) => { timers.set(duration, fn); return duration }, clearInterval: () => {}, setTimeout: () => 1, clearTimeout: () => {} },
    fetch: () => new Promise<Response>(resolve => { resolveRequest = resolve }),
  })
  loaded.default({ token: "join-token", serverUrl: "wss://test.invalid" })
  assert.equal(history[0].all, false)
  assert.equal(history[0].permissions.length, 0)
  const cleanup = effects[0]()
  const grant = () => Response.json({ permissions: [{ participantIdentity: "viewer", allowAll: false, allowedTrackSids: ["mic"] }], policyToken: "read-only-policy-token" })
  resolveRequest!(grant())
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(history.at(-1)?.permissions[0].allowedTrackSids[0], "mic")
  now = 7001
  timers.get(250)!()
  assert.equal(history.at(-1)?.permissions.length, 0)
  timers.get(1500)!()
  events.get("Reconnecting")!()
  resolveRequest!(grant())
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(history.at(-1)?.permissions.length, 0)
  assert.equal(history.every(call => call.all === false), true)
  cleanup()
})

test("stage actions preserve publisher protection metadata instead of replacing it", async () => {
  for (const action of ["add_to_stage", "remove_from_stage"]) {
    let updated: Record<string, unknown> = {}
    const route = load<{ POST: (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response> }>("app/api/admin/events/[id]/live/stage/route.ts", {
      "next/server": { NextResponse: { json: (data: unknown, init: ResponseInit) => Response.json(data, init) } },
      "livekit-server-sdk": { RoomServiceClient: class {
        async getParticipant() { return { metadata: JSON.stringify({ publisherPolicyVersion: 1, role: "presenter", eventId: "event" }) } }
        async updateParticipant(_room: string, _identity: string, metadata: string) { updated = JSON.parse(metadata) }
      } },
      "@/lib/eventTeamAccess": { requireEventOperatorAccess: async () => ({ eventId: "event", user: { id: "operator", email: "operator@example.test" } }) },
      "@/lib/live/stageState": { applyProducerStageAction: async () => ({}), ensureEventLiveRoom: async () => ({ room_name: "event_event" }) },
      "@/lib/supabase/admin": { supabaseAdmin: {} },
    }, { process: { env: { LIVEKIT_URL: "wss://test.invalid", LIVEKIT_API_KEY: "test", LIVEKIT_API_SECRET: "test" } }, crypto: { randomUUID: () => "test-command" } })
    const response = await route.POST(new Request("https://example.test", { method: "POST", body: JSON.stringify({ action, participantId: "presenter" }) }), { params: Promise.resolve({ id: "event" }) })
    assert.equal(response.status, 200)
    assert.deepEqual(updated, { publisherPolicyVersion: 1, role: "presenter", eventId: "event", onStage: action === "add_to_stage" })
  }
})
