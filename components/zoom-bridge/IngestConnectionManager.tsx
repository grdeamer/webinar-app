"use client"
import { useState } from "react"
import { Copy, RefreshCw } from "lucide-react"
import { ioButton } from "./SatelliteCard"
export type IngestInfo = { configured: boolean; host: string; port: number; keyRevision?: string; appliedKeyRevision?: string; keyUpdatedAt?: string | null }
export default function IngestConnectionManager({ ingest, receiving, fresh, busy, copy, regenerate }: {
  ingest: IngestInfo | null; receiving: boolean; fresh: boolean; busy: boolean; copy: () => void; regenerate: () => Promise<boolean>;
}) {
  const [confirming, setConfirming] = useState(false)
  const pending = ingest?.keyRevision !== ingest?.appliedKeyRevision
  return <section className="mt-5 rounded-2xl border border-blue-300/20 bg-black/20 p-5">
    <h3 className="font-semibold">Manage ingest connection</h3>
    <div className="mt-4 grid gap-4 text-sm sm:grid-cols-3"><div><p className="text-xs text-white/40">Receiver</p><p className="mt-1">{ingest?.configured ? `${ingest.host} · UDP ${ingest.port}` : "Not configured"}</p></div><div><p className="text-xs text-white/40">Connection status</p><p className="mt-1">{!fresh ? "Controller unavailable" : pending ? "Applying new key…" : receiving ? "Program receiving" : "Waiting for encoder"}</p></div><div><p className="text-xs text-white/40">Key last regenerated</p><p className="mt-1">{ingest?.keyUpdatedAt ? new Date(ingest.keyUpdatedAt).toLocaleString() : "Original connection"}</p></div></div>
    <p className="mt-4 text-xs leading-5 text-white/45">Reuse this connection for normal sessions. Jupiter securely manages the encrypted SRT passphrase and updates the receiver automatically. AWS console access is not required. The encoder’s public IP must already be allowed by the receiver firewall.</p>
    <div className="mt-4 flex flex-wrap gap-2"><button type="button" className={ioButton} disabled={busy || !ingest?.configured || pending} onClick={copy}><Copy size={16} />Copy encoder connection</button><button type="button" className={ioButton} disabled={busy || !ingest?.configured || pending || !fresh} onClick={() => setConfirming(true)}><RefreshCw size={16} />Regenerate key</button></div>
    {confirming ? <div className="mt-4 rounded-xl border border-amber-300/25 bg-amber-300/5 p-4"><p className="text-sm text-amber-100">Regenerating invalidates the previous connection and briefly interrupts program reception. After the receiver applies the new key, copy the new connection into OBS and restart streaming. Connected satellites stay in their meetings.</p><div className="mt-3 flex gap-2"><button type="button" className={ioButton} disabled={busy} onClick={() => { void regenerate().then(ok => { if (ok) setConfirming(false) }) }}>Regenerate and replace key</button><button type="button" className={ioButton} disabled={busy} onClick={() => setConfirming(false)}>Cancel</button></div></div> : null}
  </section>
}
