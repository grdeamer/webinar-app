"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import AdminDateTimeField from "@/components/admin/AdminDateTimeField"

type EventSettingsRow = { id: string; slug: string; title: string; description: string | null; start_at: string | null; end_at: string | null }

export default function EventSettingsForm({ initial }: { initial: EventSettingsRow }) {
  const router = useRouter()
  const [event, setEvent] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function save() {
    const title = event.title.trim()
    setError(null); setMessage(null)
    if (!title) return setError("Event name is required.")
    setSaving(true)
    try {
      const response = await fetch("/api/admin/events", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...event, title }) })
      const payload = await response.json().catch((): null => null)
      if (!response.ok) throw new Error(payload?.error || "Failed to save event details")
      setEvent((current) => ({ ...current, title }))
      setMessage("Event details saved.")
      window.dispatchEvent(new Event("jupiter:event-context-updated"))
      router.refresh()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save event details")
    } finally { setSaving(false) }
  }

  return (
    <main className="event-editorial-page">
      <div className="mx-auto max-w-[1180px]">
        <header>
          <div className="editorial-eyebrow">Event &nbsp;/&nbsp; Details</div>
          <h1 className="mt-7 text-5xl font-medium tracking-[-.045em]">Shape the event.</h1>
          <p className="mt-4 text-lg text-[#98a4bd]">Set the identity and timing that every attendee-facing experience inherits.</p>
        </header>
        <div className="editorial-rule mt-8 border-t" />

        <section className="grid gap-14 py-10 lg:grid-cols-2">
          <div>
            <div className="editorial-eyebrow !text-[#8d9ab4]">Identity</div>
            <h2 className="mt-4 text-2xl font-medium">Name and description</h2>
            <Field label="Event name"><input id="event-title" value={event.title} disabled={saving} onChange={(e) => setEvent((c) => ({ ...c, title: e.target.value }))} className="w-full border-0 border-b border-[#34415c] bg-transparent px-0 py-3 text-lg outline-none focus:border-[#41c8f5]" /></Field>
            <Field label="Description"><textarea id="event-description" value={event.description || ""} disabled={saving} onChange={(e) => setEvent((c) => ({ ...c, description: e.target.value }))} className="min-h-24 w-full resize-y border-0 border-b border-[#34415c] bg-transparent px-0 py-3 leading-6 outline-none focus:border-[#41c8f5]" /></Field>
            <div className="editorial-rule mt-8 border-t pt-6"><div className="editorial-eyebrow !text-[#8d9ab4]">Permanent event URL</div><div className="mt-4 text-[#aeb9d0]">jupiter.events/events/{event.slug}</div><p className="mt-2 text-xs text-[#6e7b95]">Stable after creation so existing invitations never break.</p></div>
          </div>

          <div>
            <div className="editorial-eyebrow !text-[#8d9ab4]">Schedule</div>
            <h2 className="mt-4 text-2xl font-medium">Date and time</h2>
            <div className="mt-7 space-y-7">
              <AdminDateTimeField label="Event start" value={event.start_at} disabled={saving} onChange={(value) => setEvent((current) => ({ ...current, start_at: value, end_at: value }))} />
              <AdminDateTimeField label="Event end" value={event.end_at} disabled={saving} onChange={(value) => setEvent((current) => ({ ...current, end_at: value }))} />
            </div>
            <p className="mt-4 text-xs uppercase tracking-[.13em] text-emerald-300/75">End follows start until you change it</p>
            <div className="mt-10"><div className="editorial-eyebrow !text-[#8d9ab4]">Timezone</div><div className="mt-3 border-b border-[#34415c] py-3 text-[#b7c0d3]">Eastern Time (US &amp; Canada)</div></div>
          </div>
        </section>

        <div className="editorial-rule border-t pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-[#7b88a2]">{error || message || "No unsaved changes"}</div>
            <button type="button" onClick={save} disabled={saving} className="min-h-12 min-w-56 rounded-full bg-[linear-gradient(90deg,#1b75ff,#7444ef)] px-7 text-sm font-semibold disabled:opacity-50">{saving ? "Saving…" : "Save event details"}</button>
          </div>
        </div>
      </div>
    </main>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="mt-7 block"><span className="editorial-eyebrow !text-[#8d9ab4]">{label}</span><div className="mt-2">{children}</div></label>
}
