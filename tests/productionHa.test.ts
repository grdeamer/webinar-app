import { classifySourceColor } from '../tools/production-local/runtime/ha-provenance.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { LocalHaAuthority, HA_MAX_GENERATION } from '../lib/production/localHaAuthority.ts'
import { haGrant } from '../lib/production/localHaRuntime.ts'
import { OutputFence } from '../tools/production-local/runtime/ha-fence.js'

function fixture(t: { after: (f: () => void) => void }) {
  const dir = mkdtempSync(join(tmpdir(), 'jupiter-ha-authority-')); t.after(() => rmSync(dir, { recursive: true, force: true }))
  return new LocalHaAuthority(join(dir, 'authority.json'), 'local-run', 0)
}
const report = (frames: number, revision = 5) => ({ appliedRevision: revision, framesSent: frames, error: null as string | null, assetPositions: {} })
test('fresh heartbeat without output progress cannot retain authority; synchronized standby takes over once', t => {
  const authority = fixture(t)
  authority.observe('primary', report(100), 5, 1000); authority.observe('standby', report(100), 5, 1000)
  authority.observe('primary', report(100), 5, 5100); authority.observe('standby', report(200), 5, 5100)
  authority.reconcile(5, 5100)
  assert.equal(authority.selected, 'standby'); assert.equal(authority.generation, 2)
  authority.reconcile(5, 5200); assert.equal(authority.generation, 2)
  assert.throws(() => authority.select('primary', 1, 5, 'stale', 5200), /Stale/)
})
test('authority outage and stale/lagging standby fail closed; revision lag alone does not cause promotion', t => {
  const authority = fixture(t)
  authority.observe('primary', report(100), 5, 1000); authority.observe('standby', report(100), 5, 1000)
  authority.available = false; authority.reconcile(5, 5000)
  assert.equal(authority.grant(5, 1000), null); assert.equal(authority.generation, 1)
  assert.throws(() => authority.select('standby', 1, 5, 'unsafe', 1000), /unavailable/)
  authority.available = true; authority.observe('standby', report(200, 4), 5, 6000); authority.reconcile(5, 6000)
  assert.equal(authority.generation, 1); assert.equal(authority.grant(5, 6000), null)
  authority.observe('primary', report(110, 4), 5, 7000); authority.observe('standby', report(210), 5, 7000); authority.reconcile(5, 7000)
  assert.equal(authority.generation, 1, 'New command readiness is not a failed primary')
})
test('journal reload advances fencing generation and requires new readiness; corrupt journal never resets it', t => {
  const authority = fixture(t); authority.observe('standby', report(1), 5, 1000); authority.select('standby', 1, 5, 'test', 1000)
  const restored = new LocalHaAuthority(authority.path, 'new-run', 2000)
  assert.equal(restored.generation, 3); assert.equal(restored.selected, 'standby'); assert.equal(restored.grant(5, 2000), null)
  writeFileSync(authority.path, '{"schemaVersion":1,"generation":0}')
  assert.throws(() => new LocalHaAuthority(authority.path, 'new-run'), /Invalid HA journal/)
})
test('failed durable authority write withdraws grants rather than acknowledging an unpersisted generation', t => {
  const authority = fixture(t); authority.observe('primary', report(1), 5, 1000); authority.observe('standby', report(1), 5, 1000)
  rmSync(authority.path); rmSync(join(authority.path, '..'), { recursive: true })
  assert.throws(() => authority.select('standby', 1, 5, 'write failed', 1000))
  assert.equal(authority.available, false); assert.equal(authority.generation, 1); assert.equal(authority.grant(5, 1000), null)
})
test('candidate tokens can publish only private candidate tracks; only gateway can publish Program', () => {
  const rooms = { input: 'input', candidates: 'candidates', program: 'program' }
  for (const candidate of ['primary', 'standby'] as const) {
    assert.throws(() => haGrant(candidate, 'gateway-output', rooms, 1))
    const output = haGrant(candidate, 'renderer-output', rooms, 1)
    assert.equal(output.grant.room, 'candidates'); assert.equal(output.grant.canPublish, true); assert.equal(output.grant.canSubscribe, false)
    const input = haGrant(candidate, 'renderer-input', rooms, 1); assert.equal(input.grant.room, 'input'); assert.equal(input.grant.canPublish, false)
  }
  assert.equal(haGrant('gateway', 'gateway-output', rooms, 1).grant.room, 'program')
  assert.equal(haGrant('gateway', 'gateway-input', rooms, 1).grant.canPublish, false)
  assert.equal(haGrant('ha-observer', 'ha-observer', rooms, 1).grant.canPublish, false)
})
test('output fence rejects stale generation, same-generation rival, wrong run and delayed grants; expires independently', () => {
  const fence = new OutputFence('run')
  const grant = { runId: 'run', generation: 10, candidate: 'primary', identity: 'candidate-primary', revision: 5, leaseMs: 1000 }
  assert.equal(fence.accept(grant, 100, 150), true); assert.equal(fence.selected(1099)?.candidate, 'primary'); assert.equal(fence.selected(1100), null)
  assert.equal(fence.accept({ ...grant, generation: 11, candidate: 'standby', identity: 'candidate-standby' }, 1200, 1300), true)
  for (const value of [grant, { ...grant, generation: 11 }, { ...grant, generation: 12, runId: 'other' }, { ...grant, generation: 12, identity: 'candidate-standby' }]) assert.equal(fence.accept(value, 1300, 1400), false)
  assert.equal(fence.accept({ ...grant, generation: 12 }, 1500, 2500), false, 'A late HTTP reply cannot extend the lease')
  assert.equal(fence.selected(2200), null)
})

