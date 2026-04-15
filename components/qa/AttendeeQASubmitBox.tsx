"use client"

import { useEffect, useState } from "react"

export default function AttendeeQASubmitBox({
  roomKey,
  eventId,
  attendeeName,
}: {
  roomKey: string
  eventId: string
  attendeeName?: string | null
}) {
  const [question, setQuestion] = useState("")
  const [name, setName] = useState(attendeeName ?? "")
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [originLat, setOriginLat] = useState<number | null>(null)
  const [originLng, setOriginLng] = useState<number | null>(null)

useEffect(() => {
  if (!navigator.geolocation) {
    console.log("NO GEO SUPPORT")
    return
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      console.log("GEO SUCCESS", position.coords)
      setOriginLat(position.coords.latitude)
      setOriginLng(position.coords.longitude)
    },
    (error) => {
      console.log("GEO ERROR", error)
      setOriginLat(null)
      setOriginLng(null)
    },
    {
      enableHighAccuracy: false,
      timeout: 20000,
      maximumAge: 300000,
    }
  )
}, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const trimmedQuestion = question.trim()
    if (!trimmedQuestion) {
      setStatus("Please enter a question.")
      return
    }

    setSubmitting(true)
    setStatus(null)

    try {
      const res = await fetch("/api/qa/submit", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          room_key: roomKey,
          event_id: eventId,
          name: name.trim() || "Anonymous",
          question: trimmedQuestion,
          origin_lat: originLat,
          origin_lng: originLng,
        }),
      })

      const data = (await res.json().catch((): null => null)) as
        | { ok?: boolean; error?: string }
        | null

      if (!res.ok) {
        throw new Error(data?.error || "Failed to submit question")
      }

      setQuestion("")
      setStatus("Question submitted.")
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Failed to submit question"
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(2,6,23,0.96))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
      <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">
        Q&A
      </div>

      <h3 className="mt-3 text-xl font-semibold text-white">
        Submit a question
      </h3>

      <p className="mt-2 text-sm leading-6 text-white/55">
        Send a question to the event team for review.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-white/40">
            Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-white/40">
            Question
          </label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Type your question here..."
            rows={4}
            className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit question"}
          </button>

          {status ? (
            <div className="text-sm text-white/60">{status}</div>
          ) : null}
        </div>
      </form>
    </div>
  )
}