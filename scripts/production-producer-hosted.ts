import {handleDirectTake} from '../lib/production/directTakeHttp.ts'
import {engineStopEvent,type EngineStopReason} from '../lib/production/engineStopReason.ts'
import {LibraryHourMonitor} from '../lib/production/libraryHourMonitor.ts'
import {mixedHourApproval} from '../lib/production/mixedHourProfile.ts'
import {HostedPresentations} from '../lib/production/hostedPresentation.ts'
/** Dedicated Linux worker entrypoint. Never import this file into a Vercel Function. */
import { sessionBudgetEnabled, sessionTrafficExceeded } from '../lib/production/sessionBudget.ts'
import { randomBytes } from 'node:crypto'
import { runHostedSoak } from '../lib/production/hostedSoak.ts'
import { createServer } from 'node:http'
import { mkdtempSync, rmSync, readFileSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { LocalHaRuntime } from '../lib/production/localHaRuntime.ts'
import { LocalProducerRehearsal } from '../lib/production/localProducerRehearsal.ts'
import { EngineVerifier, validateEngineRequest, type EngineRequest } from '../lib/production/hosted/protocol.ts'
process.umask(0o077)
const secret = process.env.PRODUCER_ENGINE_SECRET || ''
const eventId = process.env.PRODUCER_ENGINE_EVENT_ID || '', sessionId = process.env.PRODUCER_ENGINE_SESSION_ID || ''
if (secret.length < 32 || !/^[a-zA-Z0-9_-]{1,128}$/.test(eventId) || !/^[a-zA-Z0-9_-]{1,128}$/.test(sessionId)) throw new Error('Explicit hosted rehearsal scope and signing secret required')
const hourSoak = process.env.PRODUCER_ENGINE_HOUR_SOAK === '1'
const lowLatency=process.env.PRODUCER_ENGINE_LOW_LATENCY_CONTROL==='1'
const directTakeOrigins=lowLatency?(process.env.PRODUCER_ENGINE_DIRECT_TAKE_ORIGINS||'').split(',').filter(Boolean):[]
const mixedHour=process.env.PRODUCER_ENGINE_MIXED_HOUR==='1'
if(mixedHour&&hourSoak)throw Error('Choose one explicit hour profile')
const mixedApproval=mixedHour?mixedHourApproval(JSON.parse(readFileSync(process.env.PRODUCER_ENGINE_MIXED_HOUR_APPROVAL_FILE||'/run/missing-mixed-hour-approval','utf8')),{eventId,sessionId}):null
const mixedResults=mixedApproval?`/var/lib/jupiter-producer/soak-results/${mixedApproval.approvalId}`:null
const deadline = Number(process.env.PRODUCER_ENGINE_DEADLINE_MS)
if (!Number.isSafeInteger(deadline) || deadline <= Date.now() || deadline > Date.now() + (hourSoak||mixedHour ? 70 : 30) * 60_000) throw new Error('Non-extendable hosted deadline within thirty minutes required')
if(mixedApproval&&deadline!==mixedApproval.mediaStopAtMs)throw Error('Mixed-hour deadline differs from approval')
const directory = mkdtempSync(join(tmpdir(), 'jupiter-hosted-rehearsal-'))
const runtime = new LocalHaRuntime(directory, { rehearsal: true, lowLatency, hostedHourSoak: hourSoak||mixedHour, ...(hourSoak||mixedHour ? { controlKey: randomBytes(32).toString('hex') } : {}), rehearsalDeadlineAtMs: deadline, bundledBrowser: true, transport: { url: process.env.LIVEKIT_URL || '', apiKey: process.env.LIVEKIT_API_KEY || '', apiSecret: process.env.LIVEKIT_API_SECRET || '' } })
let mixedMonitor:LibraryHourMonitor|null=null
const producer = new LocalProducerRehearsal(runtime, { directTakeOrigins,directTakeUrl:lowLatency?new URL("/control",process.env.PRODUCER_ENGINE_URL||"https://producer-engine.jupiter.events").href:undefined,mediaUrl: process.env.LIVEKIT_URL,soakStatus:()=>mixedMonitor?{...mixedMonitor.summary(),cloudStopAtMs:mixedApproval!.cloudStopAtMs,budgetUsd:2}:null }), verifier = new EngineVerifier()
const presentations=new HostedPresentations(runtime.runId,deadline)
let ready = false, closing = false
const budgeted = sessionBudgetEnabled(process.env.PRODUCER_ENGINE_SESSION_CAP_USD, hourSoak)
function networkBytes() {
  return readdirSync('/sys/class/net').filter(x => x !== 'lo').reduce((n, i) => n + ['rx_bytes', 'tx_bytes'].reduce((sum, k) => sum + Number(readFileSync(`/sys/class/net/${i}/statistics/${k}`, 'utf8')), 0), 0)
}
const networkStart = budgeted ? Number(readFileSync(process.env.PRODUCER_ENGINE_NETWORK_START_FILE || '/vercel/session-network-start.json', 'utf8')) : 0
if (budgeted && (hourSoak || !Number.isSafeInteger(networkStart) || networkStart < 0)) throw new Error('Invalid session budget profile')
const budgetTimer = budgeted ? setInterval(() => {
  try { if (sessionTrafficExceeded(networkBytes(), networkStart,mixedApproval?.networkLimitBytes)) { console.info('Session traffic allowance reached; stopping media'); void stop('network-limit') } }
  catch { void stop('network-accounting-unavailable') }
}, 1000) : undefined
const local = createServer(async (req, res) => { try { if (!await producer.handle(req, res)) await runtime.handle(req, res) } catch { if (!res.headersSent) res.writeHead(500); if (!res.writableEnded) res.end() } })
const external = createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store')
  if(await presentations.handle(req,res))return
  if(await handleDirectTake(req,res,producer.directTake))return
  if (req.url !== '/control' || req.method !== 'POST') { res.writeHead(404); res.end(); return }
  try {
    let body = ''; for await (const chunk of req) { body += String(chunk); if (Buffer.byteLength(body) > 100_000) throw new Error('Request too large') }
    const headers = new Headers(); for (const name of ['x-engine-time', 'x-engine-nonce', 'x-engine-signature']) if (typeof req.headers[name] === 'string') headers.set(name, req.headers[name])
    verifier.verify(secret, body, headers)
    const x = validateEngineRequest(JSON.parse(body) as EngineRequest)
    if (x.scope.eventId !== eventId || x.scope.sessionId !== sessionId) throw new Error('Rehearsal scope mismatch')
    if (!ready || closing || Date.now() >= deadline) { res.writeHead(503, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Rehearsal is not running' })); return }
    if(x.path==='/api/producer/control-ticket'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(producer.issueDirectTake(x.scope.actorId,JSON.parse(x.body))));return}
    if(x.path==='/api/producer/soak'){if(!mixedMonitor)throw Error('No mixed hour approved');mixedMonitor.report(JSON.parse(x.body));res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(mixedMonitor.summary()));return}
    if(x.path==='/api/producer/presentation-ticket'){const input=JSON.parse(x.body);if(input.runId!==runtime.runId)throw Error('Current run required');res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(presentations.tickets.issue({name:input.name,bytes:input.bytes,origin:input.origin,runId:runtime.runId})));return}
    const upstream = await fetch(`http://127.0.0.1:4311${x.path}`, { method: x.method, redirect: 'error', signal: AbortSignal.timeout(8000), headers: { 'Content-Type': 'application/json', 'X-Jupiter-Local': x.path === '/api/ha/action' ? 'phase7' : 'producer-rehearsal', ...(x.inputCapability ? { 'X-Input-Capability': x.inputCapability } : {}) }, ...(x.method === 'POST' ? { body: x.body } : {}) })
    const result = await upstream.text()
    res.writeHead(upstream.status, { 'Content-Type': 'application/json' }); res.end(result)
    if (x.path === '/api/ha/action' && JSON.parse(x.body).action === 'stop') void stop('operator-stop')
  } catch { res.writeHead(403, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Hosted control request denied' })) }
})
external.requestTimeout = 95_000; external.headersTimeout = 10_000
async function stop(reason:EngineStopReason) {
  if (closing) return; closing = true; ready = false; mixedMonitor?.interrupted(reason); console.info(JSON.stringify(engineStopEvent(reason,runtime.runId,'requested',false))); presentations.stop(); clearTimeout(timer); clearInterval(budgetTimer)
  let cleaned=false
  try { await producer.stop(); cleaned=!runtime.failure&&!runtime.running&&runtime.status().workers.length===0; mixedMonitor?.cleaned(runtime.status()) } finally {
    external.closeAllConnections(); external.close(); local.closeAllConnections(); local.close(); if (!hourSoak) runtime.store.close(); rmSync(directory, { recursive: true, force: true }); process.exitCode = runtime.failure ? 1 : 0; console.info(JSON.stringify(engineStopEvent(reason,runtime.runId,'completed',cleaned)))
  }
}
if(mixedResults)mixedMonitor=new LibraryHourMonitor(runtime,mixedResults,()=>stop('soak-terminal'),id=>producer.ownsFileInput(id))
const timer = setTimeout(() => void stop('deadline'), deadline - Date.now())
local.listen(4311, '127.0.0.1', async () => {
  try { await runtime.start(); ready = true; external.listen(8080, '0.0.0.0'); if(mixedMonitor)void mixedMonitor.run(); if (hourSoak) void runHostedSoak(runtime, deadline, () => producer.stop()).finally(async () => { await stop('soak-terminal'); runtime.store.close() }); console.log(JSON.stringify({ event: 'hosted-rehearsal-ready', runId: runtime.runId, deadline, recording: false })) }
  catch { console.error('Hosted engine startup failed'); void stop('startup-failed') }
})
process.once('SIGTERM', () => { clearTimeout(timer); void stop('signal:SIGTERM') }); process.once('SIGINT', () => { clearTimeout(timer); void stop('signal:SIGINT') })
