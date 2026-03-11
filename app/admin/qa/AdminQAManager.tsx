"use client"

import { useEffect, useMemo, useState } from "react"

type QAStatus = "pending" | "approved" | "rejected" | "answered"

type QAMessage = {
  id: string
  name: string | null
  question: string
  status: QAStatus
  is_featured: boolean
  upvotes: number
  created_at: string
}

type RoomSettings = {
  room_key: string
  rotation_enabled: boolean
  rotation_seconds: number
}

function Badge({
  children,
  tone = "default",
}: {
  children: React.ReactNode
  tone?: "default" | "green" | "yellow" | "red" | "blue"
}) {
  const styles =
    tone === "green"
      ? "border-green-400/20 bg-green-400/10 text-green-300"
      : tone === "yellow"
      ? "border-yellow-400/20 bg-yellow-400/10 text-yellow-300"
      : tone === "red"
      ? "border-red-400/20 bg-red-400/10 text-red-300"
      : tone === "blue"
      ? "border-blue-400/20 bg-blue-400/10 text-blue-300"
      : "border-white/10 bg-white/5 text-white/70"

  return <span className={`rounded-full border px-2 py-1 text-xs ${styles}`}>{children}</span>
}

export default function AdminQAManager({ roomKey = "general" }: { roomKey?: string }) {
  const [items, setItems] = useState<QAMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [settings, setSettings] = useState<RoomSettings>({
    room_key: roomKey,
    rotation_enabled: true,
    rotation_seconds: 15,
  })
  const [savingSettings, setSavingSettings] = useState(false)

  async function load() {
    try {
      const [itemsRes, settingsRes] = await Promise.all([
        fetch(`/api/qa/list?room_key=${encodeURIComponent(roomKey)}&admin=1`, {
          cache: "no-store",
        }),
        fetch(`/api/qa/room-settings?room_key=${encodeURIComponent(roomKey)}`, {
          cache: "no-store",
        }),
      ])

      const itemsData = await itemsRes.json()
      const settingsData = await settingsRes.json()

      setItems(Array.isArray(itemsData?.items) ? itemsData.items : [])
      if (settingsData?.settings) setSettings(settingsData.settings)
    } finally {
      setLoading(false)
    }
  }

  async function setStatus(id: string, status: QAStatus) {
    setBusyId(id)
    try {
      await fetch("/api/qa/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "set_status", status }),
      })
      await load()
    } finally {
      setBusyId(null)
    }
  }

  async function feature(id: string) {
    setBusyId(id)
    try {
      await fetch("/api/qa/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "feature" }),
      })
      await load()
    } finally {
      setBusyId(null)
    }
  }

  async function unfeature(id: string) {
    setBusyId(id)
    try {
      await fetch("/api/qa/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "unfeature" }),
      })
      await load()
    } finally {
      setBusyId(null)
    }
  }

  async function saveSettings() {
    setSavingSettings(true)
    try {
      await fetch("/api/qa/room-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })
      await load()
    } finally {
      setSavingSettings(false)
    }
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 3000)
    return () => clearInterval(t)
  }, [roomKey])

  const grouped = useMemo(() => {
    return {
      pending: items.filter((x) => x.status === "pending"),
      approved: items.filter((x) => x.status === "approved"),
      answered: items.filter((x) => x.status === "answered"),
      rejected: items.filter((x) => x.status === "rejected"),
      featured: items.filter((x) => x.is_featured),
    }
  }, [items])

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Q&A Moderation</h1>
            <div className="mt-1 text-sm text-white/50">Room: {roomKey}</div>
          </div>
          <button
            onClick={load}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
          >
            Refresh
          </button>
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-white/50">Pending</div>
              <div className="mt-1 text-2xl font-bold">{grouped.pending.length}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-white/50">Approved</div>
              <div className="mt-1 text-2xl font-bold">{grouped.approved.length}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-white/50">Answered</div>
              <div className="mt-1 text-2xl font-bold">{grouped.answered.length}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-white/50">Rejected</div>
              <div className="mt-1 text-2xl font-bold">{grouped.rejected.length}</div>
            </div>
            <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4">
              <div className="text-sm text-yellow-200/80">Rotation Queue</div>
              <div className="mt-1 text-2xl font-bold">{grouped.featured.length}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm font-semibold">Rotation Settings</div>

            <label className="mt-4 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.rotation_enabled}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, rotation_enabled: e.target.checked }))
                }
              />
              Enable auto-rotation
            </label>

            <div className="mt-4">
              <div className="mb-2 text-xs text-white/50">Seconds per question</div>
              <input
                type="number"
                min={5}
                max={120}
                value={settings.rotation_seconds}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    rotation_seconds: Number(e.target.value || 15),
                  }))
                }
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white"
              />
            </div>

            <button
              onClick={saveSettings}
              disabled={savingSettings}
              className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
            >
              {savingSettings ? "Saving..." : "Save Rotation Settings"}
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-black/30 text-white/70">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Question</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Votes</th>
                  <th className="px-4 py-3">Rotation</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-white/50">
                      Loading...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-white/50">
                      No questions yet.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="border-t border-white/10 align-top">
                      <td className="px-4 py-4">
                        {item.name?.trim() || <span className="text-white/40">Anonymous</span>}
                      </td>
                      <td className="px-4 py-4">
                        <div className="max-w-[680px] text-white/90">{item.question}</div>
                        <div className="mt-2 text-xs text-white/40">
                          {new Date(item.created_at).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {item.status === "pending" ? (
                          <Badge tone="yellow">Pending</Badge>
                        ) : item.status === "approved" ? (
                          <Badge tone="green">Approved</Badge>
                        ) : item.status === "answered" ? (
                          <Badge tone="blue">Answered</Badge>
                        ) : (
                          <Badge tone="red">Rejected</Badge>
                        )}
                      </td>
                      <td className="px-4 py-4">{item.upvotes}</td>
                      <td className="px-4 py-4">
                        {item.is_featured ? <Badge tone="yellow">Queued</Badge> : <Badge>—</Badge>}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            disabled={busyId === item.id}
                            onClick={() => setStatus(item.id, "approved")}
                            className="rounded-lg bg-green-600 px-3 py-1.5 text-xs hover:bg-green-500 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            disabled={busyId === item.id}
                            onClick={() => setStatus(item.id, "rejected")}
                            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs hover:bg-red-500 disabled:opacity-50"
                          >
                            Reject
                          </button>
                          <button
                            disabled={busyId === item.id}
                            onClick={() => setStatus(item.id, "answered")}
                            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs hover:bg-blue-500 disabled:opacity-50"
                          >
                            Answered
                          </button>

                          {!item.is_featured ? (
                            <button
                              disabled={busyId === item.id}
                              onClick={() => feature(item.id)}
                              className="rounded-lg bg-yellow-600 px-3 py-1.5 text-xs hover:bg-yellow-500 disabled:opacity-50"
                            >
                              Add to Rotation
                            </button>
                          ) : (
                            <button
                              disabled={busyId === item.id}
                              onClick={() => unfeature(item.id)}
                              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10 disabled:opacity-50"
                            >
                              Remove from Rotation
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  )
}