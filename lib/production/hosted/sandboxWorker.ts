import 'server-only'
import { Sandbox } from '@vercel/sandbox'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
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
  const name = trialName(), allowedUntil = Number(process.env.PRODUCER_ENGINE_TRIAL_ALLOWED_UNTIL_MS)
  if (!Number.isSafeInteger(allowedUntil) || Date.now() >= allowedUntil || allowedUntil > Date.now() + 24 * 60 * 60_000) throw new Error('Hosted trial authorization expired')
  if (!process.env.LIVEKIT_URL?.startsWith('wss:') || !process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET || (process.env.PRODUCER_ENGINE_SECRET?.length ?? 0) < 32) throw new Error('Hosted media configuration incomplete')
  console.info('hosted-rehearsal-stage', { stage: 'sandbox-list' })
  const existing = await Sandbox.list({ namePrefix: name })
  if (existing.sandboxes.some(x => x.name === name)) throw new Error('This single-use trial was already prepared. No repeated paid run was started.')
  console.info('hosted-rehearsal-stage', { stage: 'sandbox-create' })
  const worker = await Sandbox.create({ name, persistent: false, region: 'iad1', resources: { vcpus: 8 }, ports: [8080], timeout: 30 * 60_000, tags: { purpose: 'producer-rehearsal', event: scope.eventId, session: scope.sessionId }, env: { LIVEKIT_URL: process.env.LIVEKIT_URL, LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY, LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET, PRODUCER_ENGINE_SECRET: process.env.PRODUCER_ENGINE_SECRET } })
  try {
    if (worker.timeout !== 30 * 60_000 || worker.persistent) throw new Error('Cloud expiry/no-snapshot safeguard not verified')
    const bundle = JSON.parse(readFileSync(resolve(process.cwd(), 'tools/production-local/release/hosted-worker-files.json'), 'utf8')) as { path: string; content: string }[]
    const files = bundle.map(x => ({ path: x.path, content: Buffer.from(x.content, 'base64') }))
    files.push({ path: 'package.json', content: Buffer.from(JSON.stringify({ private: true, type: 'module', dependencies: { 'livekit-server-sdk': '2.15.0', 'playwright-core': '1.62.1' } })) })
    console.info('hosted-rehearsal-stage', { stage: 'worker-files' })
    await worker.writeFiles(files)
    const install = await worker.runCommand({ cmd: 'bash', args: ['-lc', 'npm install --ignore-scripts --no-audit --no-fund && npx playwright-core install --with-deps chromium'], cwd: '/vercel/sandbox', timeoutMs: 180_000 })
    if (install.exitCode !== 0) throw new Error('Hosted browser installation failed')
    await worker.runCommand({ cmd: 'node', args: ['--experimental-strip-types', 'scripts/production-producer-hosted.ts'], cwd: '/vercel/sandbox', detached: true, timeoutMs: 25 * 60_000, env: { PRODUCER_ENGINE_EVENT_ID: scope.eventId, PRODUCER_ENGINE_SESSION_ID: scope.sessionId, PRODUCER_ENGINE_DEADLINE_MS: String(Date.now() + 20 * 60_000) } })
    return { prepared: true, expiresWithinMinutes: 30, recordingEnabled: false, reservedBudgetUsd: 8 }
  } catch {
    await worker.stop(); throw new Error('Hosted preparation failed; the trial worker was stopped')
  }
}
