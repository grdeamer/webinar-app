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
    <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,12,24,0.96),rgba(8,10,20,0.92))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-white/35">
            Backstage
          </div>
          <div className="mt-1 text-xl font-semibold text-white">
            {participantCount} connected
          </div>
          <div className="mt-1 text-sm text-white/45">
            Select who goes to stage and manage active sources.
          </div>
        </div>

        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
          Live room
        </span>
      </div>

      <div className="space-y-3">{children}</div>
    </div>
  )
}