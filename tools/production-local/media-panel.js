const byId = id => document.getElementById(id)
let active = false

async function control(path, body, phase = 'phase2') {
  const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Jupiter-Local': phase }, body: JSON.stringify(body) })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error)
  return result
}

function initialize() {
  if (active) return
  active = true
  byId('media-panel').hidden = false
  if (byId('delivery-panel').hidden) byId('phase-description').textContent = 'Phase 4: supervised local Program and durable recording recovery.'
  byId('runtime-operations').hidden = false
  for (const mode of ['exit', 'freeze']) byId(`fault-${mode}`).onclick = () => void control('/api/media/fault', { role: byId('fault-role').value, mode }, 'phase4').catch(error => { byId('supervision-status').textContent = error.message })
  byId('local-notice').textContent = 'Local media only. Live sources are synthetic; optional uploaded assets stay on this Mac. A separate Chromium process runs Program; closing this console does not stop it. The Mac must remain awake. No cloud rooms or Vercel builds. Monitoring expires after two minutes; recording is separate and opt-in.'
  byId('record-start').textContent = 'Record local Program'
  byId('audio-description').textContent = 'Actual Program mix. Enable the synthetic source tones below, then save. Preview has separate audio intent; TAKE copies Preview audio.'
  byId('audio-channels').hidden = false
  byId('viewer-frame').src = '/viewer'
  byId('restart-renderer').onclick = () => void control('/api/media/restart-renderer', {}).catch(error => { byId('media-status').textContent = error.message })
  byId('record-start').onclick = () => void control('/api/media/record', { action: 'start' }).catch(error => { byId('media-status').textContent = error.message })
  byId('record-stop').onclick = () => void control('/api/media/record', { action: 'stop' }).catch(error => { byId('media-status').textContent = error.message })
}

async function refreshMedia() {
  const response = await fetch('/api/media/status', { cache: 'no-store' })
  if (response.status === 404) return
  if (!response.ok) throw new Error('Local media status unavailable')
  const data = await response.json(); initialize()
  const engine = data.engine; const observer = data.observer
  byId('source-warnings').textContent = [data.renderer?.report.error, ...(data.renderer?.report.sourceWarnings || [])].filter(Boolean).join(' / ') || 'No missing-source or renderer warnings.'
  for (const name of ['a', 'b']) byId(`pause-source-${name}`).textContent = `${data.sourcePaused?.[`camera-${name}`] ? 'Resume' : 'Pause'} synthetic ${name.toUpperCase()}`
  byId('media-status').textContent = `${engine.status.toUpperCase()} / generation ${engine.generation} / applied ${engine.appliedRevision ?? 'waiting'} / observed ${engine.observedRevision ?? 'waiting'}`
  byId('media-metrics').textContent = `Encoder: ${data.renderer?.fps ?? 0} fps / Receiver: ${observer?.fps ?? 0} unique fps at ${observer?.report.width ?? 0} x ${observer?.report.height ?? 0} / Audio RMS: ${(observer?.report.audioRms ?? 0).toFixed(4)} / Test expires: ${new Date(data.expiresAtMs).toLocaleTimeString()}`
  byId('engine-applied').textContent = `Engine applied: ${engine.appliedRevision ?? 'not reported'}`
  byId('output-observed').textContent = `Output observed: ${engine.observedRevision ?? 'not reported'}`
  byId('recording-status').textContent = data.recording ? `Recording ${data.recording.status} / ${Math.round(data.recording.bytes / 1024)} KB / maximum 3 minutes` : 'Recording off. Monitoring is not stored.'
  const download = byId('record-download')
  download.hidden = data.recording?.status !== 'complete'
  if (!download.hidden) download.href = `/api/media/recording-download?id=${data.recording.id}`
  const attempts = data.supervisor?.attempts || []
  const role = byId('fault-role').value
  const faultDisabled = !data.running || attempts.length >= 6 || attempts.filter(item => item.role === role && Date.now() - item.atMs < 300000).length >= 2
  byId('fault-exit').disabled = faultDisabled
  byId('fault-freeze').disabled = faultDisabled || !['renderer', 'observer'].includes(role)
  byId('restart-renderer').disabled = attempts.filter(item => item.role === 'renderer' && Date.now() - item.atMs < 300000).length >= 2 || attempts.length >= 6 || !data.running
  byId('supervision-status').textContent = `${data.running ? 'Supervisor active' : 'Runtime stopped'} / ${attempts.length} recovery attempts this run / last event: ${data.supervisor?.events.at(-1)?.event || 'starting'}`
  byId('record-start').disabled = data.recording?.status === 'recording' || !data.running
  byId('record-stop').disabled = data.recording?.status !== 'recording'
}
setInterval(() => void refreshMedia().catch(error => { if (active) byId('media-status').textContent = error.message }), 1000)
void refreshMedia().catch(() => {})

async function recordingHistory() {
  if (!active) return
  const response = await fetch('/api/media/recordings'); if (!response.ok) return
  const jobs = await response.json(), list = byId('recording-history'); list.replaceChildren()
  for (const job of jobs.toReversed().slice(0, 10)) {
    const row = document.createElement('p'); row.className = 'fine'
    row.textContent = `${new Date(job.startedAtMs).toLocaleTimeString()} / ${job.status} / ${Math.round(job.bytes / 1024)} KB${job.reason ? ` / ${job.reason}` : ''}`
    if (job.status === 'complete') { const link = document.createElement('a'); link.href = `/api/media/recording-download?id=${job.id}`; link.textContent = ' Download'; link.download = ''; row.append(link) }
    list.append(row)
  }
}
setInterval(() => void recordingHistory().catch(() => {}), 5000)
