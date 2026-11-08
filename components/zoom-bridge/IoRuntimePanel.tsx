'use client'
import { useCallback, useEffect, useState } from 'react'
import { startVisibilityPoll } from '@/lib/browser/visibilityPoll'
type Status = { configured?: boolean; state?: string; stopAtMs?: number | null; canStart?: boolean; error?: string }
export default function IoRuntimePanel() {
  const [status, setStatus] = useState<Status>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const refresh = useCallback(async (signal?:AbortSignal) => {
    try { const response = await fetch('/api/admin/zoom-bridge/runtime', { cache: 'no-store', signal }); const value = await response.json(); if (!response.ok) throw Error('Server status unavailable'); if(signal?.aborted)return; setStatus(value); setError('') }
    catch (failure) { if(!signal?.aborted)setError('Unable to verify shared EC2 status.'); throw failure }
  }, [])
  useEffect(() => { const poll=startVisibilityPoll({run:refresh,intervalMs:15000}); return ()=>poll.stop() }, [refresh])
  async function command(action: 'start' | 'stop') {
    if (action === 'stop' && !window.confirm('Stop the shared server? This disconnects Io satellites and the producer engine.')) return
    setBusy(true); setError('')
    try { const response = await fetch('/api/admin/zoom-bridge/runtime', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) }); const value = await response.json(); if (!response.ok) throw Error(value.error || 'Request failed'); await refresh() }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Request failed') }
    finally { setBusy(false) }
  }
  if (!status.configured && !error) return null
  return <section className="rounded-xl border border-blue-300/20 bg-slate-950/70 p-5"><h2 className="font-semibold">Io server · EC2 On-Demand</h2><p className="mt-2 text-sm text-slate-300">Shared with the producer engine. $0.357 per running hour, plus bandwidth. Automatic shutdown within 30 minutes; starting again does not extend it.</p><div className="mt-3 flex flex-wrap items-center gap-3"><span className="text-sm">{status.state || 'Checking status'}</span>{status.stopAtMs ? <span className="text-sm text-slate-400">Stops by {new Date(status.stopAtMs).toLocaleTimeString()}</span> : null}{status.canStart ? <button type="button" disabled={busy || status.state !== 'stopped'} onClick={() => void command('start')} className="rounded-lg border border-white/20 px-3 py-2 text-sm disabled:opacity-40">Start shared server</button> : null}<button type="button" disabled={busy || !['running', 'pending'].includes(status.state || '')} onClick={() => void command('stop')} className="rounded-lg border border-white/20 px-3 py-2 text-sm disabled:opacity-40">Stop shared server</button></div><p className="mt-3 text-xs text-slate-400">After starting, select Start receiving, then connect each satellite. Saved settings remain; previous meeting connections do not resume automatically. Capacity on this shared host is not yet load-tested.</p>{error ? <p role="alert" className="mt-2 text-sm text-amber-200">{error}</p> : null}</section>
}
