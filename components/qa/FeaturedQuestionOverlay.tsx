// components/qa/FeaturedQuestionOverlay.tsx

"use client"

import { useEffect, useState } from "react"
import type { QAMessage } from "@/lib/qa"

export default function FeaturedQuestionOverlay({
  roomKey = "general",
}: {
  roomKey?: string
}) {
  const [featured, setFeatured] = useState<QAMessage | null>(null)

  async function load() {
    const res = await fetch(
      `/api/qa/featured?room_key=${encodeURIComponent(roomKey)}`,
      { cache: "no-store" }
    )
    const data = await res.json()
    setFeatured(data?.featured || null)
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 3000)
    return () => clearInterval(t)
  }, [roomKey])

  if (!featured) return null

  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 w-[min(1000px,calc(100%-2rem))] -translate-x-1/2">
      <div className="rounded-2xl border border-white/15 bg-black/75 px-6 py-4 shadow-2xl backdrop-blur">
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-yellow-300/90">
          Featured Question
        </div>

        <div className="text-sm text-white/60">
          {featured.name?.trim() || "Anonymous"}
        </div>

        <div className="mt-1 text-xl font-semibold text-white">
          {featured.question}
        </div>
      </div>
    </div>
  )
}