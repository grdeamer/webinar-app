"use client"

import { useEffect, useState } from "react"

export default function QASubmitBox({ roomKey }: { roomKey: string }) {
  const [name, setName] = useState("")
  const [question, setQuestion] = useState("")
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [originLat, setOriginLat] = useState<number | null>(null)
  const [originLng, setOriginLng] = useState<number | null>(null)

  useEffect(() => {
    if (!navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setOriginLat(position.coords.latitude)
        setOriginLng(position.coords.longitude)
      },
      () => {
        setOriginLat(null)
        setOriginLng(null)
      },
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 60000,
      }
    )
  }, [])

  async function submit() {
    if (!question.trim()) return

    setSending(true)
    setSent(false)

    try {
      const res = await fetch("/api/qa/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          room_key: roomKey,
          name,
          question,
          origin_lat: originLat,
          origin_lng: originLng,
        }),
      })

      if (!res.ok) {
        const data = (await res.json().catch((): null => null)) as
          | { error?: string }
          | null

        throw new Error(data?.error || "Failed to submit question")
      }

      setQuestion("")
      setSent(true)
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Failed to submit question"
      )
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
      <h3 className="mb-2 text-lg font-semibold">Ask a Question</h3>

      <input
        placeholder="Your name (optional)"
        className="mb-2 w-full rounded border border-white/10 bg-black/40 p-2"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <textarea
        placeholder="Type your question..."
        className="w-full rounded border border-white/10 bg-black/40 p-2"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />

      <button
        onClick={submit}
        disabled={sending}
        className="mt-2 rounded bg-blue-600 px-4 py-2"
      >
        {sending ? "Sending..." : "Submit Question"}
      </button>

      {sent && (
        <div className="mt-2 text-sm text-green-400">
          Question submitted for review
        </div>
      )}
    </div>
  )
}