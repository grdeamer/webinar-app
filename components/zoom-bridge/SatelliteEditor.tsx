"use client"
import { Save } from "lucide-react"
import type { PublishMode } from "@/lib/zoom-bridge/types"
import { ioButton, ioField } from "./SatelliteCard"
export type SatelliteDraft = { key: string; id?: string; name: string; meetingId: string; passcode: string; publishMode: PublishMode }
export default function SatelliteEditor({ draft, running, busy, change, save, cancel }: {
  draft: SatelliteDraft; running: boolean; busy: boolean; change: (draft: SatelliteDraft) => void; save: () => void; cancel: () => void;
}) {
  return <form className="rounded-2xl border border-blue-300/20 bg-blue-300/[.035] p-5" onSubmit={e => { e.preventDefault(); save() }}>
    <h2 className="mb-4 text-sm font-semibold">{draft.id ? "Edit satellite" : "New satellite"}</h2>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <label className="text-xs text-white/60">Satellite name<input className={ioField} required maxLength={64} value={draft.name} disabled={busy} autoComplete="off" onChange={e => change({ ...draft, name: e.target.value })} /></label>
      <label className="text-xs text-white/60">Meeting ID<input className={ioField} required maxLength={20} value={draft.meetingId} disabled={busy || running} inputMode="numeric" autoComplete="off" onChange={e => change({ ...draft, meetingId: e.target.value })} /></label>
      <label className="text-xs text-white/60">{draft.id ? "Passcode · blank keeps saved" : "Meeting passcode"}<input className={ioField} required={!draft.id} type="password" maxLength={64} value={draft.passcode} disabled={busy || running} autoComplete="new-password" onChange={e => change({ ...draft, passcode: e.target.value })} /></label>
      <label className="text-xs text-white/60">Output mode<select className={ioField} value={draft.publishMode} disabled={busy || running} onChange={e => change({ ...draft, publishMode: e.target.value as PublishMode })}><option value="share" className="bg-slate-950">Screen share · presentations</option><option value="camera" className="bg-slate-950">Camera · participant video</option></select></label>
    </div>
    <p className="mt-3 text-xs text-white/45">{running ? "Rename while connected. Disconnect to change the meeting, passcode, or output mode." : "Screen share preserves presentation detail. The destination host must allow sharing. Camera quality depends on Zoom HD settings."}</p>
    <div className="mt-4 flex gap-2"><button className={ioButton} disabled={busy}><Save size={16} />Save satellite</button><button type="button" className={ioButton} disabled={busy} onClick={cancel}>Cancel</button></div>
  </form>
}
