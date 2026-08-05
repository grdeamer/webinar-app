"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import AdminDateTimeField from "@/components/admin/AdminDateTimeField"

type EventSettingsRow = {
  id: string
  slug: string
  title: string
  description: string | null
  start_at: string | null
  end_at: string | null
}

export default function EventSettingsForm({
  initial,
}: {
  initial: EventSettingsRow
}) {
  const router = useRouter()
  const [event, setEvent] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function save() {
    const title = event.title.trim()

    setError(null)
    setMessage(null)

    if (!title) {
      setError("Event name is required.")
      return
    }

    setSaving(true)

    try {
      const response = await fetch("/api/admin/events", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...event, title }),
      })
      const payload = await response.json().catch((): null => null)

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to save event settings")
      }

      setEvent((current) => ({ ...current, title }))
      setMessage("Event settings saved.")
      router.refresh()
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save event settings"
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.07),transparent_24%),radial-gradient(circle_at_82%_18%,rgba(168,85,247,0.08),transparent_26%),linear-gradient(180deg,#050816_0%,#040712_42%,#02040a_100%)] px-6 py-6 text-white">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="rounded-[26px] border border-white/[0.08] bg-white/[0.035] p-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-100/50">
            Event Workspace
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em]">
            Event Settings
          </h1>
          <p className="mt-2 text-sm text-white/50">
            Manage the event name, description, and schedule.
          </p>
        </header>

        <section className="rounded-[26px] border border-white/[0.08] bg-white/[0.035] p-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-white/75" htmlFor="event-title">
                Event name
              </label>
              <input
                id="event-title"
                value={event.title}
                onChange={(changeEvent) =>
                  setEvent((current) => ({
                    ...current,
                    title: changeEvent.target.value,
                  }))
                }
                disabled={saving}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-violet-300/40 focus:ring-2 focus:ring-violet-400/15 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-white/75" htmlFor="event-slug">
                Event URL slug
              </label>
              <input
                id="event-slug"
                value={event.slug}
                readOnly
                className="mt-2 w-full cursor-not-allowed rounded-xl border border-white/[0.07] bg-black/15 px-4 py-3 text-white/45 outline-none"
              />
              <p className="mt-2 text-xs text-white/35">
                The URL remains unchanged when the event name is updated.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-white/75" htmlFor="event-description">
                Description
              </label>
              <textarea
                id="event-description"
                value={event.description || ""}
                onChange={(changeEvent) =>
                  setEvent((current) => ({
                    ...current,
                    description: changeEvent.target.value,
                  }))
                }
                disabled={saving}
                className="mt-2 min-h-32 w-full resize-y rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-violet-300/40 focus:ring-2 focus:ring-violet-400/15 disabled:opacity-60"
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <AdminDateTimeField
                label="Event start"
                value={event.start_at}
                onChange={(value) =>
                  setEvent((current) => ({ ...current, start_at: value }))
                }
                disabled={saving}
              />
              <AdminDateTimeField
                label="Event end"
                value={event.end_at}
                onChange={(value) =>
                  setEvent((current) => ({ ...current, end_at: value }))
                }
                disabled={saving}
              />
            </div>

            {error ? (
              <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            {message ? (
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                {message}
              </div>
            ) : null}

            <div className="flex justify-end border-t border-white/[0.07] pt-5">
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(124,58,237,0.22)] transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
