import { ProducerInput } from './producer-input.js'
import { LocalAssets } from '/runtime/assets.js'
import { drawComposition } from '/runtime/scene-renderer.js'
const LK = window.LivekitClient, el = id => document.getElementById(id)
const consoleId = sessionStorage.getItem('jupiter-local-producer') || crypto.randomUUID(); sessionStorage.setItem('jupiter-local-producer', consoleId)
let snapshot = null, busy = false, refreshing = false, shuttingDown = false, failures = 0, priorAudio = null, priorPreview = null, preparedRevision = -1, viewerRooms = []
const captures = new Map(), inputs = new Map(), assets = new LocalAssets(), previewContext = el('preview').getContext('2d'), programStream = new MediaStream()
el('program').srcObject = programStream
function message(text, error = false) { el('message').textContent = text; el('message').className = error ? 'error' : '' }
async function api(path, body, capability) {
  const response = await fetch(path, { method: 'POST', signal: AbortSignal.timeout(8000), headers: { 'Content-Type': 'application/json', 'X-Jupiter-Local': 'producer-rehearsal', ...(capability ? { 'X-Input-Capability': capability } : {}) }, body: JSON.stringify({ runId: snapshot?.runtime.runId, ...body }) })
  const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Local request failed'); return data
}
async function refresh() {
  if (refreshing) return; refreshing = true
  try {
    const r = await fetch('/api/producer/status', { cache: 'no-store', signal: AbortSignal.timeout(4000) }); if (!r.ok) throw new Error('Local rehearsal is unavailable')
    const next = await r.json(); if (snapshot && next.runtime.runId !== snapshot.runtime.runId) { await shutdown(); throw new Error('This rehearsal ended; reload to join the new run') }
    snapshot = next; failures = 0
    if (!snapshot.runtime.running || Date.now() >= snapshot.runtime.expiresAtMs) await shutdown()
    for (const [id, report] of Object.entries(snapshot.sourceReports || {})) { const input = inputs.get(snapshot.state.bindings[id]?.participantIdentity); if (input) input.sourceProgressAtMs = report.progressedAtMs }
    render()
  } catch (error) { if (++failures >= 3) { await shutdown(); message(`Local connection lost; captures stopped. ${error.message}`, true) } }
  finally { refreshing = false }
}
function render() {
  const { runtime: r, state } = snapshot, observer = r.observer, now = Date.now()
  el('health').textContent = !r.running ? 'Rehearsal stopped' : `Local engine · ${r.selected || 'no ready'} compositor · generation ${r.generation}`
  el('expires').textContent = r.running ? `Expires in ${Math.max(0, Math.ceil((r.expiresAtMs - now) / 60000))} min` : 'Captures disconnected'
  el('live').textContent = state.desiredLifecycle === 'live' ? 'Take local Program off air' : 'Set local Program live'
  el('program-status').textContent = `${state.desiredLifecycle === 'live' ? 'Local live' : 'Off air'} · committed r${state.revision} · received r${observer?.revision ?? '—'} · ${observer?.width || 0}×${observer?.height || 0} · ${observer?.rtc?.framesPerSecond ?? '—'} decoded fps`
  el('audio-status').textContent = `Independent Program meter: ${observer?.audioRms > 0 ? (20 * Math.log10(observer.audioRms)).toFixed(1) + ' dBFS' : 'silence'} · monitoring ${el('listen').checked ? 'on' : 'muted'}`
  el('engine-detail').textContent = `Primary ${r.candidates.primary?.error || (now - (r.candidates.primary?.progressedAtMs || 0) < 1200 ? 'fresh' : 'waiting/stale')}; standby ${r.candidates.standby?.error || (now - (r.candidates.standby?.progressedAtMs || 0) < 1200 ? 'fresh' : 'waiting/stale')}. Gateway ${r.gateway?.outputTransport || 'starting'}; last takeover gap ${observer?.lastSelection?.videoGapMs ?? '—'} ms. Recording disabled.`
  for (const role of ['source-a', 'source-b']) { const encoded = r.sourceMedia[role]?.encoding, state = snapshot.sources[role]; el(`${role}-kind`).textContent = `${state.kind} · ${encoded?.width || '—'}×${encoded?.height || '—'} sent`; }
  const preview = JSON.stringify(state.preview.composition)
  if (preview !== priorPreview) { priorPreview = preview; el('title').value = state.preview.composition.layers.find(l => l.id === 'title')?.props.content || ''; el('logo').checked = state.preview.composition.layers.some(l => l.id === 'logo') }
  const audio = JSON.stringify(state.program.audio)
  if (audio !== priorAudio) {
    priorAudio = audio; el('master').value = state.program.audio.masterGainDb; el('master-mute').checked = state.program.audio.muted
    for (const name of ['a', 'b']) { const channel = state.program.audio.channels.find(c => c.sourceId === `camera-${name}`); el(`gain-${name}`).value = channel?.gainDb ?? 0; el(`mute-${name}`).checked = channel?.muted ?? true }
  }
  const selected = el('scenes').value; el('scenes').replaceChildren()
  for (const scene of Object.values(state.scenes)) { const option = document.createElement('option'); option.value = scene.sceneId; option.textContent = `${scene.name} · v${scene.version}`; el('scenes').append(option) }
  if (state.scenes[selected]) el('scenes').value = selected
  for (const button of document.querySelectorAll('button')) button.disabled = busy || !r.running
  el('stop-all').disabled = !r.running
  for (const [role, capture] of captures) {
    const kind = snapshot.sources[role].kind, elsewhere = ['camera', 'screen', 'file'].includes(kind) && !capture.room && !capture.pending
    if (!capture.room && !capture.pending) el(`${role}-state`).textContent = elsewhere ? `${kind} input is owned by another local tab` : kind === 'demo' ? 'Demo source available. Capture is off.' : 'Disconnected · choose an input'
    for (const button of document.querySelectorAll(`[data-input-role="${role}"] [data-kind]`)) button.disabled = busy || !r.running || elsewhere || (capture.pending && button.dataset.kind !== 'stop') || (['pause', 'rewind'].includes(button.dataset.kind) && !capture.fileVideo)
  }
  const ready = candidate => { const c = r.candidates[candidate], input = r.gateway?.inputs[`candidate-${candidate}`]; return c && !c.error && c.revision === state.revision && now - c.progressedAtMs < 600 && input && input.revision === state.revision && now - r.gateway.atMs + input.ageMs < 250 }
  for (const button of document.querySelectorAll('[data-fault]')) { const action = button.dataset.fault; if (action.startsWith('promote-')) button.disabled ||= !ready(action.slice(8)); if (['freeze-primary', 'crash-primary'].includes(action)) button.disabled ||= r.selected !== 'primary' || r.workers.find(w => w.role === 'primary')?.exited; if (action === 'restart-primary') button.disabled ||= !r.workers.find(w => w.role === 'primary')?.exited }
}
async function command(command) {
  if (!snapshot || busy) return
  busy = true; render()
  try { const result = await api('/api/producer/command', { consoleId, commandId: crypto.randomUUID(), expectedRevision: snapshot.state.revision, command }); snapshot.state = result.currentState; message(`Committed r${result.receipt.revision}. Check received Program before continuing.`); await refresh() }
  catch (error) { message(`${error.message}. Refresh the current state before retrying.`, true); await refresh() }
  finally { busy = false; render() }
}
const layer = (sourceId, props = {}) => ({ id: `layer-${sourceId}`, kind: 'camera', sourceId, props: { x: 0, y: 0, width: 640, height: 360, fit: 'contain', borderRadius: 0, shadowIntensity: 0, ...props } })
function overlays(layers) {
  const title = el('title').value.trim()
  if (title) layers.push({ id: 'title', kind: 'text', sourceId: null, props: { x: 20, y: 295, width: 520, height: 45, content: title, fontSize: 22, color: '#ffffff', backgroundColor: '#102433', borderRadius: 6, shadowIntensity: 0, zIndex: 3 } })
  if (el('logo').checked) layers.push({ id: 'logo', kind: 'image', sourceId: null, props: { x: 540, y: 20, width: 80, height: 48, assetId: 'brand-mark', borderRadius: 0, shadowIntensity: 0, zIndex: 4 } })
  return { sceneId: null, layers }
}
for (const button of document.querySelectorAll('[data-select]')) button.addEventListener('click', () => void command({ type: 'SET_PREVIEW', composition: overlays([layer(button.dataset.select)]) }))
el('split').onclick = () => void command({ type: 'SET_PREVIEW', composition: overlays([layer('camera-a', { x: 0, width: 320 }), layer('camera-b', { x: 320, width: 320 })]) })
el('pip').onclick = () => void command({ type: 'SET_PREVIEW', composition: overlays([layer('camera-a'), layer('camera-b', { x: 430, y: 30, width: 190, height: 107, zIndex: 2 })]) })
el('apply-overlay').onclick = () => void command({ type: 'SET_PREVIEW', composition: overlays(snapshot.state.preview.composition.layers.filter(l => !['title', 'logo'].includes(l.id))) })
el('take').onclick = () => void command({ type: 'TAKE', transition: { type: el('transition').value, durationMs: el('transition').value === 'fade' ? 500 : 0 } })
el('live').onclick = () => void command({ type: 'SET_LIVE', live: snapshot.state.desiredLifecycle !== 'live' })
el('apply-audio').onclick = () => void command({ type: 'SET_AUDIO', bus: 'program', audio: { masterGainDb: Number(el('master').value), muted: el('master-mute').checked, channels: ['a', 'b'].map(name => ({ sourceId: `camera-${name}`, gainDb: Number(el(`gain-${name}`).value), muted: el(`mute-${name}`).checked, solo: false })) } })
el('copy-audio').onclick = () => void command({ type: 'SET_AUDIO', bus: 'preview', audio: snapshot.state.program.audio })
el('save-scene').onclick = () => { const name = el('scene-name').value.trim(), sceneId = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); void command({ type: 'SAVE_SCENE', name, sceneId, expectedSceneVersion: snapshot.state.scenes[sceneId]?.version ?? null }) }
el('load-scene').onclick = () => { const scene = snapshot.state.scenes[el('scenes').value]; if (scene) void command({ type: 'LOAD_SCENE', sceneId: scene.sceneId, sceneVersion: scene.version }) }
for (const name of ['a', 'b']) {
  const role = `source-${name}`, article = document.createElement('article'); article.dataset.inputRole = role
  article.innerHTML = `<h2>Input ${name.toUpperCase()}</h2><p id="${role}-kind" class="fine"></p><p id="${role}-state" class="input-state" role="status">Demo source available. Capture is off.</p><label><input id="${role}-audio" type="checkbox"> Include input audio</label><div class="input-actions"><button data-kind="camera">Start camera</button><button data-kind="screen">Share screen</button><button data-kind="stop">Stop input</button><button data-kind="demo">Use demo</button></div><label>Existing file <input id="${role}-file" type="file" accept="video/mp4,video/webm"></label><div class="input-actions"><button data-kind="file">Play file as input</button><button data-kind="pause">Pause / resume file</button><button data-kind="rewind">Rewind file</button></div>`
  el('inputs').append(article)
  const capture = new ProducerInput(role, api, text => { el(`${role}-state`).textContent = text }); captures.set(role, capture)
  for (const button of article.querySelectorAll('[data-kind]')) button.onclick = async () => {
    const kind = button.dataset.kind
    try {
      if (kind === 'stop') { if (capture.room || capture.pending) await capture.stop(); else await api('/api/producer/input', { action: 'stop-demo', role }) }
      else if (kind === 'demo') { await capture.stop(); await api('/api/producer/input', { action: 'demo', role }); message('Demo source restored locally; Preview/Program selection was not changed.') }
      else if (kind === 'pause') capture.togglePlayback()
      else if (kind === 'rewind') capture.rewind()
      else { await capture.start(kind, el(`${role}-audio`).checked, el(`${role}-file`).files[0]); message(`Input ${name.toUpperCase()} connected locally. Select it in Preview and TAKE when ready.`) }
      await refresh()
    } catch (error) { message(error.message, true) }
  }
}
async function connectMonitors() {
  for (const kind of ['input', 'program']) {
    const config = await api('/api/producer/viewer', { room: kind }), room = new LK.Room({ adaptiveStream: false, dynacast: false, rtcConfig: { iceServers: [] } }); viewerRooms.push(room)
    room.on(LK.RoomEvent.TrackSubscribed, (track, publication, participant) => {
      if (kind === 'program') { if (!/^program-engine-\d+$/.test(participant.identity)) return; for (const old of programStream.getTracks()) if (old.kind === track.mediaStreamTrack.kind) programStream.removeTrack(old); programStream.addTrack(track.mediaStreamTrack); void el('program').play().catch(() => {}) }
      else {
        let input = inputs.get(participant.identity); if (!input) { input = { video: null, lastFrameAt: 0, sourceProgressAtMs: 0 }; inputs.set(participant.identity, input) }
        if (track.kind === 'video') { const video = document.createElement('video'); video.muted = true; video.autoplay = true; video.playsInline = true; video.srcObject = new MediaStream([track.mediaStreamTrack]); input.video = video; void video.play().catch(() => {}); const decoded = () => { input.lastFrameAt = performance.now(); if (input.video === video) video.requestVideoFrameCallback(decoded) }; video.requestVideoFrameCallback(decoded) }
      }
    })
    room.on(LK.RoomEvent.TrackUnsubscribed, (track, publication, participant) => { if (kind === 'program') programStream.removeTrack(track.mediaStreamTrack); else { const input = inputs.get(participant.identity); if (input && track.kind === 'video') { input.lastFrameAt = 0; input.video = null } } })
    await room.connect(config.url, config.token, { autoSubscribe: true })
  }
}
el('listen').onchange = () => { el('program').muted = !el('listen').checked; void el('program').play().catch(error => message(error.message, true)) }
async function shutdown() { if (shuttingDown) return; shuttingDown = true; await Promise.allSettled([...captures.values()].map(c => c.stop())); await Promise.allSettled(viewerRooms.map(r => r.disconnect())); viewerRooms = []; el('program').muted = true; el('listen').checked = false }
el('stop-all').onclick = async () => { try { await shutdown(); const r = snapshot.runtime; const response = await fetch('/api/ha/action', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Jupiter-Local': 'phase7' }, body: JSON.stringify({ action: 'stop', runId: r.runId, expectedGeneration: r.generation }) }); if (!response.ok) throw new Error('Engine Stop was not acknowledged'); await refresh(); message('Rehearsal and captures stopped. No recording was created.') } catch (error) { message(error.message, true) } }
for (const button of document.querySelectorAll('[data-fault]')) button.onclick = async () => { try { const r = snapshot.runtime, response = await fetch('/api/ha/action', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Jupiter-Local': 'phase7' }, body: JSON.stringify({ action: button.dataset.fault, runId: r.runId, expectedGeneration: r.generation }) }); const x = await response.json(); if (!response.ok) throw new Error(x.error); message('Local recovery action acknowledged. Check independent received Program.'); await refresh() } catch (error) { message(error.message, true) } }
window.addEventListener('pagehide', () => { for (const c of captures.values()) { c.stream?.getTracks().forEach(t => t.stop()); void c.stop() }; void shutdown() }, { once: true })
await refresh()
if (snapshot?.runtime.running) await connectMonitors().catch(error => message(error.message, true))
setInterval(() => void refresh(), 1000)
setInterval(() => {
  if (!snapshot) return
  const bus = snapshot.state.preview
  if (preparedRevision !== snapshot.state.revision) { preparedRevision = snapshot.state.revision; void assets.prepare(bus.composition).catch(error => message(error.message, true)) }
  const warnings = drawComposition(previewContext, bus, snapshot.state, inputs, assets)
  el('preview-status').textContent = `Preview r${snapshot.state.revision} · ${warnings.join('; ') || 'composition ready'} · not transmitted to Program until TAKE`
}, 1000 / 30)
