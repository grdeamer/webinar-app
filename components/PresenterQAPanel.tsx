"use client"

import { useEffect, useState } from "react"

type Q = {
  id: string
  name: string | null
  question: string
  is_featured: boolean
}

export default function PresenterQAPanel({ roomKey = "general" }) {
  const [featured, setFeatured] = useState<Q | null>(null)
  const [queue, setQueue] = useState<Q[]>([])

  async function load() {
    const res = await fetch(`/api/qa/featured?room_key=${roomKey}`)
    const data = await res.json()

    setFeatured(data.featured || null)
    setQueue(data.queue || [])
  }

  async function markAnswered(id: string) {
    await fetch("/api/qa/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "set_status", status: "answered" }),
    })
    load()
  }

  async function featureNext(id: string) {
    await fetch("/api/qa/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "feature" }),
    })
    load()
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 3000)
    return () => clearInterval(t)
  }, [])

  const next = queue.find((q) => q.id !== featured?.id)

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-4">
        <div className="text-xs uppercase text-yellow-200">Current Question</div>

        {featured ? (
          <>
            <div className="mt-2 text-sm text-white/60">
              {featured.name || "Anonymous"}
            </div>

            <div className="text-xl font-semibold">{featured.question}</div>

            <button
              onClick={() => markAnswered(featured.id)}
              className="mt-3 rounded bg-blue-600 px-4 py-2"
            >
              Mark Answered
            </button>
          </>
        ) : (
          <div className="text-white/60">No question currently featured</div>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-xs uppercase text-white/60">Next Question</div>

        {next ? (
          <>
            <div className="mt-2 text-sm text-white/60">
              {next.name || "Anonymous"}
            </div>

            <div className="text-lg font-semibold">{next.question}</div>

            <button
              onClick={() => featureNext(next.id)}
              className="mt-3 rounded bg-yellow-600 px-4 py-2"
            >
              Feature Next
            </button>
          </>
        ) : (
          <div className="text-white/60">No next question queued</div>
        )}
      </div>
    </div>
  )
}