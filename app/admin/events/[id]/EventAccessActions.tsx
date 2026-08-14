"use client"

import { useState } from "react"
import { Mail01, UserPlus01, X } from "@untitledui/icons"

type EventRole = "event_admin" | "producer" | "viewer"

const roleOptions: Array<{ value: EventRole; label: string; description: string }> = [
  { value: "event_admin", label: "Event Admin", description: "Configure this event and invite collaborators." },
  { value: "producer", label: "Producer", description: "Operate Run Event, Run of Show, and Producer Room." },
  { value: "viewer", label: "Viewer", description: "View the event overview and analytics without making changes." },
]

export default function EventAccessActions({ eventId, eventTitle }: { eventId: string; eventTitle: string }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [role, setRole] = useState<EventRole>("producer")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function invite() {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/events/${eventId}/team/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, role }),
      })
      const payload = await response.json().catch((): null => null)
      if (!response.ok) throw new Error(payload?.error || "Could not send the event invitation.")
      const roleLabel = roleOptions.find((option) => option.value === role)?.label ?? "event member"
      setNotice(`${email} was invited as ${roleLabel}.`)
      setOpen(false)
      setEmail("")
      setName("")
      setRole("producer")
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "Could not send the event invitation.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="mt-5 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <button type="button" onClick={() => { setOpen(true); setError(null); setNotice(null) }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#3c75da]/65 bg-[#0d1a33]/85 px-6 text-sm font-semibold text-white transition hover:border-[#6da0ff] hover:bg-[#122344]">
          <UserPlus01 className="h-4 w-4" />Invite to this event
        </button>
      </div>
      {notice ? <div className="mt-3 text-sm text-emerald-200">{notice}</div> : null}

      {open ? <div role="dialog" aria-modal="true" aria-labelledby="event-invite-title" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-5 backdrop-blur-sm">
        <div className="w-full max-w-xl rounded-[24px] border border-white/12 bg-[#080d19] p-6 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div><div className="text-[10px] font-semibold uppercase tracking-[.2em] text-blue-200/55">Event access</div><h2 id="event-invite-title" className="mt-2 text-2xl font-semibold">Invite to {eventTitle}</h2></div>
            <button type="button" aria-label="Close invitation" onClick={() => setOpen(false)} className="rounded-lg p-2 text-white/45 hover:bg-white/[.06]"><X className="h-4 w-4" /></button>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold text-white/55">Name <span className="font-normal text-white/30">(optional)</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Full name" className="mt-2 w-full rounded-xl border border-white/12 bg-black/25 px-4 py-3 text-sm text-white outline-none focus:border-blue-400/50" /></label>
            <label className="text-xs font-semibold text-white/55">Email<input autoFocus type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" className="mt-2 w-full rounded-xl border border-white/12 bg-black/25 px-4 py-3 text-sm text-white outline-none focus:border-blue-400/50" /></label>
          </div>
          <fieldset className="mt-6"><legend className="text-xs font-semibold text-white/55">Event role</legend><div className="mt-2 space-y-2">{roleOptions.map((option) => <label key={option.value} className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition ${role === option.value ? "border-blue-400/55 bg-blue-500/10" : "border-white/10 hover:bg-white/[.035]"}`}><input type="radio" name="event-role" value={option.value} checked={role === option.value} onChange={() => setRole(option.value)} className="mt-1 accent-blue-500" /><span><span className="block text-sm font-semibold text-white">{option.label}</span><span className="mt-1 block text-xs leading-5 text-white/48">{option.description}</span></span></label>)}</div></fieldset>
          {error ? <div className="mt-4 rounded-xl border border-red-300/15 bg-red-400/[.07] px-4 py-3 text-sm text-red-100">{error}</div> : null}
          <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/[.05]">Cancel</button><button type="button" disabled={busy || !email.includes("@") } onClick={() => void invite()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold hover:bg-blue-500 disabled:opacity-40"><Mail01 className="h-4 w-4" />{busy ? "Sending…" : "Send invitation"}</button></div>
        </div>
      </div> : null}
    </>
  )
}
