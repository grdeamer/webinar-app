import { randomBytes, randomUUID, createHash } from 'node:crypto'
import { LibraryHourMonitor } from '../lib/production/libraryHourMonitor.ts'
import { mkdirSync, openSync, closeSync, writeFileSync, unlinkSync, readFileSync, readdirSync } from 'node:fs'
import { createServer } from 'node:http'
import { resolve } from 'node:path'
import { spawn, execFileSync } from 'node:child_process'
import { LocalHaRuntime } from '../lib/production/localHaRuntime.ts'
import { LocalProducerRehearsal } from '../lib/production/localProducerRehearsal.ts'
import { writePrivateJson } from '../lib/production/localAtomicFile.ts'

process.umask(0o077)
const qualification=process.argv.includes('--qualify')
const base = resolve(import.meta.dirname, '../.local/production/ha'), directory = resolve(base, qualification?'canvas-qualification':'canvas-hour', randomUUID()); mkdirSync(directory, { recursive: true, mode: 0o700 })
const lockPath = resolve(base, 'runtime.lock'), lock = openSync(lockPath, 'wx', 0o600); writeFileSync(lock, String(process.pid)); closeSync(lock)
const runtime = new LocalHaRuntime(directory, { rehearsal: true, localLibrarySoak:true, controlKey:randomBytes(32).toString('hex'), rehearsalDeadlineAtMs:Date.now()+(qualification?5:65)*60_000 }), path = resolve(directory, 'active.json')
const birth = execFileSync('/bin/ps', ['-p', String(process.pid), '-o', 'lstart='], { encoding: 'utf8', env: { PATH: '/usr/bin:/bin', LC_ALL: 'C', NODE_ENV: 'development' } }).trim()
const plan = { qualification, soakId: `${qualification?'canvas-qualification':'multi-canvas'}-${runtime.runId}`, runtimeRunId: runtime.runId, ownerPid: process.pid, ownerBirth: birth, hostPid: process.pid, hostBirth: birth, hardDeadlineAtMs: runtime.expiresAtMs, outcome: 'starting', cleanup: null as { workersStopped: boolean } | null, recordingEnabled: false, cloudDeployed: false, watchdogPid: 0, directory, sourceArtifactId: '', caffeinatePid: 0 }
const roots=['lib/producer','lib/production','tools/production-local/runtime','app/dev/producer-media','app/dev/producer-canvas']
const files:string[]=[]
function collect(relative:string){for(const entry of readdirSync(resolve(import.meta.dirname,'..',relative),{withFileTypes:true})){const next=relative+'/'+entry.name;if(entry.isDirectory())collect(next);else if(/\.(ts|tsx|js|css)$/.test(entry.name))files.push(next)}}
roots.forEach(collect);files.push('scripts/production-canvas-soak-local.ts','scripts/production-ha-soak-watchdog.py','tools/production-local/runtime/assets/deck.pdf','.local/original-room-hour/Soak 1080p30.mp4')
const artifacts=files.toSorted().map(file=>({file,sha256:createHash('sha256').update(readFileSync(resolve(import.meta.dirname,'..',file))).digest('hex')}))
plan.sourceArtifactId=createHash('sha256').update(JSON.stringify(artifacts)).digest('hex')
writePrivateJson(resolve(directory,'source-artifact.json'),{sourceArtifactId:plan.sourceArtifactId,artifacts})
const save = () => {writePrivateJson(path, plan);writePrivateJson(resolve(base,qualification?'canvas-qualification-active.json':'canvas-hour-active.json'),plan)}
save()
const guard = spawn('/Users/lets-gd/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3', [resolve(import.meta.dirname, 'production-ha-soak-watchdog.py'), path, plan.soakId, String(process.pid), birth, String(process.pid), birth, String(plan.hardDeadlineAtMs / 1000)], { detached: true, stdio: 'ignore', env: { PATH: '/usr/bin:/bin', HOME: process.env.HOME ?? '', LC_ALL: 'C', NODE_ENV: 'development' } }); guard.unref(); plan.watchdogPid = guard.pid ?? 0; save()
const monitor:LibraryHourMonitor = new LibraryHourMonitor(runtime,directory,()=>stop(),source=>producer.ownsFileInput(source),true,qualification)
const producer:LocalProducerRehearsal=new LocalProducerRehearsal(runtime,{soakStatus:()=>monitor.summary()})
const awake=spawn('/usr/bin/caffeinate',['-w',String(process.pid)],{stdio:'ignore'});awake.unref();plan.caffeinatePid=awake.pid??0;save()
const server = createServer(async (req, res) => { if (!await monitor.handle(req,res) && !await producer.handle(req, res)) await runtime.handle(req, res) }); server.requestTimeout = 5000
let closing = false, timer: ReturnType<typeof setInterval> | null = null
async function stop() {
  if (closing) return; closing = true; if (timer) clearInterval(timer)
  awake.kill('SIGTERM');await producer.stop(); monitor.cleaned(runtime.status()); const state = runtime.status(); plan.cleanup = { workersStopped: !state.workers.length && !state.sfuRunning }; plan.outcome = state.failure || !plan.cleanup.workersStopped || monitor.result.outcome!=='completed' ? 'failed' : 'completed'; save()
  server.closeAllConnections(); server.close(() => { runtime.store.close(); unlinkSync(lockPath) })
}
server.on('error', error => { console.error(error.message); process.exitCode = 1; void stop() })
server.listen(4311, '127.0.0.1', async () => {
  try {
    const deadline = performance.now() + 5000
    while (performance.now() < deadline) { try { const x = JSON.parse(readFileSync(resolve(directory, 'soak-watchdog-result.json'), 'utf8')); if (x.soakId === plan.soakId && x.outcome === 'armed') break } catch { /* Bounded guard setup. */ }; await new Promise(resolve => setTimeout(resolve, 100)) }
    const armed = JSON.parse(readFileSync(resolve(directory, 'soak-watchdog-result.json'), 'utf8')); if (armed.soakId !== plan.soakId || armed.outcome !== 'armed') throw new Error('Independent rehearsal deadline guard did not arm')
    console.log(qualification?'Local multi-canvas qualification: 170 seconds, stall+crash, five-minute hard bound; recording off, no cloud/deployments':'Jupiter local producer room: http://127.0.0.1:4311/producer — 65-minute hard bound, one-hour multi-canvas soak, recording disabled, no cloud/deployments')
    await runtime.start(); plan.outcome = 'running'; save(); void monitor.run()
    timer = setInterval(() => { if (!runtime.running) { const s = runtime.status(); if (!s.workers.length && !s.sfuRunning) { plan.cleanup = { workersStopped: true }; plan.outcome = s.failure ? 'failed' : 'completed'; save() } } }, 1000)
  } catch (error) { console.error((error instanceof Error ? error.message : 'Rehearsal setup failed').replace(/#[a-f0-9]{64}/g, '#[redacted]')); process.exitCode = 1; monitor.interrupted('startup failed');void stop() }
})
process.once('SIGINT', () => void stop()); process.once('SIGTERM', () => void stop())
