'use client'
import { useState } from 'react'
export default function Ec2SetupDownload({ root }: { root: string }) {
  const [message, setMessage] = useState(''), [busy, setBusy] = useState(false)
  async function download() {
    setBusy(true)
    try {
      const r = await fetch(`${root}/seal-ec2-configuration`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(15_000) })
      if (!r.ok) throw new Error('Encrypted setup unavailable or expired')
      const url = URL.createObjectURL(await r.blob()), anchor = document.createElement('a')
      anchor.href = url; anchor.download = 'producer-ec2-config.sealed.json'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 10000)
      setMessage('Encrypted setup downloaded. Only the approved EC2 host can decrypt it.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Setup download failed') }
    finally { setBusy(false) }
  }
  return <details><summary>Temporary migration setup</summary><button type="button" disabled={busy} onClick={() => void download()} className="rounded border px-4 py-2">Download encrypted engine setup</button><p role="status">{message}</p></details>
}
