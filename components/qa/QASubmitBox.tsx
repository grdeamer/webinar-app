// components/qa/QASubmitBox.tsx

"use client"

import { useState } from "react"

export default function QASubmitBox({
  roomKey = "general",
  eventId = null,
}: {
  roomKey?: string
  eventId?: string | null
}) {
  const [name, setName] = useState("")
  const [question, setQuestion] = useState("")
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSuccess("")

    const q = question.trim()
    if (!q) {
      setError("Please enter a question.")
      return
    }

    setSending(true)

    try {
      const res = await fetch("/api/qa/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room_key: roomKey,
          event_id: eventId,
          name,
          question: q,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data?.error || "Could not submit your question.")
        return
      }

      setQuestion("")
      setSuccess("Question submitted for moderator review.")
    } catch {
      setError("Network error while submitting question.")
    } finally {
      setSending(false)
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg"
    >
      <div className="mb-3 text-lg font-semibold text-white">Ask a Question</div>

      <div className="grid gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name (optional)"
          className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white outline-none placeholder:text-white/40"
          maxLength={100}
        />

        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Type your question here..."
          className="min-h-[120px] w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-white outline-none placeholder:text-white/40"
          maxLength={1000}
        />

        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-white/50">
            Questions are reviewed before appearing on screen.
          </div>

          <button
            type="submit"
            disabled={sending}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? "Submitting..." : "Submit Question"}
          </button>
        </div>

        {success ? <div className="text-sm text-green-400">{success}</div> : null}
        {error ? <div className="text-sm text-red-400">{error}</div> : null}
      </div>
    </form>
  )
}