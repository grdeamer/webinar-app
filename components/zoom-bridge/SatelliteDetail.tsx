"use client"
import { useState } from "react"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import SatelliteCard from "./SatelliteCard"
import SatelliteEditor, { type SatelliteDraft } from "./SatelliteEditor"
import SatellitePreview from "./SatellitePreview"
import type { ZoomRoom, ZoomAction } from "@/lib/zoom-bridge/types"
export default function SatelliteDetail({ room, busy, close, command, save, remove }: {
  room: ZoomRoom; busy: boolean; close: () => void; command: (id: string, action: ZoomAction) => void;
  save: (draft: SatelliteDraft) => Promise<boolean>; remove: (room: ZoomRoom) => void;
}) {
  const [draft, setDraft] = useState<SatelliteDraft | null>(null)
  return <Dialog open onOpenChange={open => { if (!open) close() }}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto border border-blue-200/20 bg-[#0b1222] p-6 text-white sm:max-w-[1120px]">
      <div className="pr-8"><p className="mb-2 text-[10px] uppercase tracking-[.22em] text-blue-200/60">Jupiter Io · Satellite control</p><DialogTitle className="text-2xl font-semibold">{room.name}</DialogTitle><DialogDescription className="mt-2 text-white/45">Inspect the outgoing program, control picture and audio, and manage this destination.</DialogDescription></div>
      <div className="grid items-start gap-5 lg:grid-cols-[1.4fr_1fr]">
        <SatellitePreview room={room} />
        <div className="space-y-4"><SatelliteCard room={room} busy={busy} command={command} edit={r => setDraft({ key: r.id, id: r.id, name: r.name, meetingId: r.meetingId, passcode: "", publishMode: r.publishMode })} remove={remove} />
          <dl className="grid grid-cols-2 gap-4 rounded-xl border border-white/10 p-4 text-xs">
            <div><dt className="text-white/40">Meeting passcode</dt><dd className="mt-1">{room.hasPasscode ? "Saved securely" : "Not configured"}</dd></div>
            <div><dt className="text-white/40">Last controller report</dt><dd className="mt-1">{room.lastSeen ? new Date(room.lastSeen).toLocaleTimeString() : "No report yet"}</dd></div>
            <div><dt className="text-white/40">Requested picture</dt><dd className="mt-1">{room.camera ? "On" : "Off"}</dd></div>
            <div><dt className="text-white/40">Requested audio</dt><dd className="mt-1">{room.microphone ? "Unmuted" : "Muted"}</dd></div>
          </dl>
        </div>
      </div>
      {draft ? <SatelliteEditor draft={draft} running={room.running} busy={busy} change={setDraft} cancel={() => setDraft(null)} save={() => { void save(draft).then(ok => { if (ok) setDraft(null) }) }} /> : null}
    </DialogContent>
  </Dialog>
}
