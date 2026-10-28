const el = id => document.getElementById(id)
let current = null, pending = false, active = false
async function mutate(path, value) {
  const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Jupiter-Local': 'phase5' }, body: JSON.stringify(value) })
  const data = await r.json(); if (!r.ok) throw new Error(data.error); return data
}
async function choose(mode) {
  if (!current || pending) return
  pending = true
  try {
    await mutate('/api/media/delivery', { scope: current.scope, expectedRevision: current.revision, commandId: crypto.randomUUID(), mode })
    el('delivery-message').textContent = mode === 'program' ? 'Finished Program selected for this local event.' : 'Rolled back locally. Audience preview disconnected; Program engine continues.'
  } catch (error) { el('delivery-message').textContent = error.message }
  finally { pending = false; await refresh() }
}
async function refresh() {
  const response = await fetch('/api/media/delivery', { cache: 'no-store' }); if (response.status === 404) return
  if (!response.ok) throw new Error('Local delivery status unavailable')
  current = await response.json()
  if (!active) {
    active = true; el('delivery-panel').hidden = false
    el('phase-description').textContent = 'Phase 6: local audience load measurements and encoder profiles.'
    el('use-program').onclick = () => void choose('program')
    el('use-legacy').onclick = () => void choose('legacy')
    el('record-start').hidden = true; el('record-stop').hidden = true
    for (const action of ['start', 'stop']) el(`delivery-record-${action}`).onclick = () => void mutate('/api/media/delivery-record', { action }).then(() => { el('delivery-message').textContent = action === 'start' ? 'Explicit local Program recording requested.' : 'Recording stop requested; waiting for file finalization.' }).catch(error => { el('delivery-message').textContent = error.message })
  }
  el('delivery-state').textContent = `${current.mode === 'program' ? 'Finished Program' : 'Legacy'} / local event ${current.scope.eventId} / delivery revision ${current.revision}`
  el('use-program').disabled = pending || !current.ready || current.mode === 'program'
  el('use-legacy').disabled = pending || current.mode === 'legacy'
  const status = await (await fetch('/api/media/status', { cache: 'no-store' })).json()
  el('delivery-record-start').disabled = !current.ready || current.mode !== 'program' || status.recording?.status === 'recording'
  el('delivery-record-stop').disabled = status.recording?.status !== 'recording'
}
setInterval(() => void refresh().catch(error => { if (active) el('delivery-message').textContent = error.message }), 1000)
void refresh().catch(() => {})
