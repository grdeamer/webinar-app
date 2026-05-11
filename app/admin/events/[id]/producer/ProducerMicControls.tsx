"use client"

import { useEffect, useState, type JSX } from "react"
import { useRoomContext } from "@livekit/components-react"
import { Activity, Mic2 } from "lucide-react"

export default function ProducerMicControls(): JSX.Element {
  const room = useRoomContext()
  const [micEnabled, setMicEnabled] = useState(
    room.localParticipant.isMicrophoneEnabled
  )
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const tag = (event.target as HTMLElement | null)?.tagName?.toLowerCase()
      if (tag === "input" || tag === "textarea" || tag === "select") return

      if (event.code === "KeyM") {
        event.preventDefault()
        void setMic(!room.localParticipant.isMicrophoneEnabled)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [room])

  async function setMic(value: boolean) {
    try {
      setBusy(true)
      await room.localParticipant.setMicrophoneEnabled(value)
      setMicEnabled(room.localParticipant.isMicrophoneEnabled)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative overflow-hidden rounded-[30px] border border-violet-200/18 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.16),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.10),transparent_34%),linear-gradient(180deg,rgba(24,18,38,0.84),rgba(6,6,14,0.96))] p-3.5 shadow-[0_22px_66px_rgba(0,0,0,0.34),0_0_30px_rgba(168,85,247,0.08),inset_0_1px_0_rgba(255,255,255,0.055)]">
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-violet-100/42 to-transparent" />
      <div className="relative z-10 mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-violet-100/72">
            <Mic2 size={13} />
            IFB + Talkback
          </div>
          <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.13em] text-white/34">
            Producer mic · talent cue channel
          </div>
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ${
            micEnabled
              ? "border-emerald-200/32 bg-emerald-300/12 text-emerald-50"
              : "border-red-200/28 bg-red-500/12 text-red-100"
          }`}
        >
          {micEnabled ? "Open" : "Muted"}
        </span>
      </div>

      <div className="relative z-10 grid gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void setMic(!micEnabled)}
          className={`rounded-2xl border px-4 py-3 text-sm font-black uppercase tracking-[0.16em] transition hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 ${
            micEnabled
              ? "border-emerald-200/42 bg-emerald-300/18 text-emerald-50 shadow-[0_0_26px_rgba(52,211,153,0.20),inset_0_1px_0_rgba(255,255,255,0.06)] hover:bg-emerald-300/26"
              : "border-red-200/36 bg-red-500/18 text-red-100 shadow-[0_0_26px_rgba(239,68,68,0.20),inset_0_1px_0_rgba(255,255,255,0.06)] hover:bg-red-500/26"
          }`}
        >
          {micEnabled ? "Mic On · M" : "Mic Muted · M"}
        </button>

        <button
          type="button"
          disabled={busy || !micEnabled}
          onMouseDown={() => void setMic(false)}
          onMouseUp={() => void setMic(true)}
          onMouseLeave={() => void setMic(true)}
          className="rounded-2xl border border-white/12 bg-white/[0.05] px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:-translate-y-0.5 hover:border-white/18 hover:bg-white/[0.08] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Hold to Cough
        </button>
      </div>

      <div className="relative z-10 mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-[16px] border border-white/8 bg-black/24 p-2 text-center">
          <div className="flex items-center justify-center gap-1.5 text-[8px] font-black uppercase tracking-[0.16em] text-white/38">
            <Activity size={10} /> IFB
          </div>
          <div className="mt-1 text-xs font-semibold text-white/62">Talent</div>
        </div>
        <div className="rounded-[16px] border border-white/8 bg-black/24 p-2 text-center">
          <div className="text-[8px] font-black uppercase tracking-[0.16em] text-white/38">
            Talkback
          </div>
          <div className="mt-1 text-xs font-semibold text-white/62">Producer</div>
        </div>
      </div>
    </div>
  )
}