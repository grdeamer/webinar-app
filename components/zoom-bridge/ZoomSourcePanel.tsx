"use client"
import { useCallback, useEffect, useState } from "react"
import { Radio, Play, Square, Save, Camera, Mic, Copy, Cable, Eye, EyeOff, Pencil } from "lucide-react"
import SourceProfileEditor from "./SourceProfileEditor"
import { defaultSourceProfile, type SourceProfile } from "@/lib/zoom-bridge/source-profile"
import type { ZoomSource } from "@/lib/zoom-bridge/types"
import { ioButton, ioField } from "./SatelliteCard"
type IngestInfo = { configured: boolean; host: string; port: number }
export default function ZoomSourcePanel() {
  const [profileEditing, setProfileEditing] = useState(false)
  const [source, setSource] = useState<ZoomSource | null>(null)
  const [ingest, setIngest] = useState<IngestInfo | null>(null)
  const [meetingId, setMeetingId] = useState("")
  const [passcode, setPasscode] = useState("")
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [connection, setConnection] = useState("")
  const [revealed, setRevealed] = useState(false)
  const [setupOpen, setSetupOpen] = useState(false)
  const refresh = useCallback(async (signal: AbortSignal) => {
    const response = await fetch("/api/admin/zoom-bridge/source", { cache: "no-store", signal })
    if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) throw new Error("Unable to load the source. Check your administrator session.")
    const data = await response.json()
    if (!signal.aborted) { setSource(data.source); setIngest(data.ingest); setLoaded(true) }
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    let polling = false
    async function tick() {
      if (polling) return
      polling = true
      try { await refresh(controller.signal) }
      catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Source unavailable") }
      finally { polling = false }
    }
    void tick(); const timer = setInterval(() => { void tick() }, 3000)
    return () => { controller.abort(); clearInterval(timer) }
  }, [refresh])
  async function request(method: string, body: object) {
    const response = await fetch("/api/admin/zoom-bridge/source", { method, cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    if (!response.headers.get("content-type")?.includes("application/json")) throw new Error("Your session expired. Sign in again.")
    const data = await response.json(); if (!response.ok) throw new Error(data.error || "Source command failed")
    return data
  }
  async function mutate(method: string, body: object) {
    setBusy(true); setError(""); setMessage("")
    try { const data = await request(method, body); setSource(data.source); setMessage("Source command saved."); return true }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Source command failed"); return false }
    finally { setBusy(false) }
  }
  async function getConnection(copy: boolean) {
    setBusy(true); setError(""); setMessage("")
    try {
      const data = await request("POST", { action: "connection" })
      if (copy) {
        try { await navigator.clipboard.writeText(data.url); setMessage("Private OBS server URL copied. Paste it into OBS → Settings → Stream → Server.") }
        catch { setConnection(data.url); setMessage("Clipboard unavailable. Reveal the connection below and copy it manually.") }
      } else setConnection(data.url)
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Connection unavailable") }
    finally { setBusy(false) }
  }
  async function saveProfile(profile: SourceProfile) {
    setBusy(true); setError(""); setMessage("")
    try { const data = await request("PATCH", { profile }); setSource(data.source); setMessage("Source profile saved. Encoder guidance must be applied on your encoder."); return true }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Source profile failed"); return false }
    finally { setBusy(false) }
  }
  const profile = source?.profile || defaultSourceProfile
  const dimensions = profile.relayResolution === "1080p" ? "1920 × 1080" : "1280 × 720"
  const srt = source?.kind === "srt"
  const fresh = Boolean(source?.lastSeen && Date.now() - new Date(source.lastSeen).getTime() < 15000)
  const state = !loaded ? "Loading" : fresh ? source?.observed.status || "starting" : source?.running ? "Controller offline" : "Disconnected"
  const video = fresh && source?.observed.video
  const audio = fresh && source?.observed.audio
  return <section className="rounded-2xl border border-blue-300/20 bg-blue-300/[.035] p-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><div className="flex items-center gap-2 text-lg font-semibold"><Radio size={20} className="text-blue-300" />Program source</div><p className="mt-2 text-sm text-white/50">{srt ? `${profile.switcherName} → ${profile.captureName} → ${profile.encoderName} → Jupiter Io → satellites` : "Zoom meeting → Jupiter Io → satellites"}</p></div>
      <span role="status" className={`rounded-full border px-3 py-1 text-xs ${video && audio ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-200" : "border-white/10 text-blue-200"}`}>{state}</span>
    </div>
    {source && !editing ? <div className="mt-5 flex flex-wrap items-center gap-3">
      <span className="mr-auto flex items-center gap-2 text-sm text-white/70"><Cable size={17} />{srt ? "HDMI / encrypted SRT" : `Meeting ${source.meetingId}`}</span>
      {srt ? <><button type="button" className={ioButton} disabled={busy || !ingest?.configured} onClick={() => { void getConnection(true) }}><Copy size={16} />Copy encoder connection</button><button type="button" className={ioButton} aria-expanded={setupOpen} onClick={() => setSetupOpen(v => !v)}>Encoder setup</button><button type="button" className={ioButton} disabled={busy} onClick={() => setProfileEditing(v => !v)}><Pencil size={16} />Edit source</button></> : <button type="button" className={ioButton} disabled={busy} onClick={() => { setMeetingId(source.meetingId); setPasscode(""); setEditing(true) }}>Edit source</button>}
      <button type="button" className={ioButton} disabled={busy} onClick={() => { void mutate("POST", { action: source.running ? "stop" : "start" }) }}>{source.running ? <Square size={16} /> : <Play size={16} />}{source.running ? "Stop receiving" : "Start receiving"}</button>
    </div> : null}
    {srt && profileEditing ? <SourceProfileEditor profile={profile} running={source.running} busy={busy} save={saveProfile} cancel={() => setProfileEditing(false)} /> : null}
    {srt && setupOpen ? <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/65">
      <div className="grid gap-4 md:grid-cols-2"><div><h3 className="font-semibold text-white/85">{profile.encoderName} connection</h3><p className="mt-2">Settings → Stream → Custom. Paste the copied URL into Server. Leave Stream Key blank, then Start Streaming.</p><p className="mt-2 text-xs text-white/40">Receiver: {ingest?.configured ? `${ingest.host} · UDP ${ingest.port}` : "Connection not configured on this Jupiter server"}</p></div><div><h3 className="font-semibold text-white/85">Saved encoder guidance</h3><p className="mt-2">{dimensions} · {profile.encoderFps} fps · H.264 at {profile.encoderBitrate.toLocaleString()} Kbps · keyframe 2 seconds · AAC at 160 Kbps / 48 kHz.</p><p className="mt-2 text-xs text-white/40">Cloud relay targets {profile.relayResolution} at 15 fps and 32 kHz mono audio. Set the capture source and encoder output to {profile.relayResolution}; a larger relay canvas cannot recover detail from a lower-resolution input.</p></div></div>
      <p className="mt-3 text-xs text-white/40">Allow UDP {ingest?.port || 9000} from the encoder’s public IP in your cloud firewall. The connection URL contains a private encryption passphrase.</p>
      <button type="button" className="mt-3 text-xs text-blue-300 disabled:opacity-40" disabled={busy || !ingest?.configured} onClick={() => { if (connection) { setConnection(""); setRevealed(false) } else void getConnection(false) }}>{connection ? "Hide private connection" : "Show private connection"}</button>
      {connection ? <div className="mt-2 flex gap-2"><input aria-label="Private OBS server URL" className={`${ioField} mt-0 font-mono text-xs`} readOnly type={revealed ? "text" : "password"} value={connection} autoComplete="off" onFocus={e => e.target.select()} /><button type="button" className={ioButton} aria-label={revealed ? "Mask private connection" : "Reveal private connection"} onClick={() => setRevealed(v => !v)}>{revealed ? <EyeOff size={16} /> : <Eye size={16} />}</button></div> : null}
    </div> : null}
    {loaded && (!source || editing) ? <form className="mt-5" onSubmit={async e => { e.preventDefault(); if (await mutate("PUT", { meetingId, passcode })) { setPasscode(""); setEditing(false) } }}>
      <div className="grid gap-4 md:grid-cols-2"><label className="text-xs text-white/60">Source meeting ID<input className={ioField} required maxLength={20} value={meetingId} disabled={busy || source?.running} onChange={e => setMeetingId(e.target.value)} /></label><label className="text-xs text-white/60">{source ? "New passcode (blank keeps saved)" : "Source meeting passcode"}<input className={ioField} required={!source} type="password" autoComplete="new-password" maxLength={64} value={passcode} disabled={busy || source?.running} onChange={e => setPasscode(e.target.value)} /></label></div>
      <div className="mt-4 flex gap-2"><button className={ioButton} disabled={busy || source?.running}><Save size={16} />Save source</button>{source ? <button type="button" className={ioButton} disabled={busy} onClick={() => { setPasscode(""); setEditing(false) }}>Cancel</button> : null}</div>
    </form> : null}
    {source ? <div className="mt-5 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-3">
      <div className={`rounded-xl bg-black/15 p-3 text-sm ${video ? "text-emerald-200" : "text-white/40"}`}><Camera size={16} className="mr-2 inline" />{video ? "Video receiving" : "Waiting for video"}<p className="mt-1 font-mono text-xs text-white/45">{fresh ? source.observed.inputResolutions || "—" : "—"}{srt ? " · decoded" : " · input"}</p></div>
      <div className={`rounded-xl bg-black/15 p-3 text-sm ${audio ? "text-emerald-200" : "text-white/40"}`}><Mic size={16} className="mr-2 inline" />{audio ? "Audio receiving" : "Waiting for audio"}<p className="mt-1 text-xs text-white/45">{srt ? `${profile.audioName} · mono relay` : "Source meeting mix"}</p></div>
      <div className="rounded-xl bg-black/15 p-3 text-sm text-white/60">{srt ? profile.programName : fresh ? source.observed.presenter || "Waiting for spotlight" : "Presenter unavailable"}<p className="mt-1 text-xs text-white/45">{fresh && source.observed.revision !== source.revision ? "Applying command…" : fresh ? "Controller reporting" : "No recent controller report"}</p></div>
    </div> : null}
    {srt && profile.notes ? <p className="mt-4 whitespace-pre-wrap break-words text-sm text-white/55">{profile.notes}</p> : null}
    {source?.observed.error ? <p role="alert" className="mt-3 text-sm text-amber-200">{!fresh ? "Last report: " : ""}{source.observed.error}</p> : null}
    {error ? <p role="alert" className="mt-3 text-sm text-red-200">{error}</p> : null}
    {message ? <p role="status" className="mt-3 text-sm text-blue-200">{message}</p> : null}
    <p className="mt-4 text-xs leading-5 text-white/35">{srt ? "Jupiter Io receives the approved HDMI program. Source Zoom recording permission is unnecessary for this path." : "The source host must admit Jupiter Io Source and grant SDK recording permission for raw media access."}</p>
  </section>
}
