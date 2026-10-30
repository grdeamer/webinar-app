'use client'
import { useState } from 'react'
export default function PrepareHostedRehearsal({ root, minutes, cap, perSession = false }: { root: string; minutes: number; cap: number; perSession?: boolean }) {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('')
  async function prepare() {
    setBusy(true); setMessage('Preparing the temporary worker. This can take a few minutes…')
    try {
      const response = await fetch(`${root}/prepare`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(290_000) })
      if (!response.ok) { const result = await response.json(); throw new Error(result.error || 'Preparation was not confirmed. Check the trial status before retrying.') }
      setMessage(`Worker prepared. Open the rehearsal once the engine is ready. The cloud worker expires within ${minutes} minutes of creation.`)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Preparation failed') }
    // Keep disabled after the attempt: trial preparation is single-use, never an automatic retry.
  }
  return <div className="space-y-3"><button type="button" disabled={busy} onClick={() => void prepare()} className="rounded border px-4 py-2 disabled:opacity-50">Prepare approved temporary worker</button><p role="status" aria-live="polite">{message}</p><p className="text-sm">One temporary 8-vCPU worker, automatic expiry within {minutes} minutes, no snapshots or recording. {perSession ? 'Approved session cap' : 'Approved cumulative test cap'}: ${cap}. Opening the studio does not start another worker.</p></div>
}
