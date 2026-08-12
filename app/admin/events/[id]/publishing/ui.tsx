"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { CheckCircle2, ExternalLink, Globe2, History, Loader2, RotateCcw, Server, UploadCloud } from "lucide-react"

type Destination = {
  id: string
  name: string
  protocol: "ftp" | "ftps"
  host: string
  port: number
  username: string
  remote_path: string
  public_url: string | null
  last_tested_at: string | null
  last_published_at: string | null
  last_status: string | null
  last_error: string | null
}

type Deployment = {
  id: string
  destination_id: string
  status: string
  created_at: string
  completed_at: string | null
  backup_path: string | null
}

const inputClass = "mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-300/40 focus:ring-2 focus:ring-violet-400/15"

export default function ExternalPublishingClient({ eventId }: { eventId: string }) {
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [deployments, setDeployments] = useState<Deployment[]>([])
  const [selectedId, setSelectedId] = useState("")
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ name: "LETS Production", protocol: "ftps", host: "", port: "21", username: "", password: "", remote_path: "/public_html", public_url: "https://letstrainonline.live" })

  const load = useCallback(async () => {
    const [destinationResponse, historyResponse] = await Promise.all([
      fetch(`/api/admin/events/${eventId}/publishing/destinations`, { cache: "no-store" }),
      fetch(`/api/admin/events/${eventId}/publishing/history`, { cache: "no-store" }),
    ])
    const destinationPayload = await destinationResponse.json()
    const historyPayload = await historyResponse.json()
    if (!destinationResponse.ok) throw new Error(destinationPayload.error || "Could not load publishing destinations")
    if (!historyResponse.ok) throw new Error(historyPayload.error || "Could not load publishing history")
    setDestinations(destinationPayload.destinations || [])
    setDeployments(historyPayload.deployments || [])
    setSelectedId((current) => current || destinationPayload.destinations?.[0]?.id || "")
  }, [eventId])

  useEffect(() => { void load().catch((loadError) => setError(loadError.message)) }, [load])

  async function run(action: string, input: Record<string, unknown>) {
    setBusy(action)
    setMessage(null)
    setError(null)
    try {
      const response = await fetch(`/api/admin/events/${eventId}/publishing/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) })
      const payload = await response.json().catch((): null => null)
      if (!response.ok) throw new Error(payload?.error || `${action} failed`)
      setMessage(action === "test" ? "Connection successful." : action === "rollback" ? "Previous version restored." : "Site published successfully.")
      await load()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : `${action} failed`)
    } finally {
      setBusy(null)
    }
  }

  async function saveDestination() {
    setBusy("save")
    setMessage(null)
    setError(null)
    try {
      const response = await fetch(`/api/admin/events/${eventId}/publishing/destinations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, port: Number(form.port) }) })
      const payload = await response.json().catch((): null => null)
      if (!response.ok) throw new Error(payload?.error || "Could not save destination")
      setSelectedId(payload.destination.id)
      setForm((current) => ({ ...current, password: "" }))
      setMessage("Destination saved. Test the connection before publishing.")
      await load()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save destination")
    } finally {
      setBusy(null)
    }
  }

  const selected = destinations.find((destination) => destination.id === selectedId) || null

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(56,189,248,.07),transparent_24%),radial-gradient(circle_at_82%_18%,rgba(168,85,247,.08),transparent_26%),linear-gradient(180deg,#050816_0%,#040712_42%,#02040a_100%)] p-6 text-white">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="rounded-[26px] border border-white/[.08] bg-white/[.035] p-7">
          <div className="flex items-start justify-between gap-6">
            <div><div className="text-[10px] font-black uppercase tracking-[.2em] text-violet-100/50">External Experience Delivery</div><h1 className="mt-3 text-3xl font-semibold tracking-[-.03em]">Publish</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">Deploy the attendee experience to an external FTP or FTPS destination. Credentials are encrypted and remain server-side.</p></div>
            <Link href={`/admin/events/${eventId}/page-editor`} className="rounded-xl border border-white/10 bg-white/[.04] px-4 py-2 text-sm font-semibold text-white/70 hover:bg-white/10">Open Experience</Link>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[1fr_.9fr]">
          <section className="rounded-[26px] border border-white/[.08] bg-white/[.035] p-7">
            <div className="flex items-center gap-3"><Server className="text-violet-200" size={20} /><div><h2 className="font-semibold">New destination</h2><p className="text-xs text-white/40">FTPS is recommended when your host supports it.</p></div></div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-semibold text-white/60">Destination name<input className={inputClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
              <label className="text-xs font-semibold text-white/60">Connection<select className={inputClass} value={form.protocol} onChange={(event) => setForm({ ...form, protocol: event.target.value })}><option value="ftps">FTPS (encrypted)</option><option value="ftp">FTP</option></select></label>
              <label className="text-xs font-semibold text-white/60">Host<input className={inputClass} placeholder="ftp.example.com" value={form.host} onChange={(event) => setForm({ ...form, host: event.target.value })} /></label>
              <label className="text-xs font-semibold text-white/60">Port<input className={inputClass} inputMode="numeric" value={form.port} onChange={(event) => setForm({ ...form, port: event.target.value })} /></label>
              <label className="text-xs font-semibold text-white/60">Username<input className={inputClass} autoComplete="username" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} /></label>
              <label className="text-xs font-semibold text-white/60">Password<input className={inputClass} type="password" autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
              <label className="text-xs font-semibold text-white/60 sm:col-span-2">Remote folder<input className={inputClass} placeholder="/public_html" value={form.remote_path} onChange={(event) => setForm({ ...form, remote_path: event.target.value })} /></label>
              <label className="text-xs font-semibold text-white/60 sm:col-span-2">Public URL<input className={inputClass} placeholder="https://letstrainonline.live" value={form.public_url} onChange={(event) => setForm({ ...form, public_url: event.target.value })} /></label>
            </div>
            <button type="button" onClick={saveDestination} disabled={Boolean(busy)} className="mt-6 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold hover:bg-violet-500 disabled:opacity-50">{busy === "save" ? "Saving…" : "Save destination"}</button>
          </section>

          <section className="rounded-[26px] border border-white/[.08] bg-white/[.035] p-7">
            <div className="flex items-center gap-3"><Globe2 className="text-sky-200" size={20} /><div><h2 className="font-semibold">Publish</h2><p className="text-xs text-white/40">Only Jupiter-managed attendee files are replaced.</p></div></div>
            <label className="mt-6 block text-xs font-semibold text-white/60">Destination<select className={inputClass} value={selectedId} onChange={(event) => setSelectedId(event.target.value)}><option value="">Choose a destination</option>{destinations.map((destination) => <option key={destination.id} value={destination.id}>{destination.name}</option>)}</select></label>
            {selected ? <div className="mt-4 rounded-2xl border border-white/[.08] bg-black/20 p-4 text-sm text-white/55"><div className="font-semibold text-white/85">{selected.protocol.toUpperCase()} • {selected.host}:{selected.port}</div><div className="mt-1">{selected.remote_path}</div>{selected.last_status ? <div className="mt-3 flex items-center gap-2 text-xs"><CheckCircle2 size={14} className="text-emerald-300" />{selected.last_status}</div> : null}</div> : null}
            <div className="mt-5 grid gap-3 sm:grid-cols-2"><button type="button" disabled={!selectedId || Boolean(busy)} onClick={() => run("test", { destination_id: selectedId })} className="rounded-xl border border-white/10 bg-white/[.05] px-4 py-3 text-sm font-semibold hover:bg-white/10 disabled:opacity-40">Test Connection</button><button type="button" disabled={!selectedId || Boolean(busy)} onClick={() => run("publish", { destination_id: selectedId })} className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold hover:bg-emerald-500 disabled:opacity-40">{busy === "publish" ? <Loader2 className="animate-spin" size={16} /> : <UploadCloud size={16} />}Publish Site</button></div>
            {selected?.public_url ? <a className="mt-4 inline-flex items-center gap-2 text-sm text-sky-200/75 hover:text-sky-100" href={selected.public_url} target="_blank" rel="noreferrer">View live site <ExternalLink size={14} /></a> : null}
            {message ? <div className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{message}</div> : null}
            {error ? <div className="mt-5 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div> : null}
          </section>
        </div>

        <section className="rounded-[26px] border border-white/[.08] bg-white/[.035] p-7"><div className="flex items-center gap-3"><History className="text-white/60" size={20} /><h2 className="font-semibold">Publish history</h2></div><div className="mt-5 space-y-3">{deployments.length === 0 ? <p className="text-sm text-white/40">No external deployments yet.</p> : deployments.map((deployment) => <div key={deployment.id} className="flex flex-col gap-3 rounded-2xl border border-white/[.07] bg-black/15 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-sm font-semibold capitalize">{deployment.status.replace(/_/g, " ")}</div><div className="mt-1 text-xs text-white/40">{new Date(deployment.created_at).toLocaleString()}</div></div>{deployment.status === "published" && deployment.backup_path ? <button type="button" disabled={Boolean(busy)} onClick={() => run("rollback", { deployment_id: deployment.id })} className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300/20 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-100"><RotateCcw size={14} />Rollback</button> : null}</div>)}</div></section>
      </div>
    </main>
  )
}
