/** Dedicated Linux worker entrypoint. Never import this file into a Vercel Function. */
import { createServer } from 'node:http'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { LocalHaRuntime } from '../lib/production/localHaRuntime.ts'
import { LocalProducerRehearsal } from '../lib/production/localProducerRehearsal.ts'
import { EngineVerifier, validateEngineRequest, type EngineRequest } from '../lib/production/hosted/protocol.ts'
process.umask(0o077)
const secret = process.env.PRODUCER_ENGINE_SECRET || ''
const eventId = process.env.PRODUCER_ENGINE_EVENT_ID || '', sessionId = process.env.PRODUCER_ENGINE_SESSION_ID || ''
if (secret.length < 32 || !/^[a-zA-Z0-9_-]{1,128}$/.test(eventId) || !/^[a-zA-Z0-9_-]{1,128}$/.test(sessionId)) throw new Error('Explicit hosted rehearsal scope and signing secret required')
const deadline = Number(process.env.PRODUCER_ENGINE_DEADLINE_MS)
if (!Number.isSafeInteger(deadline) || deadline <= Date.now() || deadline > Date.now() + 30 * 60_000) throw new Error('Non-extendable hosted deadline within thirty minutes required')
const directory = mkdtempSync(join(tmpdir(), 'jupiter-hosted-rehearsal-'))
const runtime = new LocalHaRuntime(directory, { rehearsal: true, bundledBrowser: true, transport: { url: process.env.LIVEKIT_URL || '', apiKey: process.env.LIVEKIT_API_KEY || '', apiSecret: process.env.LIVEKIT_API_SECRET || '' } })
const producer = new LocalProducerRehearsal(runtime), verifier = new EngineVerifier()
let ready = false, closing = false
const local = createServer(async (req, res) => { try { if (!await producer.handle(req, res)) await runtime.handle(req, res) } catch { res.writeHead(500); res.end() } })
const external = createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store')
  if (req.url !== '/control' || req.method !== 'POST') { res.writeHead(404); res.end(); return }
  try {
    let body = ''; for await (const chunk of req) { body += String(chunk); if (Buffer.byteLength(body) > 100_000) throw new Error('Request too large') }
    const headers = new Headers(); for (const name of ['x-engine-time', 'x-engine-nonce', 'x-engine-signature']) if (typeof req.headers[name] === 'string') headers.set(name, req.headers[name])
    verifier.verify(secret, body, headers)
    const x = validateEngineRequest(JSON.parse(body) as EngineRequest)
    if (x.scope.eventId !== eventId || x.scope.sessionId !== sessionId) throw new Error('Rehearsal scope mismatch')
    if (!ready || closing || Date.now() >= deadline) { res.writeHead(503, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Rehearsal is not running' })); return }
    const upstream = await fetch(`http://127.0.0.1:4311${x.path}`, { method: x.method, redirect: 'error', signal: AbortSignal.timeout(8000), headers: { 'Content-Type': 'application/json', 'X-Jupiter-Local': x.path === '/api/ha/action' ? 'phase7' : 'producer-rehearsal', ...(x.inputCapability ? { 'X-Input-Capability': x.inputCapability } : {}) }, ...(x.method === 'POST' ? { body: x.body } : {}) })
    const result = await upstream.text()
    res.writeHead(upstream.status, { 'Content-Type': 'application/json' }); res.end(result)
    if (x.path === '/api/ha/action' && JSON.parse(x.body).action === 'stop') void stop()
  } catch { res.writeHead(403, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Hosted control request denied' })) }
})
external.requestTimeout = 10_000; external.headersTimeout = 10_000
async function stop() {
  if (closing) return; closing = true; ready = false; clearTimeout(timer)
  try { await producer.stop() } finally {
    external.closeAllConnections(); external.close(); local.closeAllConnections(); local.close(); runtime.store.close(); rmSync(directory, { recursive: true, force: true }); process.exitCode = runtime.failure ? 1 : 0
  }
}
const timer = setTimeout(() => void stop(), deadline - Date.now())
local.listen(4311, '127.0.0.1', async () => {
  try { await runtime.start(); ready = true; external.listen(8080, '0.0.0.0'); console.log(JSON.stringify({ event: 'hosted-rehearsal-ready', runId: runtime.runId, deadline, recording: false })) }
  catch { console.error('Hosted engine startup failed'); void stop() }
})
process.once('SIGTERM', () => { clearTimeout(timer); void stop() }); process.once('SIGINT', () => { clearTimeout(timer); void stop() })
