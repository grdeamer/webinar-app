"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function ProducerRoomSetup({ eventId }: { eventId: string }) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function createMainStage() {
    setCreating(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/events/${eventId}/producer/main-stage`, {
        method: "POST",
      })
      const result = await response.json().catch((): null => null)

      if (!response.ok) {
        throw new Error(result?.error || "Unable to create the Main Stage")
      }

      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create the Main Stage")
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-3xl rounded-3xl border border-amber-300/20 bg-amber-300/[0.06] p-8">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-100/60">
          Producer Room Setup
        </div>
        <h1 className="mt-3 text-3xl font-semibold">Create this event&apos;s Main Stage</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
          Jupiter will create the production session the switcher needs, configure it for live production, and open the Producer Room. Your Run of Show remains the agenda producers cue throughout the event.
        </p>

        {error ? (
          <div className="mt-5 rounded-xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm text-red-100" role="alert">
            {error}
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void createMainStage()}
            disabled={creating}
            className="inline-flex min-w-44 items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-white/90 disabled:cursor-wait disabled:opacity-60"
          >
            {creating ? "Creating Main Stage…" : "Create Main Stage"}
          </button>
          <Link
            href={`/admin/events/${eventId}/sessions`}
            className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/75 transition hover:bg-white/10 hover:text-white"
          >
            Configure manually
          </Link>
        </div>

        <p className="mt-5 text-xs leading-5 text-white/40">
          Defaults: Main Stage · LiveKit delivery · visible to all attendees · holding until the producer goes live.
        </p>
      </div>
    </div>
  )
}
