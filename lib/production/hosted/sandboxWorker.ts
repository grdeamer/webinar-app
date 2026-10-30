import 'server-only'
import { sessionBudgetEnabled } from '../sessionBudget.ts'
import { Sandbox } from '@vercel/sandbox'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { hostedTrialLimits } from './trialLimits.ts'
import type { EngineScope } from './protocol.ts'
/** One manually prepared worker for this explicitly approved trial. No retries/resume. */
export function trialName() {
  const name = process.env.PRODUCER_ENGINE_TRIAL_NAME || ''
  if (!/^jupiter-producer-trial-[a-z0-9-]{8,60}$/.test(name)) throw new Error('Hosted trial is not configured')
  return name
}
export async function runningTrial() {
  const worker = await Sandbox.get({ name: trialName(), resume: false })
  if (worker.status !== 'running' || worker.persistent) throw new Error('Hosted trial is not running')
  return worker
}
export async function prepareHostedRehearsal(scope: EngineScope) {
  const name = trialName(), limits = hostedTrialLimits(name), allowedUntil = Number(process.env.PRODUCER_ENGINE_TRIAL_ALLOWED_UNTIL_MS)
  const sessionCap = process.env.PRODUCER_ENGINE_SESSION_CAP_USD
  sessionBudgetEnabled(sessionCap, limits.hour)
  if (!Number.isSafeInteger(allowedUntil) || Date.now() >= allowedUntil || allowedUntil > Date.now() + 24 * 60 * 60_000) throw new Error('Hosted trial authorization expired')
  if (!process.env.LIVEKIT_URL?.startsWith('wss:') || !process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET || (process.env.PRODUCER_ENGINE_SECRET?.length ?? 0) < 32) throw new Error('Hosted media configuration incomplete')
  console.info('hosted-rehearsal-stage', { stage: 'sandbox-list' })
  const existing = await Sandbox.list({ namePrefix: name, sortBy: 'name' })
  if (existing.sandboxes.some(x => x.name === name)) throw new Error('This single-use trial was already prepared. No repeated paid run was started.')
  console.info('hosted-rehearsal-stage', { stage: 'sandbox-create' })
  const cloudStartedAtMs = Date.now()
  const worker = await Sandbox.create({ name, image: 'vercel/sandbox/universal', persistent: false, region: 'iad1', resources: { vcpus: 8 }, ports: [8080], timeout: limits.cloudMs, tags: { purpose: 'producer-rehearsal', event: scope.eventId, session: scope.sessionId }, env: { LIVEKIT_URL: process.env.LIVEKIT_URL, LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY, LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET, PRODUCER_ENGINE_SECRET: process.env.PRODUCER_ENGINE_SECRET } })
  try {
    if (worker.timeout !== limits.cloudMs || worker.persistent) throw new Error('Cloud expiry/no-snapshot safeguard not verified')
    const preflight = await worker.runCommand({ cmd: 'node', args: ['-e', 'if(Number(process.versions.node.split(".")[0]) < 24) process.exit(12)'], cwd: worker.cwd, timeoutMs: 10_000 })
    if (preflight.exitCode !== 0) throw new Error('Hosted worker requires Node 24 or later')
    const bundle = JSON.parse(readFileSync(resolve(process.cwd(), 'tools/production-local/release/hosted-worker-files.json'), 'utf8')) as { path: string; content: string }[]
    const files = bundle.map(x => ({ path: x.path, content: Buffer.from(x.content, 'base64') }))
    files.push({ path: 'package.json', content: Buffer.from(JSON.stringify({ private: true, type: 'module', dependencies: { 'livekit-server-sdk': '2.15.0', 'livekit-client': '2.17.3', 'playwright-core': '1.62.1' } })) })
    console.info('hosted-rehearsal-stage', { stage: 'worker-files' })
    await worker.writeFiles(files)
    if (sessionCap === '5') {
      const budget = await worker.runCommand({ cmd: 'node', args: ['-e', "const fs=require('fs');let n=0;for(const i of fs.readdirSync('/sys/class/net'))if(i!=='lo')for(const k of ['rx_bytes','tx_bytes'])n+=Number(fs.readFileSync('/sys/class/net/'+i+'/statistics/'+k,'utf8'));fs.writeFileSync('/vercel/session-network-start.json',JSON.stringify(n),{mode:384})"], cwd: worker.cwd, timeoutMs: 10_000 })
      if (budget.exitCode !== 0) throw new Error('Session traffic budget unavailable')
    }
    const install = await worker.runCommand({ cmd: 'bash', args: ['-lc', 'npm install --ignore-scripts --no-audit --no-fund && npx playwright-core install --with-deps chromium'], cwd: worker.cwd, timeoutMs: 180_000 })
    if (install.exitCode !== 0) throw new Error('Hosted browser installation failed')
    await worker.runCommand({ cmd: 'node', args: ['--experimental-strip-types', 'scripts/production-producer-hosted.ts'], cwd: worker.cwd, detached: true, timeoutMs: limits.mediaMs + 30_000, env: { PRODUCER_ENGINE_SESSION_CAP_USD: sessionCap || '', PRODUCER_ENGINE_HOUR_SOAK: limits.hour ? '1' : '0', PRODUCER_ENGINE_EVENT_ID: scope.eventId, PRODUCER_ENGINE_SESSION_ID: scope.sessionId, PRODUCER_ENGINE_DEADLINE_MS: String(Math.min(Date.now() + limits.mediaMs, cloudStartedAtMs + limits.cloudMs - 60_000)) } })
    const readiness = await worker.runCommand({ cmd: 'node', args: ['-e', "(async()=>{const end=Date.now()+45000;while(Date.now()<end){try{const r=await fetch('http://127.0.0.1:4311/api/ha/status',{signal:AbortSignal.timeout(2000)});const s=await r.json();if(s.running&&s.workers.length===6&&s.observer?.width===1920&&s.observer?.frames>30)process.exit(0)}catch{}await new Promise(r=>setTimeout(r,500))}process.exit(14)})()"], cwd: worker.cwd, timeoutMs: 50_000 })
    if (readiness.exitCode !== 0) throw new Error('Hosted engine did not become ready')
    return { prepared: true, expiresWithinMinutes: limits.cloudMs / 60_000, recordingEnabled: false, reservedBudgetUsd: sessionCap === '5' ? 5 : limits.hour ? 12 : 8 }
  } catch {
    await worker.stop(); throw new Error('Hosted preparation failed; the trial worker was stopped')
  }
}
