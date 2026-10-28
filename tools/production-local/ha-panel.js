let state = null, busy = false
async function refresh() {
  try {
    state = await (await fetch('/api/ha/status', { cache: 'no-store' })).json()
    document.getElementById('ha-state').textContent = `${state.running ? 'Running' : 'Stopped'} · selected ${state.selected} · generation ${state.generation} · authority ${state.authorityAvailable ? 'available' : 'unavailable'}${state.partition ? ` · ${state.partition} control partitioned` : ''}${state.failure ? ` · ${state.failure}` : ''}`
    const observer = state.observer
    document.getElementById('ha-receiver').textContent = observer ? `Receiver: ${observer.candidate || 'slate'} / generation ${observer.generation} / revision ${observer.revision ?? 'none'} · ${observer.validFrames} distinct pictures · content provenance ${observer.contentCandidate || 'none'} · tone ${Math.round(observer.dominantHz || 0)} Hz · audio RMS ${observer.audioRms.toFixed(4)} · ${state.running && Date.now() - observer.atMs < 2000 ? 'fresh' : 'historical'}` : 'Waiting for independent receiver'
    document.getElementById('ha-gateway').textContent = `Gateway publication epoch ${state.gatewayEpoch} · ${state.workers.filter(x => !x.exited).length} local workers · recording off`
    document.getElementById('ha-candidates').textContent = JSON.stringify(state.candidates, null, 2)
    document.getElementById('ha-boundaries').replaceChildren(...state.boundaries.map(item => {
      const row = document.createElement('tr'); for (const value of [item.generation, item.selected, item.reason]) { const cell = document.createElement('td'); cell.textContent = String(value); row.append(cell) }; return row
    }))
    const soak = await (await fetch('/api/ha/soak-result?summary=1', { cache: 'no-store' })).json()
    if (soak) {
      document.getElementById('ha-soak-state').textContent = `${soak.outcome} · recording off${soak.error ? ` · ${soak.error}` : ''}`
      document.getElementById('ha-soak-progress').textContent = `${(soak.elapsedObservationMs / 60000).toFixed(1)} / 60 minutes observed · ${soak.windows.length} assessed steady windows · ${(soak.measuredSteadyMs / 60000).toFixed(1)} qualified steady minutes${soak.expectedFinishAtMs ? ` · ${['running', 'starting'].includes(soak.outcome) ? 'scheduled finish' : 'original finish (run stopped)'} ${new Date(soak.expectedFinishAtMs).toLocaleTimeString()}` : ''}`
      const last = soak.windows.at(-1)?.metrics
      document.getElementById('ha-soak-fps').textContent = last ? `Latest 1080p window: ${last.distinctFps.toFixed(2)} distinct / ${last.decodedFps.toFixed(2)} decoded / ${last.presentedFps.toFixed(2)} presented fps` : 'Waiting for the first full measurement window.'
      document.getElementById('ha-soak-events').replaceChildren(...soak.events.map(event => { const p = document.createElement('p'); p.textContent = `Minute ${event.scheduledMinute} ${event.kind}: ${event.pictureGapMs === undefined ? 'pending' : `${event.pictureGapMs} ms picture gap`}${event.restoredAtMs ? ' · both candidates warm again' : ''}`; return p }))
      if (['failed', 'cancelled'].includes(soak.outcome) && soak.events.length === 0) document.getElementById('ha-soak-events').textContent = 'Run stopped before any scheduled crash or stall test.'
    }
    const quality = await (await fetch('/api/ha/quality-result?summary=1', { cache: 'no-store' })).json()
    if (quality) {
      document.getElementById('ha-quality-state').textContent = `${quality.outcome} · ${quality.measurements?.length || 0} quality windows · ${quality.cleanup?.workersStopped ? 'test workers stopped' : 'measurement / cleanup pending'}${quality.error ? ` · ${quality.error}` : ''}${quality.runId !== state.runId ? ' · previous run' : ''}`
      document.getElementById('ha-quality-windows').replaceChildren(...(quality.measurements || []).map(item => {
        const row = document.createElement('tr'), m = item.metrics
        for (const value of [item.label, `${m.minimumWidth} × ${m.minimumHeight}`, m.distinctFps.toFixed(2), m.decodedFps.toFixed(2), m.presentedFps?.toFixed(2) || 'not measured', m.seconds.toFixed(1)]) { const cell = document.createElement('td'); cell.textContent = value; row.append(cell) }
        return row
      }))
      document.getElementById('ha-quality-failovers').replaceChildren(...quality.checks.filter(x => x.evidence.event).map(item => { const p = document.createElement('p'); p.textContent = `${item.check}: ${item.evidence.decodedPictureGapMs} ms picture gap; first recovered picture ${item.evidence.firstRecoveredAfterMs} ms after injection.`; return p }))
    }
    const result = await (await fetch('/api/ha/result?summary=1', { cache: 'no-store' })).json()
    if (result) {
      document.getElementById('ha-result').textContent = `${result.outcome} · ${result.checks.length} checks · ${result.cleanup?.workersStopped ? 'workers stopped' : 'cleanup pending'}${result.error ? ` · ${result.error}` : ''}${result.runId !== state.runId ? ' · previous run' : ''}`
      const measured = result.checks.at(-1)?.evidence?.receiver
      if (measured) document.getElementById('ha-gaps').textContent = `Entire functional drill, including asset loading and authority outages: maximum picture interval ${(measured.maxVideoGapMs / 1000).toFixed(3)} s · maximum audible-sample interval ${(measured.maxAudioGapMs / 1000).toFixed(3)} s (100 ms sampling). Local functional drill; sustained HD/FPS and multi-host availability remain untested.`
      document.getElementById('ha-checks').replaceChildren(...result.checks.map(check => { const p = document.createElement('p'); p.textContent = `✓ ${check.check}`; return p }))
    }
    for (const button of document.querySelectorAll('[data-action]')) button.disabled = busy || !state.running || ((state.managedSoak || state.managedLoad) && button.dataset.action !== 'stop')
  } catch { document.getElementById('ha-state').textContent = 'Local HA lab unavailable' }
}
for (const button of document.querySelectorAll('[data-action]')) button.onclick = async () => {
  if (!state || busy) return; busy = true
  try {
    const response = await fetch('/api/ha/action', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Jupiter-Local': 'phase7' }, body: JSON.stringify({ action: button.dataset.action, runId: state.runId, expectedGeneration: state.generation }) })
    const value = await response.json(); if (!response.ok) throw new Error(value.error)
    document.getElementById('ha-message').textContent = 'Local action applied. Watch the independent receiver for actual recovery.'
  } catch (error) { document.getElementById('ha-message').textContent = error.message }
  finally { busy = false; await refresh() }
}
void refresh(); setInterval(refresh, 1000)
