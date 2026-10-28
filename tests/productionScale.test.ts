import test from 'node:test'
import assert from 'node:assert/strict'
import { LOCAL_PROFILES, counterRate, parseLocalProfile, validateScalePlan, macMemoryAvailable } from '../lib/production/localScale.ts'

test('scale plans reject resource expansion, unbounded duration and fake regional delay', () => {
  assert.deepEqual(validateScalePlan(4, 20, 150), { viewers: 4, seconds: 20, delayMs: 150 })
  for (const values of [[0, 20, 0], [5, 20, 0], [2, 3600, 0], [2, 20, 1000], [1.5, 20, 0]]) assert.throws(() => validateScalePlan(...values as [number, number, number]))
})
test('counter deltas reject resets and invalid windows instead of inventing rates', () => {
  assert.equal(counterRate(100, 700, 20_000), 30)
  assert.equal(counterRate(700, 100, 20_000), null)
  assert.equal(counterRate(100, 700, 0), null)
  assert.equal(counterRate(100, Infinity, 1000), null)
})
test('local profiles have explicit sender caps and no arbitrary encoder configuration', () => {
  assert.equal(parseLocalProfile('economy'), 'economy')
  for (const invalid of ['__proto__', 'toString', '1080p', null]) assert.throws(() => parseLocalProfile(invalid))
  assert.equal(LOCAL_PROFILES.economy.scaleResolutionDownBy, 2)
  assert.equal(LOCAL_PROFILES.standard.maxFramerate, 30)
})

test('encoder API scopes writes to the current local run and blocks recording/stopped runtime changes', async t => {
  const { mkdtempSync, rmSync } = await import('node:fs'), { tmpdir } = await import('node:os'), { join } = await import('node:path')
  const { once } = await import('node:events')
  const { LocalSqliteProductionStore } = await import('../lib/production/localSqliteStore.ts')
  const { createLocalWorkbench, LOCAL_SCOPE, seedLocalProduction } = await import('../lib/production/localWorkbench.ts')
  const { LocalMediaRoutes } = await import('../lib/production/localMediaRoutes.ts')
  const { LocalMediaSession } = await import('../lib/production/localMediaSession.ts')
  const directory = mkdtempSync(join(tmpdir(), 'jupiter-scale-')); t.after(() => rmSync(directory, { recursive: true, force: true }))
  const store = new LocalSqliteProductionStore(':memory:'); seedLocalProduction(store)
  const session = new LocalMediaSession(store), routes = new LocalMediaRoutes(session, join(directory, 'recordings'))
  const server = createLocalWorkbench(store, routes); server.listen(0, '127.0.0.1'); await once(server, 'listening')
  const address = server.address(); assert.ok(address && typeof address !== 'string')
  const base = `http://127.0.0.1:${address.port}`
  const payload = { profile: 'economy', runId: session.runId, scope: LOCAL_SCOPE }
  const post = (value: unknown, header = 'phase6') => fetch(base + '/api/media/encoding', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Jupiter-Local': header }, body: JSON.stringify(value) })
  try {
    assert.equal((await post(payload, 'phase5')).status, 400)
    assert.equal((await post({ ...payload, runId: 'previous-run' })).status, 400)
    assert.equal((await post({ ...payload, scope: { ...LOCAL_SCOPE, eventId: 'other' } })).status, 400)
    assert.equal((await post({ ...payload, profile: '__proto__' })).status, 400)
    assert.equal((await post(payload)).status, 200); assert.equal(session.encodingProfile, 'economy')
    routes.recording.start()
    assert.equal((await post({ ...payload, profile: 'standard' })).status, 400)
    routes.recording.fail('Synthetic test finished')
    session.running = false
    assert.equal((await post({ ...payload, profile: 'standard' })).status, 400)
    assert.equal((await (await fetch(base + '/api/media/scale-result')).json()), null)
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); store.close() }
})


test('macOS availability counts reclaimable pages once and fails closed on missing metadata', () => {
  assert.equal(macMemoryAvailable('Mach Virtual Memory Statistics: (page size of 16384 bytes)\nPages free: 100.\nPages inactive: 200.\nPages speculative: 10.\nPages purgeable: 50.'), 310 * 16384)
  assert.throws(() => macMemoryAvailable('missing VM counters'))
  assert.throws(() => macMemoryAvailable('page size of 4096 bytes\nPages free: 10.'))
})
