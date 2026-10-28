import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import test from "node:test"
import { commitProductionCommand } from "../lib/production/commandService.ts"
import { ProductionError, type BroadcastScope, type CommandRequest, type ProductionCommand } from "../lib/production/contracts.ts"
import { importLegacyComposition } from "../lib/production/legacyComposition.ts"
import { LocalSqliteProductionStore } from "../lib/production/localSqliteStore.ts"
import { createLocalProductionGateway } from "../lib/production/localGateway.ts"
import { playbackPositionAt, transitionProgressAt } from "../lib/production/timeline.ts"

const scope: BroadcastScope = { broadcastId: "broadcast-one", eventId: "event-one", sessionId: "session-one" }

function fixture(t: { after: (fn: () => void) => void }) {
  const store = new LocalSqliteProductionStore(":memory:")
  store.initialize(scope, 1000)
  t.after(() => store.close())
  function request(command: ProductionCommand, expectedRevision = store.read(scope).revision): CommandRequest {
    return { schemaVersion: 1, scope, commandId: randomUUID(), expectedRevision, command }
  }
  function commit(command: ProductionCommand, now = 2000) {
    return commitProductionCommand(store, request(command), { actorId: "producer-a", scope }, now)
  }
  function source(sourceId = "camera-a") {
    return commit({ type: "REGISTER_SOURCE", source: { sourceId, label: sourceId, kind: "camera", fallback: "slate" } })
  }
  return { store, request, commit, source }
}

function code(expected: string) {
  return (error: unknown) => error instanceof ProductionError && error.code === expected
}

test("TAKE copies only committed Preview, preserves Program isolation and does not go live", t => {
  const f = fixture(t); f.source()
  f.commit({ type: "SET_PREVIEW", composition: { sceneId: null, layers: [{ id: "cam", kind: "camera", sourceId: "camera-a", props: { hidden: false, glow: 4 } }] } })
  assert.equal(f.store.read(scope).program.composition.layers.length, 0)
  const taken = f.commit({ type: "TAKE", transition: { type: "fade", durationMs: 500 } }, 5000)
  assert.equal(taken.currentState.program.composition.layers[0].sourceId, "camera-a")
  assert.equal(taken.currentState.desiredLifecycle, "off-air")
  assert.equal(taken.engine, null)
  assert.equal(transitionProgressAt(taken.currentState, 5250), 0.5)
  f.commit({ type: "SET_PREVIEW", composition: { sceneId: null, layers: [] } })
  assert.equal(f.store.read(scope).program.composition.layers.length, 1)
  taken.currentState.program.composition.layers[0].props.glow = 90
  assert.equal(f.store.read(scope).program.composition.layers[0].props.glow, 4)
})

test("stale producer commands do not overwrite a newer snapshot or consume a revision", t => {
  const f = fixture(t)
  const a = f.request({ type: "SET_LIVE", live: true }, 0)
  const b = f.request({ type: "SET_LIVE", live: false }, 0)
  commitProductionCommand(f.store, a, { actorId: "producer-a", scope })
  assert.throws(() => commitProductionCommand(f.store, b, { actorId: "producer-b", scope }), code("REVISION_CONFLICT"))
  assert.equal(f.store.read(scope).revision, 1)
  assert.equal(f.store.read(scope).desiredLifecycle, "live")
  assert.equal(f.store.commands(scope).length, 1)
})

test("identical retries return one receipt and current state rather than rewinding the console", t => {
  const f = fixture(t)
  const input = f.request({ type: "SET_LIVE", live: true })
  const actor = { actorId: "producer-a", scope }
  const first = commitProductionCommand(f.store, input, actor, 5000)
  f.commit({ type: "SET_LIVE", live: false })
  const retry = commitProductionCommand(f.store, structuredClone(input), actor, 9000)
  assert.equal(retry.replayed, true)
  assert.deepEqual(retry.receipt, first.receipt)
  assert.equal(retry.currentState.revision, 2)
  assert.equal(retry.currentState.desiredLifecycle, "off-air")
  assert.equal(f.store.commands(scope).length, 2)
  assert.throws(() => commitProductionCommand(f.store, { ...input, command: { type: "SET_LIVE", live: false } }, actor), code("COMMAND_ID_REUSED"))
  assert.throws(() => commitProductionCommand(f.store, input, { actorId: "producer-b", scope }), code("COMMAND_ID_REUSED"))
})

