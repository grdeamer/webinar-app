"use client"

import { useCallback, useEffect, useMemo, useState, type JSX } from "react"
import { CheckCircle2, Eye, KeyRound, Plus, Radio, RefreshCw, Satellite, ShieldCheck, Trash2, TriangleAlert, X } from "lucide-react"
import { broadcastProviders, providerLabels, type BroadcastDestination, type BroadcastProvider, type BroadcastRun } from "@/lib/broadcast/config"
import { useJupiterNotice } from "@/components/ui/JupiterNotificationProvider"
import {
  broadcastOutputProfileLabel,
  getBroadcastOutputProfile,
  type BroadcastOutputProfileId,
} from "@/lib/broadcast/outputProfiles"

type PreflightCheck = { id: string; label: string; ready: boolean; required: boolean; detail: string }
type PreflightResult = { ready: boolean; profile: string; checks: PreflightCheck[]; note: string }
type BroadcastApiResponse = {
  ok?: boolean
  error?: string
  destinations?: BroadcastDestination[]
  encryptionConfigured?: boolean
  destination?: BroadcastDestination
  run?: BroadcastRun | null
  ready?: boolean
  profile?: string
  checks?: PreflightCheck[]
  note?: string
  recordingContinues?: boolean
}

const providerHints: Record<BroadcastProvider, string> = {
  youtube: "Paste the stream key from YouTube Live Control Room.",
  linkedin: "Create the scheduled LinkedIn Live event, then copy its URL and key during the preparation window.",
  facebook: "Paste the server URL and stream key from Facebook Live Producer.",
  vimeo: "Paste the RTMPS URL and key from your Vimeo live event.",
  custom: "Use any RTMP or RTMPS ingest endpoint.",
}

function emptyDraft(provider: BroadcastProvider = "youtube"): {
  provider: BroadcastProvider
  label: string
  serverUrl: string
  streamKey: string
  reusable: boolean
} {
  return {
    provider,
    label: providerLabels[provider],
    serverUrl: provider === "youtube" ? "rtmps://a.rtmps.youtube.com/live2" : "",
    streamKey: "",
    reusable: false,
  }
}

async function readJson(response: Response): Promise<BroadcastApiResponse | null> {
  return response.json().catch((): null => null) as Promise<BroadcastApiResponse | null>
}

