"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import AdminDateTimeField from "@/components/admin/AdminDateTimeField"
import { Button } from "@/components/ui/button"
import { Check, ImageUp, RotateCcw, Save } from "lucide-react"

const EVENT_ACCENTS = {
  blue: "79,133,255", violet: "176,105,255", cyan: "60,209,215",
  orange: "239,157,72", emerald: "61,198,151", rose: "244,83,116",
} as const
type EventAccentColor = keyof typeof EVENT_ACCENTS
type EventSettingsRow = { id: string; slug: string; title: string; badge_image_url: string | null; description: string | null; start_at: string | null; end_at: string | null; accent_color: string }

export default function EventSettingsForm({ initial }: { initial: EventSettingsRow }) {
  const router = useRouter()
  const [event, setEvent] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [uploadingBadge, setUploadingBadge] = useState(false)
  const [savingAccent, setSavingAccent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const badgeInput = useRef<HTMLInputElement>(null)

  async function uploadBadge(file: File) {
    setError(null); setMessage(null); setUploadingBadge(true)
    try {
      const form = new FormData()
      form.set("file", file)
      const response = await fetch(`/api/admin/events/${event.id}/badge`, { method: "POST", body: form })
      const payload = await response.json().catch((): null => null)
      if (!response.ok) throw new Error(payload?.error || "Failed to upload event badge")
      setEvent((current) => ({ ...current, badge_image_url: payload.badgeImageUrl }))
      setMessage("Event badge updated.")
      window.dispatchEvent(new Event("jupiter:event-context-updated"))
      router.refresh()
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Failed to upload event badge")
    } finally {
      setUploadingBadge(false)
      if (badgeInput.current) badgeInput.current.value = ""
    }
  }

  async function restoreDefaultBadge() {
    setError(null); setMessage(null); setUploadingBadge(true)
    try {
      const response = await fetch(`/api/admin/events/${event.id}/badge`, { method: "DELETE" })
      const payload = await response.json().catch((): null => null)
      if (!response.ok) throw new Error(payload?.error || "Failed to restore the Jupiter badge")
      setEvent((current) => ({ ...current, badge_image_url: null }))
      setMessage("Jupiter default restored.")
      window.dispatchEvent(new Event("jupiter:event-context-updated"))
      router.refresh()
    } catch (restoreError) {
      setError(restoreError instanceof Error ? restoreError.message : "Failed to restore the Jupiter badge")
    } finally { setUploadingBadge(false) }
  }

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

  async function setAccent(accent_color: EventAccentColor) {
    const previous = event.accent_color
    setEvent((current) => ({ ...current, accent_color })); setSavingAccent(true); setError(null); setMessage(null)
    try {
      const response = await fetch(`/api/admin/events/${event.id}/accent`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accent_color }) })
      const payload = await response.json().catch((): null => null)
      if (!response.ok) throw new Error(payload?.error || "Could not save event color")
      setMessage("Event production color updated.")
      window.dispatchEvent(new Event("jupiter:event-context-updated"))
      router.refresh()
    } catch (accentError) {
      setEvent((current) => ({ ...current, accent_color: previous }))
      setError(accentError instanceof Error ? accentError.message : "Could not save event color")
    } finally { setSavingAccent(false) }
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
            <div className="editorial-rule mt-8 border-t pt-6">
              <div className="editorial-eyebrow !text-[#8d9ab4]">Event badge</div>
              <div className="mt-4 flex items-center gap-5">
                {event.badge_image_url ? <img src={event.badge_image_url} alt="Current event badge" className="h-20 w-20 rounded-2xl border border-white/15 object-cover shadow-[0_14px_36px_rgba(0,0,0,.35)]" /> : <div role="img" aria-label="Default Jupiter event badge" className="h-20 w-20 rounded-2xl border border-white/15 bg-[url('/jupiter-surface-horizon-v1.png')] bg-[position:54%_46%] bg-[size:260%_auto] shadow-[0_14px_36px_rgba(0,0,0,.35)]" />}
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[#e7ecf8]">{event.badge_image_url ? "Custom event artwork" : "Jupiter default"}</div>
                  <p className="mt-1 max-w-sm text-xs leading-5 text-[#75829c]">Square PNG, JPG, or WebP up to 2 MB. A 512 × 512 image will stay crisp in the workspace.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <input ref={badgeInput} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadBadge(file) }} />
                    <Button type="button" variant="jupiterSecondary" size="sm" disabled={uploadingBadge} onClick={() => badgeInput.current?.click()}><ImageUp aria-hidden="true" />{uploadingBadge ? "Uploading…" : "Upload badge"}</Button>
                    {event.badge_image_url ? <Button type="button" variant="ghost" size="sm" disabled={uploadingBadge} onClick={() => void restoreDefaultBadge()}><RotateCcw aria-hidden="true" />Use Jupiter default</Button> : null}
                  </div>
                </div>
              </div>
            </div>
            <div className="editorial-rule mt-8 border-t pt-6">
              <div className="editorial-eyebrow !text-[#8d9ab4]">Production atmosphere</div>
              <p className="mt-3 max-w-lg text-sm leading-6 text-[#8793ab]">Choose the event color used for Producer Room ambience and branded holding surfaces. Preview, Program, healthy, and warning safety colors remain fixed.</p>
              <div className="mt-4 flex flex-wrap gap-3" aria-label="Event production color">
                {(Object.entries(EVENT_ACCENTS) as [EventAccentColor, string][]).map(([color, rgb]) => {
                  const selected = event.accent_color === color
                  return <button key={color} type="button" disabled={savingAccent} onClick={() => void setAccent(color)} aria-pressed={selected} aria-label={`${color} event color`} className={`group flex h-12 w-12 items-center justify-center rounded-2xl border transition ${selected ? "border-white/60 bg-white/10 shadow-[0_0_26px_rgba(var(--swatch),.35)]" : "border-white/10 bg-white/[.03] hover:border-white/30"}`} style={{ "--swatch": rgb } as React.CSSProperties}><span className="h-6 w-6 rounded-full shadow-[0_0_18px_rgba(var(--swatch),.55)]" style={{ backgroundColor: `rgb(${rgb})` }} /></button>
                })}
              </div>
            </div>
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
            <Button type="button" variant="jupiterPrimary" size="lg" onClick={save} disabled={saving} className="min-w-56">
              {message ? <Check aria-hidden="true" /> : <Save aria-hidden="true" />}{saving ? "Saving…" : message ? "Event details saved" : "Save event details"}
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="mt-7 block"><span className="editorial-eyebrow !text-[#8d9ab4]">{label}</span><div className="mt-2">{children}</div></label>
}