test("event/session authorization is checked before returning an idempotent receipt", t => {
  const f = fixture(t); const input = f.request({ type: "SET_LIVE", live: true })
  commitProductionCommand(f.store, input, { actorId: "producer-a", scope })
  const other = { ...scope, sessionId: "another-session" }
  assert.throws(() => commitProductionCommand(f.store, input, { actorId: "producer-a", scope: other }), code("SCOPE_MISMATCH"))
  assert.throws(() => f.store.read(other), code("SCOPE_MISMATCH"))
  assert.throws(() => f.store.initialize(other), code("SCOPE_MISMATCH"))
  assert.equal(f.store.read(scope).revision, 1)
})

test("source rebinding preserves scene references and ignores an old disconnect generation", t => {
  const f = fixture(t); f.source()
  f.commit({ type: "SET_PREVIEW", composition: { sceneId: null, layers: [{ id: "cam", kind: "camera", sourceId: "camera-a", props: {} }] } })
  f.commit({ type: "TAKE", transition: { type: "cut", durationMs: 0 } })
  f.commit({ type: "BIND_SOURCE", sourceId: "camera-a", participantIdentity: "presenter-old", trackSid: "track-old" })
  f.commit({ type: "UNBIND_SOURCE", sourceId: "camera-a", expectedGeneration: 1 })
  f.commit({ type: "BIND_SOURCE", sourceId: "camera-a", participantIdentity: "presenter-new", trackSid: "track-new" })
  assert.equal(f.store.read(scope).bindings["camera-a"]?.generation, 2)
  assert.throws(() => f.commit({ type: "UNBIND_SOURCE", sourceId: "camera-a", expectedGeneration: 1 }), code("BINDING_CONFLICT"))
  assert.equal(f.store.read(scope).bindings["camera-a"]?.trackSid, "track-new")
  assert.equal(f.store.read(scope).program.composition.layers[0].sourceId, "camera-a")
})

test("saved scene versions exclude bindings, running clocks and live state", t => {
  const f = fixture(t); f.source()
  f.commit({ type: "SET_PREVIEW", composition: { sceneId: null, layers: [{ id: "clip", kind: "video", sourceId: null, props: { assetId: "asset-one", src: "https://example.test/clip.mp4", rotation: 12, blendMode: "screen" } }] } })
  f.commit({ type: "SET_PLAYBACK", bus: "preview", layerId: "clip", positionMs: 400, paused: false, loop: true }, 3000)
  f.commit({ type: "SAVE_SCENE", sceneId: "opening", name: "Opening", expectedSceneVersion: null })
  f.commit({ type: "TAKE", transition: { type: "cut", durationMs: 0 } })
  const program = f.store.read(scope).program
  assert.equal(playbackPositionAt(program.playback.clip, 3500), 900)
  f.commit({ type: "SET_PREVIEW", composition: { sceneId: null, layers: [] } })
  f.commit({ type: "LOAD_SCENE", sceneId: "opening", sceneVersion: 1 })
  const current = f.store.read(scope)
  assert.deepEqual(current.program, program)
  assert.deepEqual(current.preview.playback, {})
  assert.equal(current.preview.composition.layers[0].props.rotation, 12)
  assert.deepEqual(Object.keys(current.scenes.opening).sort(), ["audio", "composition", "name", "sceneId", "version"])
  assert.throws(() => f.commit({ type: "SAVE_SCENE", sceneId: "opening", name: "Overwrite", expectedSceneVersion: null }), code("SCENE_CONFLICT"))
  assert.throws(() => f.commit({ type: "LOAD_SCENE", sceneId: "opening", sceneVersion: 2 }), code("SCENE_CONFLICT"))
})

