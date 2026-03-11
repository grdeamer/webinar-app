"use client"

import React from "react"

type Msg = {
  id: string
  name: string | null
  message: string
  created_at: string
}

function getSessionId() {
  const key = "attendee_session_id"
  if (typeof window === "undefined") return ""
  let v = localStorage.getItem(key)
  if (!v) {
    v = crypto.randomUUID()
    localStorage.setItem(key, v)
  }
  return v
}

export default function EventChatRoom(props: { eventSlug: string; roomKey?: string }) {
  const roomKey = props.roomKey || "general"
  const [name, setName] = React.useState("")
  const [text, setText] = React.useState("")
  const [msgs, setMsgs] = React.useState<Msg[]>([])
  const [busy, setBusy] = React.useState(false)
  const sessionId = React.useMemo(() => getSessionId(), [])

  async function refresh() {
    const res = await fetch(`/api/events/${props.eventSlug}/chat?room_key=${encodeURIComponent(roomKey)}`, { cache: "no-store" })
    const json = await res.json()
    setMsgs(json.messages || [])
  }

  React.useEffect(() => {
    refresh()
    const id = setInterval(refresh, 4000)
    return () => clearInterval(id)
  }, [props.eventSlug, roomKey])

  async function send() {
    if (!text.trim()) return
    setBusy(true)
    try {
      await fetch(`/api/events/${props.eventSlug}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room_key: roomKey,
          session_id: sessionId,
          name: name.trim() || null,
          message: text.trim(),
        }),
      })
      setText("")
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="text-lg font-semibold">Chat</div>
        <button
          className="text-xs rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 hover:bg-white/10"
          onClick={refresh}
        >
          Refresh
        </button>
      </div>

      <div className="mt-3 flex gap-2">
        <input
          className="w-56 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
          placeholder="Your name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="text-xs text-white/40 flex items-center">Room: {roomKey}</div>
      </div>

      <div className="mt-4 h-[420px] overflow-auto rounded-xl border border-white/10 bg-black/30 p-3 space-y-2">
        {msgs.map((m) => (
          <div key={m.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-baseline justify-between gap-3">
              <div className="text-sm font-semibold">{m.name || "Anonymous"}</div>
              <div className="text-[11px] text-white/40">{new Date(m.created_at).toLocaleTimeString()}</div>
            </div>
            <div className="mt-1 text-sm text-white/80 whitespace-pre-wrap">{m.message}</div>
          </div>
        ))}
        {msgs.length === 0 ? <div className="text-sm text-white/50">No messages yet.</div> : null}
      </div>

      <div className="mt-4 flex gap-2">
        <input
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
          placeholder="Type a message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
        />
        <button
          disabled={busy}
          className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold hover:bg-emerald-500 disabled:opacity-60"
          onClick={send}
        >
          Send
        </button>
      </div>
    </div>
  )
}
