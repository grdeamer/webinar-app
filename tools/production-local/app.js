/* Offline workbench only. No external services or media access. */
let state = null
let busy = false
const consoleId = sessionStorage.getItem('jupiter-phase1-console') || crypto.randomUUID()
sessionStorage.setItem('jupiter-phase1-console', consoleId)
const byId = id => document.getElementById(id)
byId('console-id').textContent = `Console ${consoleId.slice(0, 8)}`

function message(text, error = false) {
  byId('message').textContent = text
  byId('message').className = error ? 'error' : ''
}

function sourceName(bus) {
  const preset = parityPresets?.find(item => item.id === bus.composition.sceneId)
  if (preset) return preset.name
  const layer = bus.composition.layers[0]
  return layer ? (state.sources[layer.sourceId]?.label || layer.kind) : 'Empty'
}

function render() {
  byId('revision').textContent = `Committed revision ${state.revision}`
  byId('preview-name').textContent = sourceName(state.preview)
  byId('program-name').textContent = sourceName(state.program)
  byId('lifecycle').textContent = `Desired lifecycle: ${state.desiredLifecycle}`
  byId('live').textContent = state.desiredLifecycle === 'live' ? 'Request off-air state' : 'Request live state'
  byId('gain').value = state.program.audio.masterGainDb
  byId('mute').checked = state.program.audio.muted
  byId('tone-a').checked = state.program.audio.channels.some(channel => channel.sourceId === 'camera-a' && !channel.muted)
  byId('tone-b').checked = state.program.audio.channels.some(channel => channel.sourceId === 'camera-b' && !channel.muted)
  byId('snapshot').textContent = JSON.stringify(state, null, 2)
  const selected = byId('scene-list').value
  byId('scene-list').replaceChildren()
  for (const scene of Object.values(state.scenes)) {
    const option = document.createElement('option')
    option.value = scene.sceneId; option.textContent = `${scene.name} / version ${scene.version}`
    byId('scene-list').append(option)
  }
  if (state.scenes[selected]) byId('scene-list').value = selected
}

async function refreshHistory() {
  const response = await fetch(`/api/commands?afterRevision=${Math.max(0, state.revision - 12)}`, { cache: 'no-store' })
  if (!response.ok) throw new Error('Could not read local command history')
  const data = await response.json()
  byId('history').replaceChildren()
  for (const receipt of data.commands.toReversed()) {
    const row = document.createElement('tr')
    for (const value of [receipt.revision, receipt.command.type, receipt.actorId.slice(0, 12), new Date(receipt.committedAtMs).toLocaleTimeString()]) {
      const cell = document.createElement('td'); cell.textContent = String(value); row.append(cell)
    }
    byId('history').append(row)
  }
}

async function refresh() {
  if (busy) return
  const response = await fetch('/api/state', { cache: 'no-store' })
  if (!response.ok) throw new Error('Could not read local snapshot')
  const snapshot = (await response.json()).state
  if (busy || (state && snapshot.revision <= state.revision)) return
  state = snapshot
  render(); await refreshHistory()
}