test("audio intent is independent of visible layers and changes only its selected bus", t => {
  const f = fixture(t); f.source()
  const audio = { masterGainDb: -9, muted: true, channels: [{ sourceId: "camera-a", gainDb: -3, muted: false, solo: true }] }
  f.commit({ type: "SET_AUDIO", bus: "program", audio })
  assert.deepEqual(f.store.read(scope).program.audio, audio)
  assert.equal(f.store.read(scope).preview.audio.muted, false)
  assert.equal(f.store.read(scope).program.composition.layers.length, 0)
})

test("strict command validation rejects missing revisions, forged actors, unsafe IDs and oversized lists", t => {
  const f = fixture(t)
  const valid = f.request({ type: "SET_LIVE", live: true })
  for (const input of [
    { ...valid, expectedRevision: undefined }, { ...valid, expectedRevision: "0" },
    { ...valid, expectedRevision: -1 }, { ...valid, expectedRevision: 0.2 },
    { ...valid, schemaVersion: 2 }, { ...valid, actorId: "forged" },
    { ...valid, command: { type: "SET_LIVE", live: "true" } },
    { ...valid, command: { type: "REPORT_ENGINE", observedRevision: 1 } },
    { ...valid, command: { type: "TAKE", transition: { type: "cut", durationMs: 500 } } },
    { ...valid, command: { type: "REGISTER_SOURCE", source: { sourceId: "constructor", label: "Bad", kind: "camera", fallback: "slate" } } },
    { ...valid, command: { type: "SET_PREVIEW", composition: { sceneId: null as null, layers: Array.from({ length: 201 }, () => ({})) } } },
    { ...valid, command: { type: "SET_AUDIO", bus: "program", audio: { masterGainDb: 999, muted: false, channels: [] as unknown[] } } },
  ]) assert.throws(() => commitProductionCommand(f.store, input, { actorId: "producer-a", scope }), code("INVALID_COMMAND"))
  assert.equal(f.store.read(scope).revision, 0)
  assert.equal(f.store.commands(scope).length, 0)
})

test("unknown or mismatched source references are rejected without partial state", t => {
  const f = fixture(t); f.source()
  assert.throws(() => f.commit({ type: "SET_PREVIEW", composition: { sceneId: null, layers: [{ id: "x", kind: "camera", sourceId: "unknown", props: {} }] } }), code("SOURCE_NOT_FOUND"))
  assert.throws(() => f.commit({ type: "SET_PREVIEW", composition: { sceneId: null, layers: [{ id: "x", kind: "screen", sourceId: "camera-a", props: {} }] } }), code("INVALID_COMMAND"))
  assert.equal(f.store.read(scope).revision, 1)
})

test("legacy import preserves graphic properties without persisting ephemeral track bindings", () => {
  const blocks = [{ id: "cam", type: "camera-slot", assignedParticipantId: "old-presenter", assignedTrackSid: "old-track", rotation: 23, glow: 6, hidden: true, x: 40, animationType: "push-left" }]
  const imported = importLegacyComposition(blocks, { "old-presenter": "camera-a" })
  assert.equal(imported.layers[0].sourceId, "camera-a")
  assert.equal(imported.layers[0].props.rotation, 23)
  assert.equal(imported.layers[0].props.hidden, true)
  assert.equal("assignedTrackSid" in imported.layers[0].props, false)
  assert.throws(() => importLegacyComposition(blocks, {}), code("INVALID_COMMAND"))
  assert.throws(() => importLegacyComposition([{ id: "blob", type: "video", src: "blob:local-only" }], {}), code("INVALID_COMMAND"))
})

