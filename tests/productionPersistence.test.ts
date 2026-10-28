import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { once } from "node:events"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { DatabaseSync } from "node:sqlite"
import { Worker } from "node:worker_threads"
import test from "node:test"
import { commitProductionCommand } from "../lib/production/commandService.ts"
import { LocalSqliteProductionStore } from "../lib/production/localSqliteStore.ts"
import type { BroadcastScope, CommandRequest } from "../lib/production/contracts.ts"
import type { ProductionCommand } from "../lib/production/contracts.ts"

const scope: BroadcastScope = { broadcastId: "broadcast-one", eventId: "event-one", sessionId: "session-one" }

function pathFor(t: { after: (fn: () => void) => void }): string {
  const dir = mkdtempSync(join(tmpdir(), "jupiter-production-"))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  return join(dir, "production.sqlite")
}

function request(commandId = randomUUID()): CommandRequest {
  return { schemaVersion: 1, scope, commandId, expectedRevision: 0, command: { type: "SET_LIVE", live: true } }
}

test("reopening the store restores snapshot, original receipt and ordered replay cursor", t => {
  const filename = pathFor(t)
  let store = new LocalSqliteProductionStore(filename)
  store.initialize(scope)
  const input = request(); const actor = { actorId: "producer-a", scope }
  commitProductionCommand(store, input, actor, 1000)
  store.close()
  store = new LocalSqliteProductionStore(filename)
  try {
    assert.equal(store.read(scope).desiredLifecycle, "live")
    assert.equal(store.read(scope).revision, 1)
    assert.equal(commitProductionCommand(store, input, actor).replayed, true)
    commitProductionCommand(store, { ...request(), expectedRevision: 1, command: { type: "SET_LIVE", live: false } }, actor)
    assert.deepEqual(store.commands(scope, 1).map(item => item.revision), [2])
    const other = { ...scope, broadcastId: "broadcast-two", sessionId: "session-two" }
    store.initialize(other)
    assert.equal(store.read(other).revision, 0)
    assert.equal(store.commands(other).length, 0)
  } finally { store.close() }
})

test("snapshot update rolls back if command log insertion fails", t => {
  const filename = pathFor(t); const store = new LocalSqliteProductionStore(filename)
  t.after(() => store.close()); store.initialize(scope)
  const db = new DatabaseSync(filename)
  db.exec("CREATE TRIGGER force_log_failure BEFORE INSERT ON production_commands BEGIN SELECT RAISE(ABORT, 'simulated disk/log failure'); END;")
  db.close()
  assert.throws(() => commitProductionCommand(store, request(), { actorId: "producer-a", scope }), /simulated disk\/log failure/)
  assert.equal(store.read(scope).revision, 0)
  assert.equal(store.read(scope).desiredLifecycle, "off-air")
  assert.equal(store.commands(scope).length, 0)
})

async function contend(filename: string, sameCommand: boolean) {
  const input = request()
  const workers = [0, 1].map(index => new Worker(new URL("./fixtures/productionContender.ts", import.meta.url), {
    execArgv: ["--experimental-strip-types"],
    workerData: { filename, scope, actorId: sameCommand ? "producer-a" : `producer-${index}`, request: index === 0 || sameCommand ? input : request() },
  }))
  try {
    await Promise.all(workers.map(worker => once(worker, "message")))
    const results = workers.map(worker => once(worker, "message"))
    for (const worker of workers) worker.postMessage("commit")
    return (await Promise.all(results)).map(([result]) => result as { revision?: number; code?: string; replayed?: boolean })
  } finally { await Promise.all(workers.map(worker => worker.terminate())) }
}

test("two independent SQLite connections serialize simultaneous producers", { timeout: 15000 }, async t => {
  const filename = pathFor(t); const store = new LocalSqliteProductionStore(filename)
  t.after(() => store.close()); store.initialize(scope)
  const results = await contend(filename, false)
  assert.equal(results.filter(result => result.revision === 1).length, 1)
  assert.equal(results.filter(result => result.code === "REVISION_CONFLICT").length, 1)
  assert.equal(store.read(scope).revision, 1)
  assert.equal(store.commands(scope).length, 1)
})

test("simultaneous identical retries commit once and return the same revision", { timeout: 15000 }, async t => {
  const filename = pathFor(t); const store = new LocalSqliteProductionStore(filename)
  t.after(() => store.close()); store.initialize(scope)
  const results = await contend(filename, true)
  assert.deepEqual(results.map(result => result.revision), [1, 1])
  assert.equal(results.filter(result => result.replayed).length, 1)
  assert.equal(store.commands(scope).length, 1)
})

test("a second producer restores complete Program, audio, source, scene and playback state", t => {
  const filename = pathFor(t)
  let store = new LocalSqliteProductionStore(filename); store.initialize(scope)
  function commit(command: ProductionCommand) {
    return commitProductionCommand(store, { schemaVersion: 1, scope, commandId: randomUUID(), expectedRevision: store.read(scope).revision, command }, { actorId: "producer-a", scope }, 1000)
  }
  commit({ type: "REGISTER_SOURCE", source: { sourceId: "camera-a", label: "Main", kind: "camera", fallback: "slate" } })
  commit({ type: "BIND_SOURCE", sourceId: "camera-a", participantIdentity: "presenter-a", trackSid: "track-a" })
  commit({ type: "SET_PREVIEW", composition: { sceneId: null, layers: [{ id: "clip", kind: "video", sourceId: null, props: { assetId: "clip-asset", hidden: false } }] } })
  commit({ type: "SET_AUDIO", bus: "preview", audio: { masterGainDb: -12, muted: false, channels: [{ sourceId: "camera-a", gainDb: -4, muted: false, solo: false }] } })
  commit({ type: "SET_PLAYBACK", bus: "preview", layerId: "clip", positionMs: 3500, paused: false, loop: true })
  commit({ type: "SAVE_SCENE", sceneId: "opening", name: "Opening", expectedSceneVersion: null })
  commit({ type: "TAKE", transition: { type: "fade", durationMs: 500 } })
  commit({ type: "SET_LIVE", live: true })
  const before = store.read(scope)
  store.close(); store = new LocalSqliteProductionStore(filename)
  try {
    assert.deepEqual(store.read(scope), before)
    const handedOff = commitProductionCommand(store, { ...request(), expectedRevision: before.revision, command: { type: "SET_AUDIO", bus: "program", audio: { ...before.program.audio, muted: true } } }, { actorId: "producer-b", scope })
    assert.equal(handedOff.currentState.desiredLifecycle, "live")
    assert.equal(handedOff.currentState.program.audio.muted, true)
    assert.equal(handedOff.currentState.program.playback.clip.positionMs, 3500)
    assert.equal(handedOff.receipt.actorId, "producer-b")
  } finally { store.close() }
})