async function command(value) {
  if (!state || busy) return
  busy = true
  try {
    const response = await fetch('/api/commands', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Jupiter-Local': 'phase1', 'X-Console-Id': consoleId },
      body: JSON.stringify({ schemaVersion: 1, scope: state.scope, commandId: crypto.randomUUID(), expectedRevision: state.revision, command: value }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(`${data.code || 'Error'}: ${data.error}`)
    state = data.currentState; render(); await refreshHistory()
    message(`Committed revision ${data.receipt.revision}. Engine application and output are not yet reported.`)
  } catch (error) { message(error.message, true) }
  finally { busy = false }
}

for (const button of document.querySelectorAll('[data-source]')) button.addEventListener('click', () => {
  void command({ type: 'SET_PREVIEW', composition: { sceneId: null, layers: [{ id: 'main', kind: 'camera', sourceId: button.dataset.source, props: { x: 0, y: 0, width: 640, height: 360 } }] } })
})
byId('take').addEventListener('click', () => void command({ type: 'TAKE', transition: { type: byId('transition').value, durationMs: byId('transition').value === 'cut' ? 0 : 500 } }))
byId('live').addEventListener('click', () => void command({ type: 'SET_LIVE', live: state.desiredLifecycle !== 'live' }))
byId('audio').addEventListener('click', () => {
  const channels = byId('audio-channels').hidden ? state.program.audio.channels : ['a', 'b'].map(name => ({ sourceId: `camera-${name}`, gainDb: -12, muted: !byId(`tone-${name}`).checked, solo: false }))
  void command({ type: 'SET_AUDIO', bus: 'program', audio: { channels, masterGainDb: Number(byId('gain').value), muted: byId('mute').checked } })
})
byId('save-scene').addEventListener('click', () => {
  const name = byId('scene-name').value.trim()
  const sceneId = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  void command({ type: 'SAVE_SCENE', sceneId, name, expectedSceneVersion: state.scenes[sceneId]?.version ?? null })
})
byId('load-scene').addEventListener('click', () => {
  const scene = state.scenes[byId('scene-list').value]
  if (scene) void command({ type: 'LOAD_SCENE', sceneId: scene.sceneId, sceneVersion: scene.version })
})
byId('refresh').addEventListener('click', () => void refresh().catch(error => message(error.message, true)))
let parityPresets = []
let localAssets = []
async function refreshAssets() {
  const r = await fetch('/api/media/assets'); if (!r.ok) return
  localAssets = await r.json(); byId('asset-list').replaceChildren()
  for (const asset of localAssets) { const option = document.createElement('option'); option.value = asset.id; option.textContent = `${asset.name} / ${asset.kind}`; byId('asset-list').append(option) }
}
async function initializeParity() {
  const response = await fetch('/api/media/presets')
  if (!response.ok) return
  parityPresets = await response.json()
  byId('parity-controls').hidden = false
  byId('local-assets').hidden = false; await refreshAssets()
  for (const preset of parityPresets) { const option = document.createElement('option'); option.value = preset.id; option.textContent = preset.name; byId('parity-preset').append(option) }
}
byId('asset-upload').addEventListener('click', async () => {
  try {
    const file = byId('asset-file').files[0]; if (!file) throw new Error('Choose a local file first')
    const r = await fetch(`/api/media/assets?name=${encodeURIComponent(file.name)}`, { method: 'POST', headers: { 'Content-Type': file.type, 'X-Jupiter-Local': 'phase3' }, body: file })
    const asset = await r.json(); if (!r.ok) throw new Error(asset.error)
    await refreshAssets(); byId('asset-list').value = asset.id; message(`Registered ${asset.name} locally. It is not on Program.`)
  } catch (error) { message(error.message, true) }
})
byId('asset-preview').addEventListener('click', async () => {
  const asset = localAssets.find(item => item.id === byId('asset-list').value); if (!asset) return
  await command({ type: 'SET_PREVIEW', composition: { sceneId: null, layers: [{ id: 'local-asset', kind: asset.kind, sourceId: null, props: { assetId: asset.id, page: Number(byId('asset-page').value), x: 0, y: 0, width: 640, height: 360, borderRadius: 0, shadowIntensity: 0 } }] } })
  if (asset.kind === 'video') await command({ type: 'SET_PLAYBACK', bus: 'preview', layerId: 'local-asset', positionMs: 0, paused: false, loop: true })
})
byId('legacy-import').addEventListener('click', async () => {
  try {
    const r = await fetch('/api/media/import', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Jupiter-Local': 'phase3' }, body: JSON.stringify({ blocks: JSON.parse(byId('legacy-blocks').value), sourceIds: JSON.parse(byId('legacy-sources').value) }) })
    const data = await r.json(); if (!r.ok) throw new Error(data.error)
    await command({ type: 'SET_PREVIEW', composition: data })
  } catch (error) { message(error.message, true) }
})
byId('load-preset').addEventListener('click', async () => {
  const preset = parityPresets.find(item => item.id === byId('parity-preset').value)
  if (!preset) return
  await command({ type: 'SET_PREVIEW', composition: preset.composition })
  if (state.preview.composition.layers.some(layer => layer.id === 'clip')) await command({ type: 'SET_PLAYBACK', bus: 'preview', layerId: 'clip', positionMs: 0, paused: false, loop: true })
})
for (const name of ['a', 'b']) byId(`pause-source-${name}`).addEventListener('click', async () => {
  try {
    const response = await fetch('/api/media/source-control', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Jupiter-Local': 'phase2' }, body: JSON.stringify({ sourceId: `camera-${name}`, paused: byId(`pause-source-${name}`).textContent.startsWith('Pause') }) })
    const data = await response.json(); if (!response.ok) throw new Error(data.error)
    byId(`pause-source-${name}`).textContent = `${data.paused ? 'Resume' : 'Pause'} synthetic ${name.toUpperCase()}`
  } catch (error) { message(error.message, true) }
})
void initializeParity().catch(error => message(error.message, true))
setInterval(() => { if (byId('auto-refresh').checked) void refresh().catch(error => message(error.message, true)) }, 2500)
void refresh().catch(error => message(error.message, true))
