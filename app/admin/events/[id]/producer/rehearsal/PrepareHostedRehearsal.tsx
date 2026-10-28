'use client'
import { useState } from 'react'
export default function PrepareHostedRehearsal({ root }: { root: string }) {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('')
  async function prepare() {
    setBusy(true); setMessage('Preparing the temporary worker. This can take a few minutes…')
    try {
      const response = await fetch(`${root}/prepare`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(290_000) })
      if (!response.ok) throw new Error('Preparation was not confirmed. Do not retry automatically; check the trial status.')
      setMessage('Worker prepared. Open the rehearsal once the engine is ready. The cloud worker expires within 30 minutes of creation.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Preparation failed') }
    // Keep disabled after the attempt: trial preparation is single-use, never an automatic retry.
  }
  return <div className="space-y-3"><button type="button" disabled={busy} onClick={() => void prepare()} className="rounded border px-4 py-2 disabled:opacity-50">Prepare approved temporary worker</button><p role="status" aria-live="polite">{message}</p><p className="text-sm">One temporary 8-vCPU worker, automatic expiry within 30 minutes, no snapshots or recording. Reserved test allowance: $8 within the approved $10 total cap. Opening the studio does not start another worker.</p></div>
}
