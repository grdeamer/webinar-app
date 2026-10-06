"use client"
import { useState } from "react"
import { Save } from "lucide-react"
import type { SourceProfile } from "@/lib/zoom-bridge/source-profile"
import { ioButton, ioField } from "./SatelliteCard"
export default function SourceProfileEditor({ profile, running, busy, save, cancel }: {
  profile: SourceProfile; running: boolean; busy: boolean; save: (profile: SourceProfile) => Promise<boolean>; cancel: () => void;
}) {
  const [draft, setDraft] = useState(profile)
  return <form className="mt-5 space-y-5 rounded-2xl border border-blue-300/20 bg-black/20 p-5" onSubmit={async e => { e.preventDefault(); if (await save(draft)) cancel() }}>
    <div><h3 className="font-semibold">Edit program source</h3><p className="mt-1 text-xs text-white/45">Name your equipment and define the program’s relay profile.</p></div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {([['programName', 'Program name'], ['switcherName', 'Switcher / source device name'], ['captureName', 'Capture device name'], ['encoderName', 'Encoder device name'], ['audioName', 'Audio source name']] as const).map(([key, label]) => <label key={key} className="text-xs text-white/60">{label}<input required maxLength={64} className={ioField} value={draft[key]} disabled={busy} onChange={e => setDraft({ ...draft, [key]: e.target.value })} /></label>)}
    </div>
    <div className="grid gap-4 md:grid-cols-3">
      <label className="text-xs text-white/60">Cloud relay resolution<select className={ioField} value={draft.relayResolution} disabled={busy || running} onChange={e => setDraft({ ...draft, relayResolution: e.target.value as SourceProfile["relayResolution"] })}><option className="bg-slate-950" value="1080p">1920 × 1080</option><option className="bg-slate-950" value="720p">1280 × 720</option></select></label>
      <label className="text-xs text-white/60">Encoder frame-rate guidance<select className={ioField} value={draft.encoderFps} disabled={busy} onChange={e => setDraft({ ...draft, encoderFps: Number(e.target.value) as 15 | 30 })}><option className="bg-slate-950" value="30">30 fps</option><option className="bg-slate-950" value="15">15 fps</option></select></label>
      <label className="text-xs text-white/60">Encoder bitrate guidance · Kbps<input type="number" min={1000} max={20000} step={1} required className={ioField} value={draft.encoderBitrate} disabled={busy} onChange={e => setDraft({ ...draft, encoderBitrate: Number(e.target.value) })} /></label>
    </div>
    <p className="text-xs leading-5 text-white/45">Names are Jupiter labels; they do not rename physical devices. Cloud relay resolution is applied by the AWS receiver when receiving starts. {running ? "Stop receiving to change relay resolution." : "Changing relay resolution requires restarting your source reception."} Encoder frame rate and bitrate are saved setup guidance: apply them manually in OBS or your encoder. Relay frame rate remains 15 fps; audio remains 32 kHz mono.</p>
    <label className="block text-xs text-white/60">Equipment / operator notes<textarea maxLength={500} rows={2} className={ioField} value={draft.notes} disabled={busy} onChange={e => setDraft({ ...draft, notes: e.target.value })} /></label>
    <p className="text-xs text-white/35">Live receiving status and measured resolution are read-only. Receiver address, encryption, and firewall settings are managed on the server.</p>
    <div className="flex gap-2"><button className={ioButton} disabled={busy}><Save size={16} />Save source profile</button><button type="button" className={ioButton} disabled={busy} onClick={cancel}>Cancel</button></div>
  </form>
}
