"use client"

import { useEffect, useState } from "react"
import type { JSX } from "react"

function Card({
  label,
  value,
  sub,
  tone = "",
}: {
  label: string
  value: string
  sub?: string
  tone?: string
}) {
  return (
    <div className={`rounded-[24px] border px-4 py-3 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.018))] shadow-[0_18px_55px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.04)] ${tone}`}>
      <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/35">
        {label}
      </div>

      <div className="mt-1 text-lg font-semibold text-white">{value}</div>

      {sub ? <div className="mt-1 text-xs text-white/42">{sub}</div> : null}
    </div>
  )
}

export default function ProducerTopDeck(): JSX.Element {
  const [viewers, setViewers] = useState(2458)
  const [bitrate, setBitrate] = useState(8.4)
  const [clock, setClock] = useState("00:28:47")
  const [meter, setMeter] = useState([9, 7, 10])

  useEffect(() => {
    const id = setInterval(() => {
      setViewers((v) => v + Math.floor(Math.random() * 3 - 1))
      setBitrate(Number((8 + Math.random() * 1.8).toFixed(1)))

      setMeter([
        7 + Math.floor(Math.random() * 5),
        5 + Math.floor(Math.random() * 5),
        8 + Math.floor(Math.random() * 4),
      ])
    }, 1200)

    return () => clearInterval(id)
  }, [])

  return (
    <div className="grid gap-3 xl:grid-cols-[1.1fr_1fr_1fr_1fr_1.5fr_0.8fr]">
      <Card
        label="Active Session"
        value="Session A1"
        sub="Holding"
      />

      <Card
        label="Stream Health"
        value="Excellent"
        sub={`${bitrate} Mbps`}
        tone="border-emerald-400/20"
      />

      <div className="rounded-[24px] border border-red-400/22 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.16),transparent_34%),rgba(239,68,68,0.07)] px-4 py-3 shadow-[0_18px_55px_rgba(0,0,0,0.26),0_0_26px_rgba(239,68,68,0.10)]">
        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/35">
          Recording
        </div>

        <div className="mt-1 flex items-center gap-2 text-lg font-semibold text-white">
          <span className="h-3 w-3 rounded-full bg-red-400 animate-pulse shadow-[0_0_14px_rgba(248,113,113,0.9)]" />
          REC
        </div>

        <div className="mt-1 text-xs text-white/45">{clock}</div>
      </div>

      <Card
        label="Audience"
        value={viewers.toLocaleString()}
        sub="Live viewers"
        tone="border-sky-400/20"
      />

      <div className="rounded-[24px] border border-emerald-300/14 bg-[radial-gradient(circle_at_top_right,rgba(52,211,153,0.14),transparent_34%),linear-gradient(180deg,rgba(10,24,22,0.84),rgba(4,10,12,0.94))] px-4 py-3 shadow-[0_18px_55px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/35">
          Audio Mixer
        </div>

        <div className="mt-3 space-y-2">
          {meter.map((row, r) => (
            <div key={r} className="grid grid-cols-12 gap-1 rounded-full border border-white/8 bg-black/30 px-1 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2 rounded-full ${
                    i < row
                      ? "bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.65)]"
                      : "bg-white/10"
                  }`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.018))] p-3 shadow-[0_18px_55px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="grid h-full grid-cols-2 gap-2">
          {["Replay", "Capture", "Clip", "Macro"].map((b) => (
            <button
              key={b}
              className="rounded-2xl border border-white/10 bg-black/30 text-[10px] font-black uppercase tracking-[0.14em] text-white/65 transition hover:-translate-y-0.5 hover:bg-white/[0.06] active:translate-y-0"
            >
              {b}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}