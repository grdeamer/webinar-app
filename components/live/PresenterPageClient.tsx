"use client"

import SimplePresenterClient, {
  PresenterNextContentPanel,
  PresenterProgramMonitor,
  PresenterStatusRail,
} from "@/components/live/SimplePresenterClient"
import { Badge } from "@/components/ui/badge"
import { motion } from "motion/react"

type PresenterPageClientProps = {
  eventTitle: string
  sessionTitle: string
  sessionId: string
  slug: string
}

export default function PresenterPageClient({
  eventTitle,
  sessionTitle,
  sessionId,
  slug,
}: PresenterPageClientProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.12),transparent_40%),rgba(255,255,255,0.04)] p-6 shadow-[0_0_40px_rgba(139,92,246,0.08)]"
        >
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-200/50">
            Presenter View
          </div>

          <div className="mt-2 text-xs uppercase tracking-[0.18em] text-white/40">
            {eventTitle}
          </div>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            {sessionTitle}
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60">
            Monitor Program, track what’s next, and stay in sync with the producer.
          </p>
        </motion.div>

        {/* Status */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
        >
          <PresenterStatusRail channelKey={`jupiter:presenter-status:${sessionId}`} />
        </motion.div>

        {/* PROGRAM (Top) */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
          className="rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.12),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.018))] p-4 shadow-[0_0_48px_rgba(239,68,68,0.08),inset_0_1px_0_rgba(255,255,255,0.06)]"
        >
          <div className="mb-3 flex items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">
                Program Monitor
              </div>
              <div className="mt-1 text-sm font-semibold text-white/70">
                What the audience sees
              </div>
            </div>

            <Badge
              variant="destructive"
              className="relative overflow-hidden rounded-full border border-red-300/30 bg-red-500/15 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-red-50 shadow-[0_0_22px_rgba(248,113,113,0.25)]"
            >
              <span className="absolute inset-0 animate-pulse bg-red-400/10" />
              <span className="relative flex items-center gap-2">
                <span className="h-2 w-2 animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="-ml-4 h-2 w-2 rounded-full bg-red-400 shadow-[0_0_12px_rgba(248,113,113,0.95)]" />
                Live
              </span>
            </Badge>
          </div>

          <div className="relative h-[380px] w-full overflow-hidden rounded-[1.5rem] border border-white/10 bg-black shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_22px_70px_rgba(0,0,0,0.45)]">
            <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.35)),linear-gradient(180deg,rgba(255,255,255,0.055),transparent_18%,transparent_80%,rgba(255,255,255,0.035))]" />
            <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-24 bg-[linear-gradient(105deg,rgba(255,255,255,0.12),transparent_42%)] opacity-45" />
            <div className="pointer-events-none absolute inset-0 z-20 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[length:100%_5px] opacity-20" />
            <div className="pointer-events-none absolute left-4 top-4 z-30 rounded-full border border-white/10 bg-black/55 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/55 shadow-[0_0_18px_rgba(0,0,0,0.25)] backdrop-blur">
              Program Feed
            </div>
            <div className="pointer-events-none absolute bottom-4 left-4 z-30 rounded-full border border-red-300/20 bg-red-500/12 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-red-100/80 shadow-[0_0_18px_rgba(248,113,113,0.12)] backdrop-blur">
              Awaiting Program Source
            </div>
            <PresenterProgramMonitor
              tokenEndpoint={`/api/events/${slug}/sessions/${sessionId}/live/presenter-token`}
              programSourceChannelKey={`jupiter:program-source:${sessionId}`}
            />
          </div>
        </motion.div>

        {/* Bottom Grid */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.12 }}
          className="grid grid-cols-1 gap-6 md:grid-cols-3"
        >
          {/* NEXT CONTENT */}
          <PresenterNextContentPanel channelKey={`jupiter:presenter-next:${sessionId}`} />

          {/* SETUP PANEL */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
              Setup
            </div>

            {/* Camera Preview */}
            <div className="mb-4 overflow-hidden rounded-2xl border border-white/10">
              <SimplePresenterClient
                tokenEndpoint={`/api/events/${slug}/sessions/${sessionId}/live/presenter-token`}
                eventTitle={eventTitle}
                statusChannelKey={`jupiter:presenter-status:${sessionId}`}
              />
            </div>
          </div>
        </motion.div>

        {/* Note */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.16 }}
          className="rounded-2xl border border-violet-300/20 bg-violet-500/10 p-4 text-sm text-violet-100/80"
        >
          Stay connected and follow the producer’s cues. You’ll be brought live when ready.
        </motion.div>
      </div>
    </div>
  )
}