export default function BroadcastDestinationsPanel({ eventId, outputProfileId, onClose }: { eventId: string; outputProfileId: BroadcastOutputProfileId; onClose: () => void }): JSX.Element {
  const { confirm: confirmNotice } = useJupiterNotice()
  const baseUrl = `/api/admin/events/${eventId}/broadcast`
  const [destinations, setDestinations] = useState<BroadcastDestination[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [run, setRun] = useState<BroadcastRun | null>(null)
  const [encryptionConfigured, setEncryptionConfigured] = useState(true)
  const [recordingEnabled, setRecordingEnabled] = useState(true)
  const [draft, setDraft] = useState(emptyDraft())
  const [showForm, setShowForm] = useState(false)
  const [preflight, setPreflight] = useState<PreflightResult | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const outputProfile = getBroadcastOutputProfile(outputProfileId)

  const loadDestinations = useCallback(async (): Promise<void> => {
    const response = await fetch(`${baseUrl}/destinations`, { cache: "no-store" })
    const data = await readJson(response)
    if (!response.ok || !data?.ok) throw new Error(data?.error || "Destinations could not be loaded.")
    const items = (data.destinations ?? []) as BroadcastDestination[]
    setDestinations(items)
    setEncryptionConfigured(data.encryptionConfigured !== false)
    setSelectedIds((current) => current.length ? current.filter((id) => items.some((item) => item.id === id && item.enabled)) : items.filter((item) => item.enabled).map((item) => item.id))
  }, [baseUrl])

  const loadStatus = useCallback(async (): Promise<void> => {
    const response = await fetch(`${baseUrl}/status`, { cache: "no-store" })
    const data = await readJson(response)
    if (!response.ok || !data?.ok) throw new Error(data?.error || "Broadcast status could not be loaded.")
    setRun(data.run ?? null)
  }, [baseUrl])

  useEffect(() => {
    let cancelled = false
    Promise.all([loadDestinations(), loadStatus()]).catch((loadError) => {
      if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Broadcast controls could not be loaded.")
    })
    return () => { cancelled = true }
  }, [loadDestinations, loadStatus])

  const runActive = Boolean(run && (run.status === "starting" || run.status === "active") && run.destinations.some((destination) => destination.status === "starting" || destination.status === "active"))
  useEffect(() => {
    if (!runActive) return
    const timer = window.setInterval((): void => { void loadStatus().catch((): null => null) }, 5000)
    return () => window.clearInterval(timer)
  }, [loadStatus, runActive])

  const enabledSelected = useMemo(() => destinations.filter((destination) => destination.enabled && selectedIds.includes(destination.id)), [destinations, selectedIds])

  async function saveDestination() {
    setBusy("save")
    setError(null)
    try {
      const response = await fetch(`${baseUrl}/destinations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) })
      const data = await readJson(response)
      if (!response.ok || !data?.ok) throw new Error(data?.error || "Destination could not be saved.")
      setShowForm(false)
      setDraft(emptyDraft())
      if (!data.destination) throw new Error("Destination response was incomplete.")
      const savedDestination = data.destination
      setNotice(`${savedDestination.label} added. The stream key is encrypted and will not be shown again.`)
      await loadDestinations()
      setSelectedIds((current) => [...new Set([...current, savedDestination.id])])
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Destination could not be saved.")
    } finally {
      setBusy(null)
    }
  }

  async function toggleDestination(destination: BroadcastDestination) {
    setBusy(destination.id)
    setError(null)
    try {
      const response = await fetch(`${baseUrl}/destinations/${destination.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: !destination.enabled }) })
      const data = await readJson(response)
      if (!response.ok || !data?.ok) throw new Error(data?.error || "Destination could not be updated.")
      await loadDestinations()
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Destination could not be updated.")
    } finally {
      setBusy(null)
    }
  }

  async function removeDestination(destination: BroadcastDestination) {
    const confirmed = await confirmNotice({ title: `Remove ${destination.label}?`, message: "Its encrypted stream key will be permanently deleted.", confirmLabel: "Remove destination", tone: "danger" })
    if (!confirmed) return
    setBusy(destination.id)
    try {
      const response = await fetch(`${baseUrl}/destinations/${destination.id}`, { method: "DELETE" })
      const data = await readJson(response)
      if (!response.ok || !data?.ok) throw new Error(data?.error || "Destination could not be removed.")
      await loadDestinations()
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Destination could not be removed.")
    } finally {
      setBusy(null)
    }
  }

  async function runPreflight() {
    setBusy("preflight")
    setError(null)
    setNotice(null)
    try {
      const response = await fetch(`${baseUrl}/preflight`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ destinationIds: selectedIds, recordingEnabled, qualityProfile: outputProfileId }) })
      const data = await readJson(response)
      if (!response.ok || !data?.ok) throw new Error(data?.error || "Preflight could not be completed.")
      const result: PreflightResult = {
        ready: data.ready === true,
        profile: data.profile ?? "universal-720p30",
        checks: data.checks ?? [],
        note: data.note ?? "",
      }
      setPreflight(result)
      setNotice(data.ready ? "Preflight passed. Start the outputs, then confirm each platform preview before going public." : "Preflight found required items that need attention.")
    } catch (preflightError) {
      setError(preflightError instanceof Error ? preflightError.message : "Preflight could not be completed.")
    } finally {
      setBusy(null)
    }
  }

  async function startBroadcast() {
    if (!preflight?.ready) {
      setError("Run a successful preflight before starting external outputs.")
      return
    }
    const confirmed = await confirmNotice({ title: "Start external outputs?", message: `Jupiter will send Program to ${enabledSelected.length} destination${enabledSelected.length === 1 ? "" : "s"}.`, detail: "Verify each platform preview before clicking Go Live there.", confirmLabel: "Start outputs", tone: "warning" })
    if (!confirmed) return
    setBusy("start")
    setError(null)
    try {
      const response = await fetch(`${baseUrl}/start`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ destinationIds: selectedIds, recordingEnabled, qualityProfile: outputProfileId }) })
      const data = await readJson(response)
      if (!response.ok || !data?.ok) throw new Error(data?.error || "Broadcast could not be started.")
      setNotice("Outputs started. Check the preview inside every destination platform before making the event public.")
      await loadStatus()
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "Broadcast could not be started.")
    } finally {
      setBusy(null)
    }
  }

  async function stopAll() {
    const confirmed = await confirmNotice({ title: "Stop every destination?", message: "All external outputs will end.", detail: "Jupiter Cloud recording continues when enabled.", confirmLabel: "Stop outputs", tone: "danger" })
    if (!confirmed) return
    setBusy("stop")
    try {
      const response = await fetch(`${baseUrl}/stop`, { method: "POST" })
      const data = await readJson(response)
      if (!response.ok || !data?.ok) throw new Error(data?.error || "Broadcast could not be stopped.")
      setNotice(data.recordingContinues ? "All external outputs stopped. Jupiter Cloud recording continues." : "Broadcast stopped.")
      await loadStatus()
    } catch (stopError) {
      setError(stopError instanceof Error ? stopError.message : "Broadcast could not be stopped.")
    } finally {
      setBusy(null)
    }
  }

  async function stopOne(destinationId: string) {
    setBusy(destinationId)
    try {
      const response = await fetch(`${baseUrl}/destinations/${destinationId}/stop`, { method: "POST" })
      const data = await readJson(response)
      if (!response.ok || !data?.ok) throw new Error(data?.error || "Destination could not be stopped.")
      await loadStatus()
    } catch (stopError) {
      setError(stopError instanceof Error ? stopError.message : "Destination could not be stopped.")
    } finally {
      setBusy(null)
    }
  }

  return <div className="absolute inset-2 z-30 overflow-hidden rounded-[18px] border border-sky-200/14 bg-[radial-gradient(circle_at_10%_0%,rgba(56,189,248,.13),transparent_30%),linear-gradient(180deg,rgba(8,13,24,.99),rgba(2,5,11,.995))] shadow-[0_24px_70px_rgba(0,0,0,.5)] backdrop-blur-2xl">
    <header className="flex items-start justify-between gap-4 border-b border-white/[.06] px-5 py-4"><div><div className="text-[8px] font-black uppercase tracking-[.16em] text-sky-100/58">Outbound Broadcast</div><h2 className="mt-1 text-[20px] font-semibold tracking-[-.05em] text-white/92">Stream Destinations</h2><p className="mt-1 text-[11px] text-white/42">One Jupiter Program feed, securely distributed through LiveKit Egress.</p></div><button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full border border-white/8 text-white/48 hover:bg-white/5 hover:text-white"><X size={14} /></button></header>

    <div className="grid h-[calc(100%-78px)] min-h-0 gap-3 overflow-y-auto p-4 xl:grid-cols-[1.05fr_.95fr]">
      <section className="min-h-0 rounded-[16px] border border-white/[.06] bg-white/[.022] p-4">
        <div className="flex items-center justify-between gap-3"><div><div className="text-[9px] font-black uppercase tracking-[.14em] text-white/42">Configured endpoints</div><div className="mt-1 text-[11px] text-white/34">Select up to five outputs for this run.</div></div><button type="button" onClick={() => setShowForm((value) => !value)} disabled={!encryptionConfigured || runActive} className="inline-flex h-8 items-center gap-1.5 rounded-[9px] border border-violet-300/18 bg-violet-400/8 px-3 text-[9px] font-black uppercase tracking-[.1em] text-violet-100/72 disabled:opacity-35"><Plus size={13} />Destination</button></div>

        {!encryptionConfigured ? <div className="mt-3 flex gap-2 rounded-[12px] border border-amber-300/16 bg-amber-300/6 p-3 text-[10px] leading-4 text-amber-100/70"><TriangleAlert size={14} className="mt-0.5 shrink-0" />Add a 32-byte base64 <code>BROADCAST_CREDENTIALS_KEY</code> before saving stream keys.</div> : null}

        {showForm ? <div className="mt-3 rounded-[14px] border border-violet-300/14 bg-violet-400/[.045] p-3">
          <div className="grid gap-2 md:grid-cols-2"><label className="text-[8px] font-bold uppercase tracking-[.12em] text-white/36">Platform<select value={draft.provider} onChange={(event) => { const provider = event.target.value as BroadcastProvider; setDraft(emptyDraft(provider)) }} className="mt-1 h-9 w-full rounded-[8px] border border-white/8 bg-[#070c16] px-2 text-[10px] normal-case tracking-normal text-white/72">{broadcastProviders.map((provider) => <option key={provider} value={provider}>{providerLabels[provider]}</option>)}</select></label><label className="text-[8px] font-bold uppercase tracking-[.12em] text-white/36">Name<input value={draft.label} onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))} className="mt-1 h-9 w-full rounded-[8px] border border-white/8 bg-[#070c16] px-2 text-[10px] normal-case tracking-normal text-white/72" /></label></div>
          <label className="mt-2 block text-[8px] font-bold uppercase tracking-[.12em] text-white/36">RTMP/RTMPS server<input value={draft.serverUrl} onChange={(event) => setDraft((current) => ({ ...current, serverUrl: event.target.value }))} placeholder="rtmps://platform.example/live" className="mt-1 h-9 w-full rounded-[8px] border border-white/8 bg-[#070c16] px-2 font-mono text-[10px] normal-case tracking-normal text-white/72" /></label>
          <label className="mt-2 block text-[8px] font-bold uppercase tracking-[.12em] text-white/36">Stream key<input type="password" value={draft.streamKey} onChange={(event) => setDraft((current) => ({ ...current, streamKey: event.target.value }))} autoComplete="new-password" className="mt-1 h-9 w-full rounded-[8px] border border-white/8 bg-[#070c16] px-2 font-mono text-[10px] normal-case tracking-normal text-white/72" /></label>
          <div className="mt-2 text-[9px] leading-4 text-white/34">{providerHints[draft.provider]}</div><div className="mt-3 flex items-center justify-between"><label className="flex items-center gap-2 text-[9px] text-white/48"><input type="checkbox" checked={draft.reusable} onChange={(event) => setDraft((current) => ({ ...current, reusable: event.target.checked }))} />Reusable channel key</label><button type="button" onClick={() => void saveDestination()} disabled={busy === "save" || !draft.serverUrl || !draft.streamKey} className="h-8 rounded-[8px] bg-violet-500 px-4 text-[9px] font-black uppercase tracking-[.1em] text-white disabled:opacity-30">{busy === "save" ? "Encrypting…" : "Encrypt & save"}</button></div>
        </div> : null}

        <div className="mt-3 grid gap-2">{destinations.map((destination) => {
          const selected = selectedIds.includes(destination.id)
          const liveDestination = run?.destinations.find((item) => item.destinationId === destination.id)
          return <article key={destination.id} className={`rounded-[13px] border p-3 transition ${selected && destination.enabled ? "border-sky-300/18 bg-sky-400/[.055]" : "border-white/[.055] bg-black/15"}`}><div className="flex items-start gap-3"><button type="button" onClick={() => !runActive && destination.enabled && setSelectedIds((current) => current.includes(destination.id) ? current.filter((id) => id !== destination.id) : [...current, destination.id])} className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border ${selected && destination.enabled ? "border-sky-300/40 bg-sky-400/20 text-sky-100" : "border-white/12 text-transparent"}`}>{selected ? <CheckCircle2 size={12} /> : null}</button><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="truncate text-[11px] font-semibold text-white/76">{destination.label}</span><span className="rounded-full border border-white/8 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[.08em] text-white/32">{providerLabels[destination.provider]}</span>{liveDestination ? <span className={`rounded-full border px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[.08em] ${liveDestination.status === "active" ? "border-emerald-300/18 bg-emerald-400/8 text-emerald-100/68" : liveDestination.status === "failed" ? "border-rose-300/18 bg-rose-400/8 text-rose-100/68" : "border-amber-300/18 bg-amber-300/8 text-amber-100/68"}`}>{liveDestination.status}</span> : null}</div><div className="mt-1 truncate font-mono text-[8px] text-white/26">{destination.serverUrl} · {destination.maskedStreamKey}</div></div><button type="button" onClick={() => void toggleDestination(destination)} disabled={runActive || busy === destination.id} className={`rounded-full border px-2 py-1 text-[7px] font-black uppercase tracking-[.08em] ${destination.enabled ? "border-emerald-300/14 text-emerald-100/58" : "border-white/8 text-white/30"}`}>{destination.enabled ? "Enabled" : "Off"}</button>{liveDestination && (liveDestination.status === "starting" || liveDestination.status === "active") ? <button type="button" onClick={() => void stopOne(destination.id)} className="rounded-full border border-rose-300/14 px-2 py-1 text-[7px] font-black uppercase text-rose-100/60">Stop</button> : <button type="button" onClick={() => void removeDestination(destination)} disabled={runActive} className="text-white/24 hover:text-rose-300 disabled:opacity-20"><Trash2 size={13} /></button>}</div></article>
        })}{destinations.length === 0 ? <div className="rounded-[13px] border border-dashed border-white/8 px-4 py-8 text-center text-[10px] text-white/32">Add YouTube or another RTMP destination to begin.</div> : null}</div>
      </section>

      <section className="flex flex-col gap-3"><div className="rounded-[16px] border border-white/[.06] bg-white/[.022] p-4"><div className="flex items-center justify-between"><div className="flex items-center gap-2 text-[10px] font-semibold text-white/70"><ShieldCheck size={15} className="text-cyan-300" />Broadcast preflight</div><span className="rounded-full border border-white/8 px-2 py-1 text-[7px] font-black uppercase tracking-[.09em] text-white/36">{broadcastOutputProfileLabel(outputProfile)}</span></div><label className="mt-3 flex items-center justify-between rounded-[10px] border border-white/6 bg-black/14 px-3 py-2 text-[10px] text-white/55"><span>Record simultaneously to Jupiter Cloud</span><input type="checkbox" checked={recordingEnabled} onChange={(event) => { setRecordingEnabled(event.target.checked); setPreflight(null) }} disabled={runActive} /></label><div className="mt-3 grid gap-1.5">{preflight?.checks.map((check) => <div key={check.id} className="flex items-start gap-2 rounded-[9px] bg-black/15 px-3 py-2"><span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${check.ready ? "bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,.55)]" : "bg-amber-300"}`} /><div><div className="text-[9px] font-semibold text-white/62">{check.label}</div><div className="mt-0.5 text-[8px] text-white/30">{check.detail}</div></div></div>) ?? <div className="py-4 text-center text-[9px] text-white/30">Run preflight to validate media, credentials, storage and destinations.</div>}</div><button type="button" onClick={() => void runPreflight()} disabled={busy !== null || selectedIds.length === 0 || runActive} className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-[9px] border border-cyan-300/16 bg-cyan-400/7 text-[9px] font-black uppercase tracking-[.11em] text-cyan-100/66 disabled:opacity-30"><RefreshCw size={13} className={busy === "preflight" ? "animate-spin" : ""} />Run preflight</button></div>

        <div className="rounded-[16px] border border-white/[.06] bg-white/[.022] p-4"><div className="flex items-center justify-between"><div className="flex items-center gap-2 text-[10px] font-semibold text-white/70"><Satellite size={15} className={runActive ? "text-emerald-300" : "text-violet-300"} />Outbound state</div><span className={`rounded-full border px-2 py-1 text-[7px] font-black uppercase tracking-[.09em] ${runActive ? "border-emerald-300/18 bg-emerald-400/8 text-emerald-100/68" : "border-white/8 text-white/34"}`}>{runActive ? "Sending" : run?.status ?? "Idle"}</span></div>{run ? <div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-[10px] bg-black/16 px-3 py-2"><div className="text-[7px] uppercase tracking-[.1em] text-white/25">Outputs</div><div className="mt-1 text-lg font-semibold text-white/76">{run.destinations.filter((destination) => destination.status === "active" || destination.status === "starting").length}</div></div><div className="rounded-[10px] bg-black/16 px-3 py-2"><div className="text-[7px] uppercase tracking-[.1em] text-white/25">Recording</div><div className="mt-1 text-[11px] font-semibold text-white/68">{run.recordingEnabled ? "Jupiter Cloud" : "Off"}</div></div></div> : <div className="mt-3 rounded-[10px] bg-black/16 px-3 py-4 text-[9px] leading-4 text-white/30">No outbound run has started for this event.</div>}<div className="mt-3 flex gap-2">{runActive ? <button type="button" onClick={() => void stopAll()} disabled={busy !== null} className="h-9 flex-1 rounded-[9px] border border-rose-300/18 bg-rose-400/7 text-[9px] font-black uppercase tracking-[.1em] text-rose-100/66">Stop all outputs</button> : <button type="button" onClick={() => void startBroadcast()} disabled={busy !== null || !preflight?.ready || enabledSelected.length === 0} className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-[9px] bg-gradient-to-r from-blue-500 to-violet-500 text-[9px] font-black uppercase tracking-[.1em] text-white disabled:opacity-30"><Radio size={13} />Start outputs</button>}</div></div>

        <div className="rounded-[16px] border border-blue-300/10 bg-blue-400/[.035] p-4"><div className="flex items-center gap-2 text-[9px] font-semibold text-blue-100/64"><Eye size={14} />Platform preview is the final safety gate</div><p className="mt-2 text-[9px] leading-4 text-white/34">Starting outputs sends media to each platform’s ingest preview. Jupiter does not automatically click the platform’s public “Go Live” control in Phase 1.</p><div className="mt-2 flex items-center gap-2 text-[8px] text-white/26"><KeyRound size={12} />Keys stay encrypted and are never returned to this browser.</div></div>
      </section>
    </div>

    {error || notice ? <div className={`absolute bottom-3 left-1/2 max-w-[80%] -translate-x-1/2 rounded-full border px-4 py-2 text-[9px] shadow-xl backdrop-blur-xl ${error ? "border-rose-300/18 bg-rose-950/90 text-rose-100/76" : "border-emerald-300/16 bg-emerald-950/90 text-emerald-100/72"}`}>{error ?? notice}</div> : null}
  </div>
}
