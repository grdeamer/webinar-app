"use client"

import Link from "next/link"

type Props = {
  title: string
  description?: string | null
  liveLabel?: string
  isLive?: boolean
}

export default function JupiterHomeHero({
  title,
  description,
  liveLabel,
  isLive,
}: Props) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.15),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(139,92,246,0.18),transparent_40%),linear-gradient(180deg,rgba(2,6,23,0.96),rgba(2,6,23,1))] px-10 py-16 text-white">
      
      {/* subtle glow */}
      <div className="pointer-events-none absolute inset-0 opacity-40 blur-3xl" />

      <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        
        {/* LEFT */}
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-white/40">
            Jupiter Event
          </div>

          <h1 className="mt-4 text-4xl font-bold leading-tight">
            {title}
          </h1>

          <p className="mt-4 max-w-xl text-white/65">
            {description ||
              "This is your event in motion. Every moment, every session, connected."}
          </p>

          <div className="mt-6 flex gap-3">
            <Link
              href="#event-access"
              className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-200"
            >
              Enter your lobby
            </Link>

            <Link
              href="#agenda"
              className="rounded-xl border border-white/15 bg-white/10 px-5 py-3 text-sm hover:bg-white/15"
            >
              View agenda
            </Link>
          </div>
        </div>

        {/* RIGHT — LIVE STATUS PANEL */}
        <div className="space-y-4">
          
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-white/40">
              Broadcast Status
            </div>

            <div
              className={`mt-3 text-lg font-semibold ${
                isLive ? "text-red-400" : "text-white"
              }`}
            >
              {liveLabel || "Preparing experience"}
            </div>

            <p className="mt-2 text-sm text-white/60">
              {isLive
                ? "Live now. Stay here while the event unfolds."
                : "Stay on this page while we prepare the next moment."}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-white/40">
              Experience
            </div>

            <p className="mt-2 text-sm text-white/60">
              Move seamlessly between sessions, speakers, and live moments —
              without losing the thread.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}