test("playback intent reconstructs elapsed, paused and looping positions", () => {
  const intent = { positionMs: 500, anchorTimeMs: 1000, paused: false, loop: true }
  assert.equal(playbackPositionAt(intent, 3500), 3000)
  assert.equal(playbackPositionAt(intent, 3500, 2000), 1000)
  assert.equal(playbackPositionAt({ ...intent, paused: true }, 3500), 500)
  assert.equal(playbackPositionAt({ ...intent, loop: false }, 3500, 2000), 2000)
})

test("semantic retries are independent of JSON property order", t => {
  const f = fixture(t)
  const input = f.request({ type: "REGISTER_SOURCE", source: { sourceId: "cam-a", label: "Camera A", kind: "camera", fallback: "slate" } })
  const actor = { actorId: "producer-a", scope }
  const result = commitProductionCommand(f.store, input, actor)
  const reordered = { command: { source: { fallback: "slate", kind: "camera", label: "Camera A", sourceId: "cam-a" }, type: "REGISTER_SOURCE" }, expectedRevision: 0, commandId: input.commandId, scope: { sessionId: scope.sessionId, eventId: scope.eventId, broadcastId: scope.broadcastId }, schemaVersion: 1 }
  const retry = commitProductionCommand(f.store, reordered, actor)
  assert.equal(retry.replayed, true)
  assert.equal(retry.receipt.fingerprint, result.receipt.fingerprint)
})

test("oversized JSON, duplicate channels and prototype-like IDs cannot corrupt state", t => {
  const f = fixture(t); f.source()
  const valid = f.request({ type: "SET_LIVE", live: true })
  const huge = { ...valid, command: { type: "SET_PREVIEW", composition: { sceneId: null as null, layers: [{ id: "text", kind: "text", sourceId: null as null, props: { content: "x".repeat(2_000_000) } }] } } }
  assert.throws(() => commitProductionCommand(f.store, huge, { actorId: "producer-a", scope }), code("INVALID_COMMAND"))
  assert.throws(() => f.commit({ type: "SAVE_SCENE", sceneId: "toString", name: "Bad", expectedSceneVersion: null }), code("INVALID_COMMAND"))
  const channel = { sourceId: "camera-a", gainDb: 0, muted: false, solo: false }
  assert.throws(() => f.commit({ type: "SET_AUDIO", bus: "program", audio: { masterGainDb: 0, muted: false, channels: [channel, channel] } }), code("INVALID_COMMAND"))
  assert.equal(f.store.read(scope).revision, 1)
})

test("placeholder layers are valid and source bindings accept opaque LiveKit identities", t => {
  const f = fixture(t); f.source()
  f.commit({ type: "BIND_SOURCE", sourceId: "camera-a", participantIdentity: "presenter@example.test", trackSid: "TR_opaque" })
  f.commit({ type: "SET_PREVIEW", composition: { sceneId: null, layers: [{ id: "placeholder", kind: "camera", sourceId: null, props: { placeholderLabel: "Next presenter" } }] } })
  assert.equal(f.store.read(scope).bindings["camera-a"]?.participantIdentity, "presenter@example.test")
})

test("async gateway scopes reads and replay without inventing renderer acknowledgements", async t => {
  const f = fixture(t); const gateway = createLocalProductionGateway(f.store)
  const actor = { actorId: "producer-a", scope }
  await gateway.commit(f.request({ type: "SET_LIVE", live: true }), actor)
  const snapshot = await gateway.read(scope, actor)
  assert.equal(snapshot.state.revision, 1)
  assert.equal(snapshot.engine, null)
  assert.equal((await gateway.commands(scope, actor)).length, 1)
  const foreign = { actorId: "producer-b", scope: { ...scope, sessionId: "foreign-session" } }
  await assert.rejects(() => gateway.read(scope, foreign), code("SCOPE_MISMATCH"))
  await assert.rejects(() => gateway.commands(scope, foreign), code("SCOPE_MISMATCH"))
})
