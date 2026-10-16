"use client"
import { useEffect, useState } from "react"
import { ioButton, ioField } from "./SatelliteCard"

type FirewallState = { configured: boolean; addresses: string[] }
const endpoint = "/api/admin/zoom-bridge/encoder-ip"
export default function EncoderNetworkAccess() {
  const [ip, setIp] = useState("")
  const [state, setState] = useState<FirewallState | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  useEffect(() => {
    const abort = new AbortController()
    void fetch(endpoint, { cache: "no-store", signal: abort.signal }).then(async response => {
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Firewall status unavailable.")
      setState(data)
    }).catch(cause => { if (!abort.signal.aborted) setError(cause instanceof Error ? cause.message : "Firewall status unavailable.") })
    return () => abort.abort()
  }, [])
  async function detect() {
    setBusy(true); setError(""); setMessage(""); setConfirming(false)
    try {
      const response = await fetch(`${endpoint}?detect=1`, { cache: "no-store" })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "IP detection failed.")
      setIp(data.ip); setMessage("Detected this browser’s public IPv4. Check that OBS uses this same network before allowing it.")
    } catch (cause) { setError(cause instanceof Error ? cause.message : "IP detection failed.") }
    finally { setBusy(false) }
  }
  async function apply() {
    setBusy(true); setError(""); setMessage("")
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ip, confirm: true }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Firewall update failed.")
      setState(data); setConfirming(false)
      setMessage(data.applied ? `${data.ip} is allowed on UDP 9000. Start receiving, then start OBS. Other firewall rules were preserved.` : "AWS accepted the request but has not yet confirmed the address. Check status before retrying.")
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Firewall update failed.") }
    finally { setBusy(false) }
  }
  return <div className="io-encoder-network col-span-full mt-4 border-t border-white/10 pt-4">
    <h4 className="text-sm font-medium">Encoder network access</h4>
    <p className="mt-2 text-xs leading-5 text-slate-300">Allow the public IPv4 of the computer sending OBS or Telescope. Detection uses this browser’s connection. For a different computer or VPN, enter that encoder’s public IP instead.</p>
    <div className="mt-3 flex flex-wrap items-end gap-2"><label className="min-w-0 text-xs text-slate-300">Encoder public IPv4<input className={`${ioField} w-48 max-w-full`} placeholder="Public IPv4 address" value={ip} inputMode="decimal" maxLength={15} disabled={busy} onChange={event => { setIp(event.target.value); setConfirming(false); setMessage("") }} /></label><button type="button" className={ioButton} disabled={busy} onClick={() => { void detect() }}>Use this computer’s public IP</button><button type="button" className={ioButton} disabled={busy || !state?.configured || !ip.trim()} onClick={() => setConfirming(true)}>Allow encoder IP</button></div>
    {state?.configured === false ? <p className="mt-2 text-xs text-amber-200">Automatic firewall updates need AWS setup. Detection still works; no firewall rule has been changed.</p> : null}
    {state?.addresses.length ? <p className="mt-3 break-words text-xs text-slate-400">Allowed IPv4 sources on UDP 9000: {state.addresses.join(", ")}</p> : null}
    {confirming ? <div className="mt-3 rounded border border-amber-200/30 bg-amber-200/5 p-3"><p className="text-sm">Allow {ip} to connect to Io’s encrypted SRT receiver on UDP 9000? Existing allowed sources and other ports stay unchanged.</p><div className="mt-3 flex gap-2"><button type="button" className={ioButton} disabled={busy} onClick={() => { void apply() }}>Confirm and allow IP</button><button type="button" className={ioButton} disabled={busy} onClick={() => setConfirming(false)}>Cancel</button></div></div> : null}
    {message ? <p role="status" className="mt-3 text-xs text-emerald-200">{message}</p> : null}
    {error ? <p role="alert" className="mt-3 text-xs text-red-200">{error}</p> : null}
    <details className="mt-3 text-xs text-slate-300"><summary className="cursor-pointer">How to find the encoder’s public IP on Mac or Windows</summary><p className="mt-3 leading-5">Run this on the computer running OBS. Use the public address, not the local Wi-Fi/Ethernet address from network settings.</p><p className="mt-3">Mac: open Terminal and run:</p><code className="mt-1 block overflow-x-auto rounded bg-black/20 p-2">curl -4 https://checkip.amazonaws.com</code><p className="mt-3">Windows: open PowerShell or Command Prompt and run:</p><code className="mt-1 block overflow-x-auto rounded bg-black/20 p-2">curl.exe -4 https://checkip.amazonaws.com</code><p className="mt-3 leading-5">Paste the printed address above. Check again after changing networks or VPNs. This command asks Amazon’s IP-check service for your public IPv4.</p></details>
  </div>
}
