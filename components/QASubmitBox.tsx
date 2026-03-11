"use client"

import { useState } from "react"

export default function QASubmitBox({ roomKey }: { roomKey: string }) {
  const [name, setName] = useState("")
  const [question, setQuestion] = useState("")
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function submit() {
    if (!question) return

    setSending(true)

    await fetch("/api/qa/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        room_key: roomKey,
        name,
        question,
      }),
    })

    setQuestion("")
    setSent(true)
    setSending(false)
  }

  return (
    <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
      <h3 className="text-lg font-semibold mb-2">Ask a Question</h3>

      <input
        placeholder="Your name (optional)"
        className="w-full mb-2 rounded bg-black/40 border border-white/10 p-2"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <textarea
        placeholder="Type your question..."
        className="w-full rounded bg-black/40 border border-white/10 p-2"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />

      <button
        onClick={submit}
        disabled={sending}
        className="mt-2 px-4 py-2 bg-blue-600 rounded"
      >
        {sending ? "Sending..." : "Submit Question"}
      </button>

      {sent && (
        <div className="text-green-400 text-sm mt-2">
          Question submitted for review
        </div>
      )}
    </div>
  )
}