"use client"
import { useState } from "react"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import SatelliteCard, { reporting } from "./SatelliteCard"
import SatelliteEditor, { type SatelliteDraft } from "./SatelliteEditor"
import SatelliteAudioMeter from "./SatelliteAudioMeter"
import SatellitePreview from "./SatellitePreview"
import type { ZoomRoom, ZoomAction } from "@/lib/zoom-bridge/types"
export default function SatelliteDetail({ room, busy, close, command, save, remove, inline = false }: {
  inline?: boolean;
  room: ZoomRoom; busy: boolean; close: () => void; command: (id: string, action: ZoomAction) => void;
  save: (draft: SatelliteDraft) => Promise<boolean>; remove: (room: ZoomRoom) => void;
}) {
  const [draft, setDraft] = useState<SatelliteDraft | null>(null)
  const content = <>

      <div className="pr-8"><p className="mb-2 text-[10px] uppercase tracking-[.22em] text-blue-200/60">Jupiter Io · Satellite control</p><h2 className="text-xl font-semibold">{room.name}<span className="ml-3 text-sm font-normal text-emerald-300">{reporting(room) && room.observed.status === "joined" ? "● Live" : room.observed.status || "Disconnected"}</span></h2></div>
      <div className="io-detail-grid grid items-start gap-5 lg:grid-cols-[1.4fr_1fr]">
        <SatellitePreview room={room} autoWatch={inline} />
        <div className="space-y-4"><h3 className="text-sm font-semibold">Broadcast controls</h3><SatelliteCard room={room} busy={busy} command={command} edit={r => setDraft({ key: r.id, id: r.id, name: r.name, meetingId: r.meetingId, passcode: "", publishMode: r.publishMode })} remove={remove} />
          <SatelliteAudioMeter room={room} />
          <details className="io-room-info"><summary className="cursor-pointer text-xs text-white/50">Meeting information</summary><dl className="grid grid-cols-2 gap-4 rounded-xl border border-white/10 p-4 text-xs">
            <div><dt className="text-white/40">Meeting passcode</dt><dd className="mt-1">{room.hasPasscode ? "Saved securely" : "Not configured"}</dd></div>
            <div><dt className="text-white/40">Last controller report</dt><dd className="mt-1">{room.lastSeen ? new Date(room.lastSeen).toLocaleTimeString() : "No report yet"}</dd></div>
            <div><dt className="text-white/40">Requested picture</dt><dd className="mt-1">{room.camera ? "On" : "Off"}</dd></div>
            <div><dt className="text-white/40">Requested audio</dt><dd className="mt-1">{room.microphone ? "Unmuted" : "Muted"}</dd></div>
          </dl></details>
        </div>
      </div>
      {draft ? <SatelliteEditor draft={draft} running={room.running} busy={busy} change={setDraft} cancel={() => setDraft(null)} save={() => { void save(draft).then(ok => { if (ok) setDraft(null) }) }} /> : null}
  </>
  if (inline) return <section className="io-panel io-detail p-5">{content}</section>
  return <Dialog open onOpenChange={open => { if (!open) close() }}><DialogContent className="max-h-[90dvh] overflow-y-auto border border-blue-200/20 bg-[#0b1222] p-6 text-white sm:max-w-[1120px]"><DialogTitle className="sr-only">{room.name}</DialogTitle><DialogDescription className="sr-only">Satellite broadcast controls</DialogDescription>{content}</DialogContent></Dialog>
}