test('gateway rejects revision regression and invalid local clock windows', () => {
  const fence = new OutputFence('run')
  const grant = { runId: 'run', generation: 1, candidate: 'primary', identity: 'candidate-primary', revision: 20, leaseMs: 1000 }
  assert.equal(fence.accept(grant, 100, 101), true)
  assert.equal(fence.accept({ ...grant, generation: 2, revision: 19 }, 200, 201), false)
  assert.equal(fence.accept({ ...grant, generation: 2 }, 200, NaN), false)
  assert.equal(fence.accept({ ...grant, generation: 2 }, -1, 1), false)
})
test('backward coordinator clock does not freshen a report and startup does not prematurely promote', t => {
  const authority = fixture(t)
  authority.observe('primary', report(10), 5, 1000)
  assert.equal(authority.grant(5, 999), null)
  const next = new LocalHaAuthority(authority.path, 'next', 2000)
  next.observe('standby', report(10), 5, 2100); next.reconcile(5, 2200)
  assert.equal(next.selected, 'primary', 'Allow the initial primary to finish startup')
})


test('picture provenance survives measured lossy color shifts but rejects slates and ambiguity', () => {
  assert.equal(classifySourceColor(21, 67, 90), 'camera-a')
  assert.equal(classifySourceColor(78, 15, 68), 'camera-b')
  for (const color of [[17, 28, 41], [47, 48, 84], [255, 255, 255], [0, 0, 0], [256, 0, 0]]) assert.equal(classifySourceColor(...color as [number, number, number]), null)
})


test('fencing generations fail closed before the diagnostic wire marker could wrap', t => {
  const authority = fixture(t)
  writeFileSync(authority.path, JSON.stringify({ schemaVersion: 1, generation: HA_MAX_GENERATION, selected: 'primary', boundaries: [] }))
  assert.throws(() => new LocalHaAuthority(authority.path, 'next'), /Invalid HA journal/)
  const fence = new OutputFence('run')
  assert.equal(fence.accept({ runId: 'run', generation: HA_MAX_GENERATION + 1, candidate: 'primary', identity: 'candidate-primary', revision: 1, leaseMs: 1000 }, 100, 101), false)
})

test('fast takeover requires independently decoded, current standby media', t => {
  const prior = fixture(t), authority = new LocalHaAuthority(prior.path, 'strict-run', 0, true)
  authority.observe('primary', report(100), 5, 1000); authority.observe('standby', report(100), 5, 1000)
  assert.equal(authority.grant(5, 1000), null, 'Self-reported encoded frames alone cannot authorize output')
  authority.observeGateway({ 'candidate-primary': { frames: 50, revision: 5, ageMs: 0 }, 'candidate-standby': { frames: 50, revision: 5, ageMs: 0 } }, 1000)
  assert.ok(authority.grant(5, 1000))
  authority.observeGateway({ 'candidate-primary': { frames: 50, revision: 5, ageMs: 500 }, 'candidate-standby': { frames: 65, revision: 5, ageMs: 0 } }, 1500)
  authority.reconcile(5, 1500)
  assert.equal(authority.selected, 'standby', 'Fresh heartbeat must not mask a real decoder stall')
})
test('process exit can select a warm standby immediately, but stale gateway telemetry blocks promotion', t => {
  const prior = fixture(t), authority = new LocalHaAuthority(prior.path, 'strict-run', 0, true)
  authority.observe('primary', report(100), 5, 1000); authority.observe('standby', report(100), 5, 1000)
  authority.observeGateway({ 'candidate-primary': { frames: 50, revision: 5, ageMs: 0 }, 'candidate-standby': { frames: 50, revision: 5, ageMs: 0 } }, 1000)
  authority.unavailable('primary', 'Process exited'); authority.reconcile(5, 1100)
  assert.equal(authority.selected, 'standby')
  assert.equal(authority.grant(5, 1600), null, 'A gateway report cannot keep renewing itself')
})
