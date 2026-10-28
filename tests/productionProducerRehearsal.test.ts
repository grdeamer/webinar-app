import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer, request } from 'node:http'
import { once } from 'node:events'
import { LocalHaRuntime } from '../lib/production/localHaRuntime.ts'
import { LocalProducerRehearsal, rehearsalCommandAllowed } from '../lib/production/localProducerRehearsal.ts'
import { LOCAL_SCOPE } from '../lib/production/localWorkbench.ts'

test('rehearsal keeps recording-producing assets and infrastructure commands outside operator control', () => {
  assert.throws(() => rehearsalCommandAllowed({ type: 'REGISTER_SOURCE', source: { sourceId: 'x', kind: 'camera', label: 'x', fallback: 'slate' } }), /supports/)
  assert.throws(() => rehearsalCommandAllowed({ type: 'SET_PREVIEW', composition: { sceneId: null, layers: [{ id: 'clip', kind: 'video', sourceId: null, props: { assetId: 'motion-clip' } }] } }), /ephemeral/)
  assert.throws(() => rehearsalCommandAllowed({ type: 'TAKE', transition: { type: 'warp', durationMs: 500 } }), /cut\/fade/)
  assert.doesNotThrow(() => rehearsalCommandAllowed({ type: 'SET_PREVIEW', composition: { sceneId: null, layers: [{ id: 'a', kind: 'camera', sourceId: 'camera-a', props: {} }] } }))
})
test('local producer API scopes viewer grants, capture ownership, stale commands and origin checks', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'producer-rehearsal-')), runtime = new LocalHaRuntime(directory, { rehearsal: true }), producer = new LocalProducerRehearsal(runtime)
  runtime.running = true // Protocol test only. No browser/device/SFU is started.
  runtime.replaceDemoSource = async () => {}
  runtime.sourcePublication = async (_role, sid) => sid === 'TR_owned'
  const server = createServer(async (req, res) => { if (!await producer.handle(req, res)) await runtime.handle(req, res) }); server.listen(0, '127.0.0.1'); await once(server, 'listening')
  t.after(async () => { await producer.stop(); server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); runtime.store.close(); rmSync(directory, { recursive: true, force: true }) })
  const address = server.address(); assert.ok(address && typeof address !== 'string')
  const call = (path: string, body?: Record<string, unknown>, headers: Record<string, string> = {}) => new Promise<{ status: number; value: Record<string, unknown> }>((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port: address.port, path, method: body ? 'POST' : 'GET', headers: { Host: '127.0.0.1:4311', 'Content-Type': 'application/json', 'X-Jupiter-Local': 'producer-rehearsal', ...headers } }, res => { let text = ''; res.on('data', x => { text += x }); res.on('end', () => resolve({ status: res.statusCode!, value: JSON.parse(text) })) }); req.on('error', reject); req.end(body ? JSON.stringify({ runId: runtime.runId, ...body }) : undefined)
  })
  const claims = (token: unknown) => JSON.parse(Buffer.from(String(token).split('.')[1], 'base64url').toString())
  for (const room of ['input', 'program']) { const x = await call('/api/producer/viewer', { room }); assert.equal(x.status, 200); const c = claims(x.value.token); assert.equal(c.video.room, runtime.rooms[room as 'input' | 'program']); assert.equal(c.video.canPublish, false); assert.equal(c.video.canPublishData, false); assert.equal(c.video.canSubscribe, true) }
  assert.equal((await call('/api/producer/viewer', { room: 'candidates' })).status, 400)
  assert.equal((await call('/api/producer/status', undefined, { Origin: 'https://example.com' })).status, 400)
  assert.equal((await call('/api/producer/viewer', { runId: 'old', room: 'input' })).status, 400)
  const claimed = await call('/api/producer/input', { action: 'claim', role: 'source-a', kind: 'camera' }); assert.equal(claimed.status, 200)
  const c = claims(claimed.value.token); assert.equal(c.video.room, runtime.rooms.input); assert.equal(c.video.canSubscribe, false); assert.equal(c.sub, 'source-camera-a')
  assert.equal((await call('/api/producer/input', { action: 'claim', role: 'source-a', kind: 'camera' })).status, 400)
  const cap = { 'X-Input-Capability': String(claimed.value.capability) }
  assert.equal((await call('/api/producer/input', { action: 'report', role: 'source-a', frames: 1, videoTrackSid: 'TR_foreign' }, cap)).status, 400)
  assert.equal((await call('/api/producer/input', { action: 'report', role: 'source-a', frames: 1, videoTrackSid: 'TR_owned', encoding: { width: 1920, height: 1080 } }, cap)).status, 200)
  assert.equal(runtime.store.read(LOCAL_SCOPE).bindings['camera-a']?.trackSid, 'TR_owned')
  assert.equal((await call('/api/producer/input', { action: 'stop', role: 'source-a' })).status, 400)
  assert.equal((await call('/api/producer/input', { action: 'stop', role: 'source-a' }, cap)).status, 200)
  assert.equal(runtime.store.read(LOCAL_SCOPE).bindings['camera-a'], null)
  assert.equal((await call('/api/producer/input', { action: 'report', role: 'source-a', frames: 2, videoTrackSid: 'TR_owned' }, cap)).status, 400)
  assert.equal((await call('/api/producer/input', { action: 'stop-demo', role: 'source-a' })).status, 200)
  assert.equal((await call('/api/ha/action', { action: 'scene', scene: 'clip', expectedGeneration: runtime.authority.generation }, { 'X-Jupiter-Local': 'phase7' })).status, 400)
  const before = runtime.store.read(LOCAL_SCOPE).revision
  const command = { consoleId: 'operator-test', commandId: 'op-live', expectedRevision: before, command: { type: 'SET_LIVE', live: true } }
  assert.equal((await call('/api/producer/command', command)).status, 200)
  assert.equal((await call('/api/producer/command', { ...command, commandId: 'stale' })).status, 409)
  assert.equal(runtime.store.read(LOCAL_SCOPE).desiredLifecycle, 'live')
  assert.equal((await call('/api/media/recording/start', {})).status, 404)
})
