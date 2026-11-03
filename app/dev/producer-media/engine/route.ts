import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import type { AudioMix } from '@/lib/production/contracts'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const origin = 'http://127.0.0.1:4311'
function allowed(request: Request): boolean {
  const url = new URL(request.url)
  return process.env.NODE_ENV === 'development' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    && request.headers.get('sec-fetch-site') !== 'cross-site'
    && (!request.headers.get('origin') || request.headers.get('origin') === url.origin)
}
async function read() {
  const response = await fetch(origin + '/api/producer/status', { cache: 'no-store', signal: AbortSignal.timeout(2000) })
  if (!response.ok) throw new Error('Local engine unavailable')
  const status = await response.json()
  if (status.externalServices !== false || status.recordingEnabled !== false || status.runtime.cloudDeployed || !status.runtime.rehearsal) throw new Error('A local-only, recording-disabled rehearsal is required')
  return status
}
function publicStatus(status: Awaited<ReturnType<typeof read>>) {
  const { runtime, state } = status, receiver = runtime.observer
  return { runId: runtime.runId, revision: state.revision, running: runtime.running, live: state.desiredLifecycle === 'live', expiresAtMs: runtime.expiresAtMs, recordingEnabled: false,
    mix: state.program.audio, channels: Object.values(state.sources as Record<string, {sourceId: string; label: string}>).map(source => ({ sourceId: source.sourceId, label: source.label })),
    receiver: receiver ? { revision: receiver.revision, atMs: receiver.atMs, audioRms: receiver.audioRms, dominantHz: receiver.dominantHz, width: receiver.width, height: receiver.height, fps: receiver.rtc?.framesPerSecond ?? null } : null }
}
export async function GET(request: Request) {
  if (!allowed(request)) return new Response('Not found', { status: 404 })
  try { return NextResponse.json(publicStatus(await read()), { headers: { 'Cache-Control': 'no-store' } }) }
  catch { return NextResponse.json({ error: 'Local audio engine is stopped. Start npm run production:producer:local in a separate terminal.' }, { status: 503 }) }
}
export async function POST(request: Request) {
  if (!allowed(request)) return new Response('Not found', { status: 404 })
  if (request.headers.get('origin') !== new URL(request.url).origin || !request.headers.get('content-type')?.startsWith('application/json')) return NextResponse.json({ error: 'Same-origin JSON required' }, { status: 403 })
  try {
    const body = await request.text()
    if (body.length > 16000) throw new Error('Request too large')
    const input = JSON.parse(body), initial = await read(), runId = initial.runtime.runId
    if (!initial.runtime.running || input.runId !== runId || input.expectedRevision !== initial.state.revision) return NextResponse.json({ error: 'Engine or revision changed. Refresh before retrying.' }, { status: 409 })
    let expectedRevision = initial.state.revision
    async function command(command: unknown) {
      const current = await read()
      if (current.runtime.runId !== runId || !current.runtime.running) throw new Error('Rehearsal changed or stopped')
      const response = await fetch(origin + '/api/producer/command', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Jupiter-Local': 'producer-rehearsal' }, body: JSON.stringify({ runId, expectedRevision, consoleId: 'local-media-mixer', commandId: randomUUID(), command }), signal: AbortSignal.timeout(4000) })
      if (!response.ok) throw new Error('Local Program command was not confirmed; refresh after a revision conflict')
      const committed = await response.json()
      expectedRevision = committed.currentState.revision
    }
    if (input.action === 'mix') await command({ type: 'SET_AUDIO', bus: 'program', audio: input.mix })
    else if (input.action === 'prepare') {
      // Explicitly prepares synthetic A/B; never joins an external room or starts a worker.
      if (Object.values(initial.sources as Record<string, {kind:string}>).some(source => source.kind !== 'demo')) throw new Error('Test preparation requires both generated demo inputs; active captures are preserved')
      const mix: AudioMix = { masterGainDb: -6, muted: false, channels: ['camera-a','camera-b'].map(sourceId => ({ sourceId, gainDb: -12, muted: false, solo: false })) }
      await command({ type: 'SET_PREVIEW', composition: { sceneId: null, layers: ['camera-a','camera-b'].map((sourceId,i) => ({ id: `mixer-test-${i}`, kind: 'camera', sourceId, props: { x: i*320, y: 0, width: 320, height: 360 } })) } })
      await command({ type: 'SET_AUDIO', bus: 'preview', audio: mix })
      await command({ type: 'TAKE', transition: { type: 'cut', durationMs: 0 } })
      await command({ type: 'SET_LIVE', live: true })
    } else throw new Error('Unsupported local mixer action')
    return NextResponse.json(publicStatus(await read()), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Local mixer unavailable' }, { status: 400 }) }
}
