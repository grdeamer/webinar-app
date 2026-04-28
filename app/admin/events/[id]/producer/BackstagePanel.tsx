"use client"

import type { ReactNode } from "react"

export default function BackstagePanel({
  participantCount,
  children,
}: {
  participantCount: number
  children: ReactNode
}) {
  return (
    <div className="rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.14),transparent_34%),linear-gradient(180deg,rgba(10,16,34,0.94),rgba(4,8,18,0.96))] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.05)]">
      <div className="mb-4 flex items-end justify-between gap-3 rounded-[24px] border border-white/8 bg-black/20 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.26em] text-white/38">
            Backstage
          </div>
          <div className="mt-1 text-xl font-semibold text-white">
            {participantCount} connected
          </div>
          <div className="mt-1 text-sm text-white/42">
            Select who goes to stage and manage active sources.
          </div>
        </div>

        <span className="rounded-full border border-violet-300/20 bg-violet-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-violet-100/80 shadow-[0_0_18px_rgba(168,85,247,0.16)]">
          Live Room
        </span>
      </div>

      <div className="space-y-3">{children}</div>
    </div>
  )
}