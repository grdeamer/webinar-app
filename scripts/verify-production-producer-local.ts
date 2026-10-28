import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { copyFileSync, existsSync } from 'node:fs'
import { chromium, type BrowserServer } from 'playwright-core'
import { qualityWindow, type QualityPoint } from '../lib/production/haQualityMetrics.ts'
import { writePrivateJson } from '../lib/production/localAtomicFile.ts'
import type { LocalHaRuntime } from '../lib/production/localHaRuntime.ts'
import type { ProductionCommand, ProductionState, Composition } from '../lib/production/contracts.ts'

type Status = { runtime: ReturnType<LocalHaRuntime['status']>; state: ProductionState; sourceReports: Record<string, { frames: number; videoTrackSid: string }>; sources: Record<string, { kind: string }> }
const base = 'http://127.0.0.1:4311', path = resolve(import.meta.dirname, '../.local/production/ha/producer-rehearsal/verification.json')
if (existsSync(path)) copyFileSync(path, path.replace('.json', `-${Date.now()}.json`))
const result = { outcome: 'running', runId: '', checks: [] as { check: string; evidence: unknown }[], errors: [] as string[], cleanup: null as unknown, limitations: ['Explicit in-memory capture stub only; no native getUserMedia or physical-device validation.', 'Native screen chooser and real file codecs/lip-sync remain attended rehearsal checks.'], recordingEnabled: false, cloudDeployed: false }
let browserServer: BrowserServer | null = null
let watchdog: ReturnType<typeof setTimeout> | null = null
const deadline = Date.now() + 180_000, delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
function pass(check: string, evidence: unknown) { result.checks.push({ check, evidence }); writePrivateJson(path, result); console.log(`PASS ${check}`) }
async function read(): Promise<Status> { const response = await fetch(base + '/api/producer/status'); assert.equal(response.status, 200); const s = await response.json(); if (result.runId) assert.equal(s.runtime.runId, result.runId); return s }
async function post(path: string, body: Record<string, unknown>) { const response = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Jupiter-Local': 'producer-rehearsal' }, body: JSON.stringify({ runId: result.runId, ...body }) }); const x = await response.json(); assert.equal(response.status, 200, x.error); return x }
async function command(command: ProductionCommand) { const s = await read(); return post('/api/producer/command', { command, expectedRevision: s.state.revision, consoleId: 'rehearsal-verifier', commandId: crypto.randomUUID() }) }
async function until(check: (s: Status) => boolean, message: string, limit = 15_000) { const end = Math.min(deadline, Date.now() + limit); while (Date.now() < end) { const s = await read(); assert.equal(s.runtime.running, true); assert.equal(s.runtime.recordingEnabled, false); if (check(s)) return s; await delay(150) }; throw new Error(message) }
const receiver = (s: Status) => s.runtime.observer as { revision: number; candidate: string; generation: number; width: number; height: number; audioRms: number; videoTrackSid: string; validFrames: number; atMs: number; presentedFrames: number; rtc: { framesDecoded: number }; lastSelection: { firstPresentedAtMs: number; videoGapMs: number } } | null
function warm(s: Status) { const g = s.runtime.gateway as { atMs: number; inputs: Record<string, { revision: number; ageMs: number }> } | null; return (['primary', 'standby'] as const).every(id => { const c = s.runtime.candidates[id], input = g?.inputs[`candidate-${id}`]; return Boolean(c && !c.error && c.revision === s.state.revision && Date.now() - c.progressedAtMs < 600 && input && input.revision === s.state.revision && Date.now() - g!.atMs + input.ageMs < 250) }) }
const composition = (sourceId: string): Composition => ({ sceneId: null, layers: [{ id: 'main', kind: 'camera' as const, sourceId, props: { x: 0, y: 0, width: 640, height: 360, borderRadius: 0, shadowIntensity: 0 } }] })
try {
  const initial = await read(); result.runId = initial.runtime.runId; assert.equal(initial.runtime.rehearsal, true)
  await until(s => Object.values(s.sources).every(source => ['demo', 'disconnected'].includes(source.kind)), 'An input is still owned; leave an attended capture alone', 15_000)
  for (const role of ['source-a', 'source-b']) if ((await read()).sources[role].kind === 'disconnected') await post('/api/producer/input', { action: 'demo', role })
  await until(s => Boolean(s.state.bindings['camera-a'] && s.state.bindings['camera-b'] && receiver(s)?.width === 1920), 'Demo input bindings/output not ready')
  await command({ type: 'SET_PREVIEW', composition: composition('camera-a') }); await command({ type: 'SET_AUDIO', bus: 'preview', audio: { masterGainDb: -6, muted: false, channels: [{ sourceId: 'camera-a', gainDb: -12, muted: false, solo: false }] } }); await command({ type: 'TAKE', transition: { type: 'cut', durationMs: 0 } }); await command({ type: 'SET_LIVE', live: true })
  let state = await until(s => receiver(s)?.revision === s.state.revision && receiver(s)!.audioRms > .0005, 'Committed demo Program not received with audio')
  const priorProgram = JSON.stringify(state.state.program), sid = receiver(state)!.videoTrackSid
  await command({ type: 'SET_PREVIEW', composition: composition('camera-b') }); state = await until(s => receiver(s)?.revision === s.state.revision, 'Preview-only revision not applied')
  assert.equal(JSON.stringify(state.state.program), priorProgram)
  pass('Preview edits preserve committed Program; independent receiver acknowledges state', { width: receiver(state)!.width, height: receiver(state)!.height, revision: state.state.revision })
  await command({ type: 'TAKE', transition: { type: 'fade', durationMs: 500 } }); state = await until(s => receiver(s)?.revision === s.state.revision, 'Fade TAKE not observed')
  assert.equal(state.state.program.composition.layers[0].sourceId, 'camera-b'); assert.equal(state.state.transition?.type, 'fade')
  const overlay = composition('camera-a'); overlay.layers.push({ id: 'title', kind: 'text', sourceId: null, props: { x: 20, y: 290, width: 550, height: 50, content: 'LOCAL REHEARSAL CHECK', fontSize: 22 } })
  await command({ type: 'SET_PREVIEW', composition: overlay }); await command({ type: 'TAKE', transition: { type: 'cut', durationMs: 0 } }); await until(s => receiver(s)?.revision === s.state.revision, 'Title not applied to Program')
  pass('Cut/fade TAKE and title rendering flow through both compositors to the same Program publication', { videoTrackSid: sid })
  const sceneId = 'rehearsal-verification', scene = (await read()).state.scenes[sceneId]
  await command({ type: 'SAVE_SCENE', sceneId, name: 'Rehearsal verification', expectedSceneVersion: scene?.version ?? null }); await command({ type: 'SET_PREVIEW', composition: composition('camera-b') }); state = await read(); await command({ type: 'LOAD_SCENE', sceneId, sceneVersion: state.state.scenes[sceneId].version }); state = await read(); assert.equal(state.state.preview.composition.layers.length, 2)
  const audio = { masterGainDb: -6, muted: true, channels: [{ sourceId: 'camera-a', gainDb: -12, muted: false, solo: false }] }
  await command({ type: 'SET_AUDIO', bus: 'program', audio }); await until(s => receiver(s)?.revision === s.state.revision && receiver(s)!.audioRms < .0001, 'Program mute not observed')
  await command({ type: 'SET_AUDIO', bus: 'program', audio: { ...audio, muted: false } }); await until(s => receiver(s)?.revision === s.state.revision && receiver(s)!.audioRms > .0005, 'Program unmute not observed')
  pass('Saved scene reload and Program mute/unmute are observed independently', { sceneId })
  browserServer = await chromium.launchServer({ channel: 'chrome', headless: true, host: '127.0.0.1', chromiumSandbox: true, env: { PATH: process.env.PATH ?? '', HOME: process.env.HOME ?? '', TMPDIR: process.env.TMPDIR ?? '/tmp', NODE_ENV: 'development' }, args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] })
  watchdog = setTimeout(() => browserServer?.process().kill('SIGTERM'), Math.max(1, deadline - Date.now()))
  const browser = await chromium.connect(browserServer.wsEndpoint()), context = await browser.newContext({ serviceWorkers: 'block', permissions: ['camera', 'microphone'] })
  await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort())
  await context.addInitScript("window.MediaRecorder = class { constructor() { throw new Error('Recording forbidden in rehearsal verification') } }")
  // Owned application media worker. It exercises capture/publish code with Chrome's fake devices, not the user's camera or browser.
  const page = await context.newPage(); page.on('console', msg => { if (msg.text().startsWith('REHEARSAL_CAPTURE_STAGE ')) console.log(msg.text()) }); await page.goto(base + '/producer')
  await page.evaluate(`(async () => {
    const { BoundedFrameWriter } = await import('/runtime/frame-writer.js')
    const { scheduleFrames } = await import('/runtime/common.js')
    const synthetic = async constraints => {
      const surface=document.createElement('canvas');surface.width=1920;surface.height=1080;const ctx=surface.getContext('2d'), stream=surface.captureStream(30)
      const stop=scheduleFrames(now=>{ctx.fillStyle='#073b60';ctx.fillRect(0,0,1920,1080);ctx.fillStyle='#47d6ed';ctx.fillRect(now/5%1800,300,120,300)})
      let audio=null, oscillator=null
      if(constraints.audio){audio=new AudioContext();await audio.resume();const out=audio.createMediaStreamDestination();oscillator=audio.createOscillator();oscillator.frequency.value=440;const gain=audio.createGain();gain.gain.value=.08;oscillator.connect(gain).connect(out);oscillator.start();stream.addTrack(out.stream.getAudioTracks()[0])}
      window.rehearsalFakeCleanup=async()=>{stop();stream.getTracks().forEach(t=>t.stop());oscillator?.stop();await audio?.close()};return stream
    }
    Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,value:synthetic})
    const { ProducerInput } = await import('/producer-input.js')
    const api = async (path, body, capability) => { const state = await (await fetch('/api/producer/status')).json(); const r = await fetch(path, { method:'POST',headers:{'Content-Type':'application/json','X-Jupiter-Local':'producer-rehearsal',...(capability?{'X-Input-Capability':capability}:{})},body:JSON.stringify({runId:state.runtime.runId,...body}) });const data=await r.json();if(!r.ok)throw new Error(data.error);return data }
    window.rehearsalProbe = new ProducerInput('source-a',api,text => { window.rehearsalProbeState=text; console.log('REHEARSAL_CAPTURE_STAGE '+text) })
    await window.rehearsalProbe.start('camera',true)
  })()`)
  state = await until(s => s.sources['source-a'].kind === 'camera' && Boolean((s.sourceReports['camera-a']?.frames ?? 0) > 20) && receiver(s)!.validFrames > 30, 'Fake device did not publish and bind')
  const cameraSid = state.sourceReports['camera-a'].videoTrackSid
  await until(s => Boolean((s.runtime.candidateMedia.primary?.sourceWarnings as string[] | undefined)?.length === 0 && (s.runtime.candidateMedia.standby?.sourceWarnings as string[] | undefined)?.length === 0), 'Compositors did not receive the fake camera')
  pass('Operator capture publisher binds a synthetic capture stub into private input; both compositors consume it', { cameraSid, encoding: state.runtime.sourceMedia['source-a'].encoding, realDeviceAccess: false })
  const points: QualityPoint[] = [], measureUntil = Date.now() + 21_000
  while (Date.now() < measureUntil) {
    const s = await read(), r = receiver(s)!; assert.equal(r.videoTrackSid, sid)
    points.push({ atMs: r.atMs, frames: r.validFrames, decoded: r.rtc.framesDecoded, presented: r.presentedFrames, width: r.width, height: r.height, generation: r.generation, videoTrackSid: r.videoTrackSid }); await delay(1000)
  }
  const measured = qualityWindow(points); assert.ok(measured.fullHdThroughout && [measured.distinctFps, measured.decodedFps, measured.presentedFps].every(n => n >= 29.5 && n <= 30.5))
  pass('Integrated capture-stub Program holds full HD at measured 30 fps target', measured)
  for (const kind of ['stall', 'crash']) {
    const current = await read()
    if (current.runtime.selected !== 'primary') { await until(warm, 'Both renderer inputs must be decoded before failback'); const current = await read(); const r = await fetch(base + '/api/ha/action', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Jupiter-Local': 'phase7' }, body: JSON.stringify({ action: 'promote-primary', runId: result.runId, expectedGeneration: current.runtime.generation }) }); assert.equal(r.status, 200); await until(s => receiver(s)?.candidate === 'primary', 'Failback not observed') }
    const before = await read(), began = Date.now()
    const fault = async (action: string) => { const s = await read(); const r = await fetch(base + '/api/ha/action', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Jupiter-Local': 'phase7' }, body: JSON.stringify({ action, runId: result.runId, expectedGeneration: s.runtime.generation }) }); assert.equal(r.status, 200) }
    await fault(kind === 'stall' ? 'freeze-primary' : 'crash-primary')
    const recovered = await until(s => receiver(s)?.candidate === 'standby' && receiver(s)!.generation > before.runtime.generation && receiver(s)!.lastSelection.firstPresentedAtMs >= began, 'Fake-input failover not observed')
    assert.equal(receiver(recovered)!.videoTrackSid, sid); assert.ok(receiver(recovered)!.lastSelection.videoGapMs < 1000)
    await fault(kind === 'stall' ? 'heal-primary' : 'restart-primary'); await until(warm, 'Primary not restored with independently decoded media')
    pass(`${kind} recovery preserves fake-input Program publication`, { gapMs: receiver(recovered)!.lastSelection.videoGapMs })
  }
  await page.evaluate('(async()=>{await window.rehearsalProbe.stop();await window.rehearsalFakeCleanup()})()'); await until(s => !s.state.bindings['camera-a'], 'Input stop did not unbind')
  await until(s => Boolean((s.runtime.candidateMedia.standby?.sourceWarnings as string[] | undefined)?.some(w => w.includes('camera-a'))), 'Missing input did not report fallback')
  await post('/api/producer/input', { action: 'demo', role: 'source-a' }); await until(s => s.sources['source-a'].kind === 'demo' && Boolean(s.state.bindings['camera-a']), 'Demo restoration failed')
  await command({ type: 'SET_LIVE', live: false }); await until(s => receiver(s)?.revision === s.state.revision && receiver(s)!.audioRms < .0001, 'Off-air slate/silence not observed')
  pass('Stop input unbinds it, reports fallback, permits explicit demo restore and off-air silence', { recordingEnabled: false })
  await browser.close(); browserServer = null; result.cleanup = { fakeCaptureStopped: true, fakeBrowserClosed: true, rehearsalLeftOffAir: true }; result.outcome = 'completed'
} catch (error) { result.outcome = 'failed'; result.errors.push(error instanceof Error ? error.message : 'Rehearsal verification failed'); process.exitCode = 1 }
finally { if (watchdog) clearTimeout(watchdog); if (browserServer) await browserServer.close(); writePrivateJson(path, result); console.log(`PRODUCER VERIFICATION ${result.outcome}: ${result.errors.join('; ')}`) }
