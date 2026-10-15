"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import type { ZoomRoom } from "@/lib/zoom-bridge/types"
import SatelliteEditor, { type SatelliteDraft } from "./SatelliteEditor"

export default function SatelliteEditDialog({ room, busy, close, save, errorMessage }: {
  room: ZoomRoom; busy: boolean; close: () => void; save: (draft: SatelliteDraft) => Promise<boolean>;
  errorMessage?: string;
}) {
  const [draft, setDraft] = useState<SatelliteDraft>(() => ({
    key: room.id, id: room.id, name: room.name, meetingId: room.meetingId,
    passcode: "", publishMode: room.publishMode,
  }))
  const [error, setError] = useState("")
  const [returnFocus] = useState(() => typeof document !== "undefined" ? document.activeElement as HTMLElement | null : null)

  async function saveChanges() {
    setError("")
    if (await save(draft)) close()
    else setError("Changes were not saved. Check the satellite settings and try again.")
  }

  return <Dialog open onOpenChange={open => { if (!open && !busy) close() }}>
    <DialogContent onCloseAutoFocus={event => { event.preventDefault(); returnFocus?.focus() }} className="max-h-[90dvh] overflow-y-auto border border-blue-200/20 bg-[#0b1222] text-white sm:max-w-3xl">
      <DialogTitle>Edit satellite</DialogTitle>
      <DialogDescription className="text-slate-300">Update {room.name}’s name, Zoom meeting, passcode, or output mode.</DialogDescription>
      {errorMessage || error ? <p role="alert" className="text-sm text-amber-200">{errorMessage || error}</p> : null}
      <SatelliteEditor compact draft={draft} running={room.running} busy={busy} change={setDraft} save={() => { void saveChanges() }} cancel={close} />
    </DialogContent>
  </Dialog>
}
