"use client"

import { useEffect, useState } from "react"

type QAMessage = {
  id: string
  name: string | null
  question: string
}

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
    <div className="pointer-events-none absolute inset-x-0 bottom-6 z-30 flex justify-center px-6">
      <div className="w-full max-w-4xl rounded-2xl border border-white/15 bg-black/75 px-6 py-4 shadow-2xl backdrop-blur">
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