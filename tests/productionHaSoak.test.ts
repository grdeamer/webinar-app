import test from 'node:test'
import assert from 'node:assert/strict'
import { haRuntimeBudget, SOAK_FAULTS, SOAK_OBSERVATION_MS, SOAK_HARD_LIMIT_MS, assessSoakWindow } from '../lib/production/haSoakPlan.ts'

test('hour soak is an explicit guarded mode; ordinary drills keep their short budget', () => {
  assert.equal(haRuntimeBudget(false).durationMs, 600_000)
  assert.throws(() => haRuntimeBudget(true), /capability/)
  assert.throws(() => haRuntimeBudget(true, 'invalid'), /capability/)
  assert.deepEqual(haRuntimeBudget(true, 'a'.repeat(64)), { durationMs: SOAK_HARD_LIMIT_MS, primaryRestarts: 2 })
  assert.equal(SOAK_OBSERVATION_MS, 3_600_000)
  assert.ok(SOAK_FAULTS.every(x => x.atMs < SOAK_OBSERVATION_MS))
  assert.equal(SOAK_FAULTS.filter(x => x.kind === 'crash').length, 2)
  assert.equal(SOAK_FAULTS.filter(x => x.kind === 'stall').length, 2)
})
test('steady quality checks reject a low metric, lost resolution or incomplete measurement', () => {
  const good = { fullHdThroughout: true, distinctFps: 29.9, decodedFps: 30, presentedFps: 30, seconds: 30 }
  assert.doesNotThrow(() => assessSoakWindow(good))
  for (const change of [{ distinctFps: 29 }, { decodedFps: 60 }, { presentedFps: 31 }, { decodedFps: 0 }, { presentedFps: NaN }, { fullHdThroughout: false }, { seconds: 10 }]) assert.throws(() => assessSoakWindow({ ...good, ...change }))
})

test('independent deadline guard cleans up only its birth-checked dummy child', { timeout: 20_000 }, async t => {
  const { spawn, execFileSync } = await import('node:child_process'), { once } = await import('node:events')
  const { mkdtempSync, writeFileSync, readFileSync, rmSync } = await import('node:fs'), { tmpdir } = await import('node:os'), { join, resolve } = await import('node:path')
  const directory = mkdtempSync(join(tmpdir(), 'ha-soak-guard-')); t.after(() => rmSync(directory, { recursive: true, force: true }))
  const child = spawn('/bin/sleep', ['30'], { stdio: 'ignore' }); t.after(() => child.kill('SIGKILL')); assert.ok(child.pid)
  const childExited = once(child, 'exit')
  const birth = (pid: number) => execFileSync('/bin/ps', ['-p', String(pid), '-o', 'lstart='], { encoding: 'utf8', env: { PATH: '/usr/bin:/bin', LC_ALL: 'C', NODE_ENV: 'development' } }).trim()
  const plan = join(directory, 'soak-active.json'), id = 'dummy-deadline-test'
  writeFileSync(plan, JSON.stringify({ soakId: id, outcome: 'failed', cleanup: null, runtimeRunId: 'never-a-real-runtime' }))
  const python = '/Users/lets-gd/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3'
  const guard = spawn(python, [resolve(import.meta.dirname, '../scripts/production-ha-soak-watchdog.py'), plan, id, String(process.pid), birth(process.pid), String(child.pid), birth(child.pid), String(Date.now() / 1000 - 1)], { stdio: 'ignore' })
  t.after(() => guard.kill('SIGKILL'))
  const [code] = await once(guard, 'exit'); assert.equal(code, 0)
  await childExited
  const report = JSON.parse(readFileSync(join(directory, 'soak-watchdog-result.json'), 'utf8'))
  assert.equal(report.reason, 'hard_deadline'); assert.deepEqual(report.remainingOwnedPids, [])
})

test('managed soak locks fault controls to its owner while retaining operator Stop', async t => {
  const { LocalHaRuntime } = await import('../lib/production/localHaRuntime.ts')
  const { createServer, request } = await import('node:http'), { once } = await import('node:events')
  const { mkdtempSync, rmSync } = await import('node:fs'), { tmpdir } = await import('node:os'), { join } = await import('node:path')
  const dir = mkdtempSync(join(tmpdir(), 'ha-soak-api-')); t.after(() => rmSync(dir, { recursive: true, force: true }))
  const key = 'b'.repeat(64), runtime = new LocalHaRuntime(dir, { soak: true, controlKey: key })
  runtime.running = true // API policy test only: no SFU or browsers are launched.
  const server = createServer((req, res) => void runtime.handle(req, res)); server.listen(0, '127.0.0.1'); await once(server, 'listening')
  const address = server.address(); assert.ok(address && typeof address !== 'string')
  const post = (action: string, cap?: string) => new Promise<{ status: number; body: Record<string, unknown> }>((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port: address.port, path: '/api/ha/action', method: 'POST', headers: { Host: '127.0.0.1:4311', 'Content-Type': 'application/json', 'X-Jupiter-Local': 'phase7', ...(cap ? { 'X-Soak-Capability': cap } : {}) } }, res => {
      let text = ''; res.on('data', chunk => { text += String(chunk) }); res.on('end', () => resolve({ status: res.statusCode!, body: JSON.parse(text) }))
    })
    req.on('error', reject); req.end(JSON.stringify({ action, runId: runtime.runId, expectedGeneration: runtime.authority.generation }))
  })
  try {
    assert.equal((await post('freeze-primary')).status, 400)
    const owned = await post('freeze-primary', key); assert.equal(owned.status, 200, String(owned.body.error))
    assert.equal(JSON.stringify(owned.body).includes(key), false)
    assert.equal((await post('stop')).status, 200); assert.equal(runtime.operatorStopRequested, true); assert.equal(runtime.running, false)
  } finally { await runtime.stop(); server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); runtime.store.close() }
})

test('load receivers have unique subscribe-only Program grants and cannot obtain publisher roles', async () => {
  const { haGrant, haObserverWorker, LocalHaRuntime } = await import('../lib/production/localHaRuntime.ts')
  const rooms = { input: 'private-source', candidates: 'private-candidates', program: 'finished-program' }
  const identities = new Set<string>()
  for (let i = 2; i <= 10; i++) {
    const role = `ha-load-${i}` as const, x = haGrant(role, 'ha-observer', rooms, 1)
    assert.equal(haObserverWorker(role), true); assert.equal(x.grant.room, rooms.program); assert.equal(x.grant.canPublish, false); assert.equal(x.grant.canPublishData, false); assert.equal(x.grant.canSubscribe, true); identities.add(x.identity)
    for (const other of ['gateway-output', 'gateway-input', 'renderer-output', 'renderer-input', 'source-a']) assert.throws(() => haGrant(role, other, rooms, 1))
  }
  assert.equal(identities.size, 9)
  assert.equal(haObserverWorker('ha-load-11'), false); assert.equal(haObserverWorker('ha-load-1'), false)
  assert.throws(() => new LocalHaRuntime('/tmp/should-not-create-ha-load', { receivers: 10 }), /private control capability/)
  assert.throws(() => new LocalHaRuntime('/tmp/should-not-create-ha-load', { receivers: 11, controlKey: 'a'.repeat(64) }), /receiver counts/)
  assert.throws(() => new LocalHaRuntime('/tmp/should-not-create-ha-load', { receivers: 3, soak: true, controlKey: 'a'.repeat(64) }), /ten-minute mode/)
})
