"use client"
import { defaultVideoSettings, type VideoSettings } from "@/lib/zoom-bridge/video-settings"
import { Save } from "lucide-react"
import type { PublishMode } from "@/lib/zoom-bridge/types"
import { ioButton, ioField } from "./SatelliteCard"
export type SatelliteDraft = { videoSettings?: VideoSettings; key: string; id?: string; name: string; meetingId: string; passcode: string; publishMode: PublishMode }
export default function SatelliteEditor({ draft, running, busy, change, save, cancel, compact = false }: {
  draft: SatelliteDraft; running: boolean; busy: boolean; change: (draft: SatelliteDraft) => void; save: () => void; cancel: () => void;
  compact?: boolean;
}) {
  return <form className="rounded-2xl border border-blue-300/20 bg-blue-300/[.035] p-5" onSubmit={e => { e.preventDefault(); save() }}>
    {!compact ? <h2 className="mb-4 text-sm font-semibold">{draft.id ? "Edit satellite" : "New satellite"}</h2> : null}
    <div className={`grid gap-4 ${compact ? "sm:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-4"}`}>
      <label className="text-xs text-white/60">Satellite name<input className={ioField} required maxLength={64} value={draft.name} disabled={busy} autoComplete="off" onChange={e => change({ ...draft, name: e.target.value })} /></label>
      <label className="text-xs text-white/60">Meeting ID<input className={ioField} required maxLength={20} value={draft.meetingId} disabled={busy || running} inputMode="numeric" autoComplete="off" onChange={e => change({ ...draft, meetingId: e.target.value })} /></label>
      <label className="text-xs text-white/60">{draft.id ? "Passcode · blank keeps saved" : "Meeting passcode"}<input className={ioField} required={!draft.id} type="password" maxLength={64} value={draft.passcode} disabled={busy || running} autoComplete="new-password" onChange={e => change({ ...draft, passcode: e.target.value })} /></label>
      <label className="text-xs text-white/60">Output mode<select className={ioField} value={draft.publishMode} disabled={busy || running} onChange={e => change({ ...draft, publishMode: e.target.value as PublishMode })}><option value="share" className="bg-slate-950">Screen share · presentations</option><option value="camera" className="bg-slate-950">Camera · participant video</option></select></label>
    </div>
    <fieldset className="mt-5 rounded-xl border border-white/10 p-4" disabled={busy || running}>
      <legend className="px-2 text-sm font-medium">Video settings</legend>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs text-white/60">Video quality<select className={ioField} value={draft.videoSettings?.quality ?? "auto"} onChange={e => change({ ...draft, videoSettings: { ...(draft.videoSettings ?? defaultVideoSettings), quality: e.target.value as VideoSettings["quality"] } })}><option value="auto" className="bg-slate-950">Auto · use available source quality</option><option value="720p" className="bg-slate-950">HD · up to 720p</option><option value="1080p" className="bg-slate-950">Full HD · up to 1080p</option></select></label>
        <label className="text-xs text-white/60">Aspect ratio<select className={ioField} value={draft.videoSettings?.aspect ?? "original"} onChange={e => change({ ...draft, videoSettings: { ...(draft.videoSettings ?? defaultVideoSettings), aspect: e.target.value as VideoSettings["aspect"] } })}><option value="original" className="bg-slate-950">Original · preserve source proportions</option><option value="16:9" className="bg-slate-950">Widescreen · 16:9</option><option value="4:3" className="bg-slate-950">Standard · 4:3</option></select></label>
      </div>
      <p className="mt-3 text-xs leading-5 text-white/45">Original preserves proportions with black bars where needed. Other ratios crop the center without stretching. Existing bars in the incoming source remain. Quality is a maximum request: source detail, Zoom negotiation and meeting HD permissions determine delivered resolution. Disconnect before changing these settings; they apply on the next connection.</p>
    </fieldset>
    <p className="mt-3 text-xs text-white/45">{running ? "Rename while connected. Disconnect to change the meeting, passcode, or output mode." : "Screen share preserves presentation detail. The destination host must allow sharing. Camera quality depends on Zoom HD settings."}</p>
    <div className="mt-4 flex gap-2"><button className={ioButton} disabled={busy}><Save size={16} />Save satellite</button><button type="button" className={ioButton} disabled={busy} onClick={cancel}>Cancel</button></div>
  </form>
}
