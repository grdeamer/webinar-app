import test from 'node:test'
import assert from 'node:assert/strict'
import { EngineVerifier, signEngineRequest, validateEngineRequest, engineEndpoint } from '../lib/production/hosted/protocol.ts'
const secret = 'test-only-signing-key-'.repeat(3)
const request = { scope: { eventId: 'event', sessionId: 'session', actorId: 'producer' }, path: '/api/producer/status', method: 'GET' as const, body: '' }
test('hosted controls authenticate exact bytes and reject replay, tampering and expired signatures', () => {
  const body = JSON.stringify(request), now = Date.now(), headers = new Headers(signEngineRequest(secret, body, now)), verifier = new EngineVerifier()
  verifier.verify(secret, body, headers, now)
  assert.throws(() => verifier.verify(secret, body, headers, now), /replay/)
  assert.throws(() => new EngineVerifier().verify(secret, body + ' ', headers, now), /denied/)
  assert.throws(() => new EngineVerifier().verify(secret, body, headers, now + 31_000), /denied/)
})
test('worker operation allowlist excludes credentials, recordings, arbitrary URLs and gateway destruction', () => {
  assert.deepEqual(validateEngineRequest(request), request)
  for (const path of ['/api/media/token', '/api/ha/authority', '/api/record', 'https://example.com', '/api/producer/status?other=1']) assert.throws(() => validateEngineRequest({ ...request, path }))
  assert.throws(() => validateEngineRequest({ ...request, path: '/api/ha/action', method: 'POST', body: JSON.stringify({ action: 'crash-gateway' }) }))
  assert.throws(() => validateEngineRequest({ ...request, scope: { ...request.scope, sessionId: '../another' } }))
})
test('worker endpoint must be a configured HTTPS origin without credentials, paths or query strings', () => {
  assert.equal(engineEndpoint('https://worker.example').href, 'https://worker.example/control')
  for (const raw of ['http://worker.example', 'https://user:pass@worker.example', 'https://worker.example/other', 'https://worker.example/?key=a']) assert.throws(() => engineEndpoint(raw))
})


test('media transport allows documented project regions and rejects lookalike domains', async () => {
  const { mediaHostAllowed, mediaConnectSources } = await import('../lib/production/hosted/transportPolicy.ts')
  const url = 'wss://example.livekit.cloud'
  assert.equal(mediaHostAllowed('example.oashburn1a.production.livekit.cloud', url), true)
  assert.equal(mediaHostAllowed('example.livekit.cloud.attacker.test', url), false)
  assert.equal(mediaHostAllowed('other.livekit.cloud', url), false)
  assert.equal(mediaHostAllowed('external.test'), false)
  assert.equal(mediaHostAllowed('127.0.0.1'), true)
  assert.match(mediaConnectSources(url), /wss:\/\/\*\.livekit\.cloud/)
  assert.throws(() => mediaConnectSources('ws://unsecured.example'))
})


test('hosted runtime reports its actual fixed deadline and rejects extensions beyond thirty minutes', async t => {
  const { LocalHaRuntime } = await import('../lib/production/localHaRuntime.ts')
  const { mkdtempSync, rmSync } = await import('node:fs')
  const { tmpdir } = await import('node:os')
  const { join } = await import('node:path')
  const dir = mkdtempSync(join(tmpdir(), 'hosted-deadline-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const deadline = Date.now() + 60_000
  const runtime = new LocalHaRuntime(dir, { rehearsal: true, rehearsalDeadlineAtMs: deadline })
  assert.equal(runtime.status().expiresAtMs, deadline)
  runtime.store.close()
  assert.throws(() => new LocalHaRuntime(dir, { rehearsal: true, rehearsalDeadlineAtMs: Date.now() + 31 * 60_000 }), /deadline/)
  assert.throws(() => new LocalHaRuntime(dir, { rehearsalDeadlineAtMs: deadline }), /deadline/)
})
