import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { LocalDelivery } from '../lib/production/localDelivery.ts'
import { LOCAL_SCOPE, createLocalWorkbench, seedLocalProduction } from '../lib/production/localWorkbench.ts'
import { LocalSqliteProductionStore } from '../lib/production/localSqliteStore.ts'
import { LocalMediaSession } from '../lib/production/localMediaSession.ts'
import { LocalMediaRoutes } from '../lib/production/localMediaRoutes.ts'
import { once } from 'node:events'
import { TokenVerifier } from 'livekit-server-sdk'
import { LocalDeliveryProbe } from '../lib/production/localDeliveryProbe.ts'

test('local delivery defaults to legacy, requires readiness, uses scoped CAS and survives restart', t => {
  const dir = mkdtempSync(join(tmpdir(), 'jupiter-delivery-')); t.after(() => rmSync(dir, { recursive: true, force: true }))
  const path = join(dir, 'delivery.json'), policy = new LocalDelivery(path, LOCAL_SCOPE)
  assert.equal(policy.state.mode, 'legacy')
  const request = { scope: LOCAL_SCOPE, expectedRevision: 0, commandId: 'cutover', mode: 'program' }
  assert.throws(() => policy.select(request, false), /observed Program/)
  const selected = policy.select(request, true); assert.equal(selected.mode, 'program'); assert.equal(selected.revision, 1)
  assert.equal(policy.select(request, false).revision, 1, 'Idempotent replay does not repeat a cutover')
  assert.throws(() => policy.select({ ...request, mode: 'legacy' }, true), /reused/)
  assert.throws(() => policy.select({ ...request, commandId: 'stale' }, true), /refresh/)
  assert.throws(() => policy.select({ ...request, commandId: 'wrong-event', scope: { ...LOCAL_SCOPE, eventId: 'another' }, expectedRevision: 1 }, true), /another local event/)
  const restored = new LocalDelivery(path, LOCAL_SCOPE); assert.equal(restored.state.mode, 'program')
  const rollback = restored.select({ ...request, commandId: 'rollback', expectedRevision: 1, mode: 'legacy' }, false)
  assert.equal(rollback.mode, 'legacy'); assert.equal(rollback.revision, 2)
})

test('audience credentials are Program-only and cannot publish or subscribe to source inputs', async t => {
  const store = new LocalSqliteProductionStore(':memory:'); t.after(() => store.close()); seedLocalProduction(store)
  const session = new LocalMediaSession(store), token = await session.token('audience', null)
  const grant = await new TokenVerifier(session.apiKey, session.apiSecret).verify(token.token)
  assert.equal(grant.video?.room, session.programRoom); assert.notEqual(grant.video?.room, session.inputRoom)
  assert.equal(grant.video?.canPublish, false); assert.equal(grant.video?.canPublishData, false); assert.equal(grant.video?.canSubscribe, true)
  assert.ok(grant.exp! - Math.floor(Date.now() / 1000) <= 120)
})

test('a stopped acceptance receiver cannot keep advertising a live audience subscription', async () => {
  const probe = new LocalDeliveryProbe()
  probe.accept({ state: 'live', frames: 10, revisions: [1], publisherIdentity: 'program-engine-1', videoTrackSid: 'TR_video', audioTrackSid: 'TR_audio', audioRms: .01, maxAudioRms: .01, contentSources: ['camera-a'], width: 1280, height: 720, ended: false, atMs: 0 })
  await probe.stop()
  assert.notEqual(probe.report?.state, 'live'); assert.equal(probe.report?.videoTrackSid, null); assert.equal(probe.authorized('anything'), false)
})

test('local audience bootstrap fails closed before cutover and generic bootstrap cannot bypass it', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'jupiter-delivery-api-')); t.after(() => rmSync(dir, { recursive: true, force: true }))
  const store = new LocalSqliteProductionStore(':memory:'); seedLocalProduction(store)
  const routes = new LocalMediaRoutes(new LocalMediaSession(store), join(dir, 'recordings'))
  const server = createLocalWorkbench(store, routes); server.listen(0, '127.0.0.1'); await once(server, 'listening')
  const address = server.address(); assert.ok(address && typeof address !== 'string'); const base = `http://127.0.0.1:${address.port}`
  try {
    const policy = await (await fetch(base + '/api/media/delivery')).json(); assert.equal(policy.mode, 'legacy')
    const post = (path: string, body: unknown, headers: Record<string, string> = {}) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) })
    assert.equal((await post('/api/media/audience-token', {})).status, 400)
    assert.equal((await post('/api/media/token', { role: 'audience' })).status, 400)
    assert.equal((await post('/api/media/delivery', { ...policy, expectedRevision: 0, commandId: 'cutover', mode: 'program' })).status, 400)
    assert.equal((await post('/api/media/delivery-record', { action: 'start' }, { 'X-Jupiter-Local': 'phase5' })).status, 400)
    const audience = await fetch(base + '/audience'); assert.equal(audience.status, 200)
    assert.match(await audience.text(), /does not compose sources or record/)
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); store.close() }
})
