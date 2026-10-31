'use client'
import { useCallback, useEffect, useState } from 'react'
type Infrastructure = { state: string; stopAtMs: number | null }
export default function Ec2ProducerControls({ root }: { root: string }) {
  const [status, setStatus] = useState<Infrastructure | null>(null), [busy, setBusy] = useState(false), [message, setMessage] = useState('')
  const refresh = useCallback(async () => {
    const response = await fetch(`${root}/infrastructure`, { cache: 'no-store', signal: AbortSignal.timeout(15_000) })
    if (!response.ok) throw new Error('EC2 status unavailable; no start attempted')
    setStatus(await response.json())
  }, [root])
  useEffect(() => { let active = true; const poll = (): void => { void refresh().catch((): void => { if (active) setMessage('EC2 status unavailable') }) }; poll(); const timer = setInterval(poll, 5000); return () => { active = false; clearInterval(timer) } }, [refresh])
  async function action(path: string) {
    setBusy(true); setMessage('Requesting EC2 change…')
    try {
      const response = await fetch(`${root}/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(30_000) })
      if (!response.ok) throw new Error('EC2 request was not confirmed. Refresh status before trying again.')
      const value = await response.json(); setStatus(value)
      setMessage(path === 'prepare' ? 'Shutdown armed. EC2 is starting; engine startup may take a few minutes.' : 'EC2 stop requested. The independent shutdown remains armed.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Request failed') }
    finally { setBusy(false); void refresh().catch((): void => {}) }
  }
  return <section className="space-y-3 rounded border p-4" aria-label="EC2 producer engine">
    <h2 className="font-semibold">AWS EC2 On-Demand producer engine</h2>
    <p>State: {status?.state || 'Checking…'}{status?.stopAtMs ? ` · automatic stop ${new Date(status.stopAtMs).toLocaleString()}` : ''}</p>
    <div className="flex gap-3"><button type="button" disabled={busy || status?.state !== 'stopped'} onClick={() => void action('prepare')} className="rounded border px-4 py-2 disabled:opacity-50">Start producer engine</button><button type="button" disabled={busy || !status || !['running', 'pending'].includes(status.state)} onClick={() => void action('stop-infrastructure')} className="rounded border px-4 py-2 disabled:opacity-50">Stop producer engine</button></div>
    <p role="status" aria-live="polite">{message}</p>
    <p className="text-sm">Starting incurs AWS usage. The approved session envelope is $5; automatic shutdown is armed before starting, within 30 minutes. Restarting retains the existing deadline. No recording. Storage and reserved IP costs continue while stopped.</p>
  </section>
}
