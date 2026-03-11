// components/qa/QAList.tsx

"use client"

import { useEffect, useState } from "react"
import type { QAMessage } from "@/lib/qa"

export default function QAList({ roomKey = "general" }: { roomKey?: string }) {
  const [items, setItems] = useState<QAMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function load() {
    try {
      const res = await fetch(`/api/qa/list?room_key=${encodeURIComponent(roomKey)}`, {
        cache: "no-store",
      })
      const data = await res.json()
      setItems(Array.isArray(data?.items) ? data.items : [])
    } finally {
      setLoading(false)
    }
  }

  async function upvote(id: string) {
    setBusyId(id)
    try {
      await fetch("/api/qa/upvote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qa_message_id: id }),
      })
      await load()
    } finally {
      setBusyId(null)
    }
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 4000)
    return () => clearInterval(t)
  }, [roomKey])

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-lg font-semibold text-white">Live Q&A</div>
        <div className="text-xs text-white/50">
          {loading ? "Loading..." : `${items.length} visible`}
        </div>
      </div>

      {!loading && items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-white/50">
          No approved questions yet.
        </div>
      ) : null}

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-white/10 bg-black/20 p-4"
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-white">
                  {item.name?.trim() || "Anonymous"}
                </div>
                <div className="mt-1 text-base text-white/90">{item.question}</div>
              </div>

              {item.is_featured ? (
                <div className="shrink-0 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-2 py-1 text-xs text-yellow-300">
                  Featured
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs text-white/40">
                {item.status === "answered" ? "Answered" : "Open"}
              </div>

              <button
                onClick={() => upvote(item.id)}
                disabled={busyId === item.id}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white hover:bg-white/10 disabled:opacity-50"
              >
                ▲ {item.upvotes}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}