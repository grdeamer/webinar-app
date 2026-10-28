const panel = document.getElementById('scale-panel'), select = document.getElementById('encoding-profile'), message = document.getElementById('encoding-state')
let encoding = null, busy = false
async function refresh() {
  try {
    const response = await fetch('/api/media/encoding', { cache: 'no-store' }); if (!response.ok) return
    encoding = await response.json(); panel.hidden = false
    if (document.activeElement !== select && !busy) select.value = encoding.profile
    message.textContent = `Requested: ${encoding.profile} · Renderer confirmed: ${encoding.applied?.profile || 'waiting'}${encoding.applied && Date.now() - encoding.applied.atMs > 4000 ? ' (stale)' : ''}`
    const result = await (await fetch('/api/media/scale-result', { cache: 'no-store' })).json()
    if (!result) return
    document.getElementById('scale-summary').textContent = `Last local run: ${result.outcome} · ${result.stages.length} measured stages${result.error ? ` · ${result.error}` : ''} · cleanup: ${result.cleanup?.subscribersClosed && result.cleanup?.profileRestored ? 'verified' : 'pending'}`
    const rows = result.stages.map(stage => {
      const row = document.createElement('tr')
      const values = [`${stage.profile} / ${stage.viewers}${stage.delayMs ? ` (+${stage.delayMs} ms HTTP only)` : ''}`, stage.receivers.map(r => r.distinctMarkerFps?.toFixed(1) ?? 'unavailable').join(' / '), stage.receivers.map(r => (r.receivedVideoBitsPerSecond / 1e6).toFixed(2)).join(' / '), (stage.ownedCpuCorePercent / 100).toFixed(2), `${(stage.peakOwnedRssBytes / 1024 ** 3).toFixed(2)} GiB`]
      for (const value of values) { const cell = document.createElement('td'); cell.textContent = value; row.append(cell) }
      return row
    })
    document.getElementById('scale-results').replaceChildren(...rows)
  } catch { message.textContent = 'Local load lab unavailable' }
}
document.getElementById('apply-encoding').onclick = async () => {
  if (!encoding || busy) return
  busy = true
  try {
    const response = await fetch('/api/media/encoding', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Jupiter-Local': 'phase6' }, body: JSON.stringify({ ...encoding, profile: select.value }) })
    const result = await response.json(); if (!response.ok) throw new Error(result.error)
    await refresh()
  } catch (error) { message.textContent = error.message }
  finally { busy = false }
}
void refresh(); setInterval(refresh, 2000)
