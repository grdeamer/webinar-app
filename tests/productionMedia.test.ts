import assert from "node:assert/strict"
import test from "node:test"
import { TokenVerifier } from "livekit-server-sdk"
import { mediaIsFresh, parseMediaReport, updateMediaProgress } from "../lib/production/mediaHealth.ts"
import { LocalMediaSession } from "../lib/production/localMediaSession.ts"
import { LocalSqliteProductionStore } from "../lib/production/localSqliteStore.ts"
import { LOCAL_SCOPE, seedLocalProduction } from "../lib/production/localWorkbench.ts"

function sample(overrides: Record<string, unknown> = {}) {
  return parseMediaReport({ appliedRevision: 3, framesRendered: 30, framesSent: 25, audioPackets: 50, decodedFrames: 24, decodedRevision: 3, markerFrame: 25, width: 1280, height: 720, error: null, ...overrides })
}

test("heartbeat-only updates cannot keep a stalled Program healthy", () => {
  const first = updateMediaProgress(null, sample(), 1000, true)
  assert.equal(mediaIsFresh(first, 1500), true)
  const heartbeat = updateMediaProgress(first, sample(), 6000, true)
  assert.equal(heartbeat.reportedAtMs, 6000)
  assert.equal(heartbeat.progressedAtMs, 1000)
  assert.equal(mediaIsFresh(heartbeat, 6000), false)
  const duplicatePicture = updateMediaProgress(first, sample({ decodedFrames: 50 }), 6000, true)
  assert.equal(mediaIsFresh(duplicatePicture, 6000), false)
})

test("decoder progress requires a changing Program marker; send and receive rates remain separate", () => {
  const first = updateMediaProgress(null, sample(), 1000, true)
  const next = updateMediaProgress(first, sample({ decodedFrames: 51, markerFrame: 60 }), 2000, true)
  assert.equal(next.fps, 27)
  assert.equal(next.report.framesSent, 25)
  assert.throws(() => updateMediaProgress(next, sample({ decodedFrames: 5 }), 3000, true), /backwards/)
  assert.throws(() => sample({ framesSent: "30" }), /counter/)
  assert.throws(() => sample({ inputFrames: JSON.parse('{"__proto__":1}') }), /input counter/)
})

test("an old receiver generation cannot acknowledge a recovered renderer", t => {
  const store = new LocalSqliteProductionStore(":memory:"); t.after(() => store.close()); seedLocalProduction(store)
  const session = new LocalMediaSession(store)
  const revision = store.read(LOCAL_SCOPE).revision
  session.report("renderer", sample({ appliedRevision: revision, decodedRevision: null }))
  session.report("observer", sample({ appliedRevision: revision, decodedRevision: revision, generation: 1 }))
  assert.equal(session.observation().status, "healthy")
  session.generation = 2
  assert.equal(session.observation().status, "degraded")
  assert.equal(session.observation().observedRevision, null)
  assert.equal(session.observation().audioSamplesSent, null)
})

test("local viewer tokens cannot publish or join the contribution room", async t => {
  const store = new LocalSqliteProductionStore(":memory:"); t.after(() => store.close()); seedLocalProduction(store)
  const session = new LocalMediaSession(store)
  const verifier = new TokenVerifier(session.apiKey, session.apiSecret)
  const viewer = await verifier.verify((await session.token("viewer", null)).token)
  assert.equal(viewer.video?.room, session.programRoom)
  assert.equal(viewer.video?.canPublish, false)
  assert.equal(viewer.video?.canSubscribe, true)
  const output = await verifier.verify((await session.token('renderer-output', session.caps.renderer)).token)
  assert.equal(output.video?.canSubscribe, false)
  assert.ok(viewer.exp! - Math.floor(Date.now() / 1000) <= 120)
  const source = await verifier.verify((await session.token("source-a", session.caps["source-a"])).token)
  assert.equal(source.video?.room, session.inputRoom)
  assert.equal(source.video?.canSubscribe, false)
  await assert.rejects(() => session.token("renderer-output", null), /capability/)
  await assert.rejects(() => session.token("arbitrary-room", session.caps.renderer), /Unknown/)
  const publicData = JSON.stringify(session.publicStatus())
  for (const secret of [...Object.values(session.caps), session.apiSecret]) assert.equal(publicData.includes(secret), false)
})

test('runtime capabilities are revoked on rotation, stop and expiry', t => {
  const store = new LocalSqliteProductionStore(':memory:'); t.after(() => store.close()); seedLocalProduction(store)
  const session = new LocalMediaSession(store), previous = session.caps.renderer
  assert.equal(session.authorized('renderer', previous), true)
  session.rotateCapability('renderer')
  assert.equal(session.authorized('renderer', previous), false)
  assert.equal(session.authorized('renderer', 'é'.repeat(64)), false)
  assert.equal(session.credentialEpochs.renderer, 2)
  session.running = false
  assert.equal(session.authorized('renderer', session.caps.renderer), false)
})

test("sources rebind under stable logical IDs; media reports cannot acknowledge future state", t => {
  const store = new LocalSqliteProductionStore(":memory:"); t.after(() => store.close()); seedLocalProduction(store)
  const session = new LocalMediaSession(store)
  session.sourceReady("source-a", { frames: 10, videoTrackSid: "TR_old" })
  const revision = store.read(LOCAL_SCOPE).revision
  session.sourceReady("source-a", { frames: 20, videoTrackSid: "TR_old" })
  assert.equal(store.read(LOCAL_SCOPE).revision, revision)
  session.sourceReady("source-a", { frames: 30, videoTrackSid: "TR_new" })
  assert.equal(store.read(LOCAL_SCOPE).bindings["camera-a"]?.generation, 2)
  assert.throws(() => session.report("renderer", sample({ appliedRevision: 999 })), /future/)
  assert.equal(session.observation().status, "starting")
  session.running = false
  assert.equal(session.observation().status, "stopped")
})
