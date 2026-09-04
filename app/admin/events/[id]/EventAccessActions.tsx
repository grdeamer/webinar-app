"use client"

import { useState } from "react"
import { Mail01, UserPlus01, X } from "@untitledui/icons"
import { Button } from "@/components/ui/button"

type EventRole = "event_admin" | "producer" | "viewer"

const roleOptions: Array<{ value: EventRole; label: string; description: string }> = [
  { value: "event_admin", label: "Event Admin", description: "Configure this event and invite collaborators." },
  { value: "producer", label: "Producer", description: "Operate Audience Flow, Run of Show, and Producer Room." },
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

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="event-invite-title"
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#02050c]/82 p-4 backdrop-blur-md sm:p-8"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false)
          }}
        >
          <div className="relative w-full max-w-[720px] overflow-hidden rounded-[26px] border border-slate-300/16 bg-[linear-gradient(145deg,rgba(15,22,36,.98),rgba(5,9,18,.99))] text-left shadow-[0_38px_100px_rgba(0,0,0,.72),0_0_0_1px_rgba(92,129,204,.08),inset_0_1px_0_rgba(255,255,255,.06)]">
            <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-32 h-72 w-72 rounded-full bg-blue-500/12 blur-[80px]" />
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-20 h-64 w-64 rounded-full bg-violet-500/8 blur-[90px]" />

            <div className="relative border-b border-white/[.08] px-6 py-6 sm:px-8 sm:py-7">
              <button
                type="button"
                aria-label="Close invitation"
                onClick={() => setOpen(false)}
                className="absolute right-5 top-5 inline-flex size-9 items-center justify-center rounded-full border border-white/[.08] bg-black/15 text-white/48 transition hover:border-white/20 hover:bg-white/[.07] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="text-[10px] font-semibold uppercase tracking-[.22em] text-sky-200/60">Event access</div>
              <h2 id="event-invite-title" className="mt-2 max-w-[560px] pr-10 text-[26px] font-semibold leading-[1.14] tracking-[-.025em] text-white sm:text-[30px]">
                Invite someone to your event
              </h2>
              <p className="mt-3 max-w-[580px] text-sm leading-6 text-slate-300/62">
                Give a collaborator access to <span className="font-medium text-slate-100">{eventTitle}</span>. You can change or remove their access later.
              </p>
            </div>

            <div className="relative px-6 py-6 sm:px-8 sm:py-7">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="text-[11px] font-semibold uppercase tracking-[.12em] text-slate-300/62">
                  Name <span className="font-normal normal-case tracking-normal text-white/30">Optional</span>
                  <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Full name" className="mt-2.5 h-12 w-full rounded-[13px] border border-slate-300/14 bg-[#050914]/78 px-4 text-[15px] font-medium normal-case tracking-normal text-white shadow-[inset_0_1px_0_rgba(255,255,255,.025)] outline-none transition placeholder:text-white/24 hover:border-slate-300/22 focus:border-blue-400/65 focus:ring-4 focus:ring-blue-500/10" />
                </label>
                <label className="text-[11px] font-semibold uppercase tracking-[.12em] text-slate-300/62">
                  Email
                  <input autoFocus type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" className="mt-2.5 h-12 w-full rounded-[13px] border border-slate-300/14 bg-[#050914]/78 px-4 text-[15px] font-medium normal-case tracking-normal text-white shadow-[inset_0_1px_0_rgba(255,255,255,.025)] outline-none transition placeholder:text-white/24 hover:border-slate-300/22 focus:border-blue-400/65 focus:ring-4 focus:ring-blue-500/10" />
                </label>
              </div>

              <fieldset className="mt-7">
                <legend className="text-[11px] font-semibold uppercase tracking-[.12em] text-slate-300/62">Choose their role</legend>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {roleOptions.map((option) => {
                    const selected = role === option.value
                    return (
                      <label key={option.value} className={`group relative min-h-[142px] cursor-pointer rounded-[16px] border p-4 transition duration-200 ${selected ? "border-blue-400/62 bg-[linear-gradient(145deg,rgba(35,74,145,.34),rgba(40,35,96,.24))] shadow-[inset_0_1px_0_rgba(255,255,255,.07),0_12px_28px_rgba(16,39,96,.18)]" : "border-white/[.09] bg-white/[.018] hover:-translate-y-px hover:border-white/18 hover:bg-white/[.04]"}`}>
                        <input type="radio" name="event-role" value={option.value} checked={selected} onChange={() => setRole(option.value)} className="sr-only" />
                        <span className={`mb-5 flex size-5 items-center justify-center rounded-full border transition ${selected ? "border-blue-300 bg-blue-500 shadow-[0_0_14px_rgba(96,165,250,.35)]" : "border-white/24 bg-black/20 group-hover:border-white/40"}`}>
                          {selected ? <span className="size-1.5 rounded-full bg-white" /> : null}
                        </span>
                        <span className="block text-[15px] font-semibold tracking-[-.01em] text-white">{option.label}</span>
                        <span className="mt-2 block text-xs leading-[1.55] text-slate-300/48">{option.description}</span>
                      </label>
                    )
                  })}
                </div>
              </fieldset>

              {error ? <div className="mt-5 rounded-xl border border-red-300/15 bg-red-400/[.07] px-4 py-3 text-sm text-red-100">{error}</div> : null}
            </div>

            <div className="relative flex flex-col-reverse gap-3 border-t border-white/[.08] bg-black/15 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <p className="text-xs leading-5 text-white/35">An invitation email will be sent immediately.</p>
              <div className="flex gap-2.5">
                <Button type="button" variant="jupiterSecondary" size="lg" onClick={() => setOpen(false)} className="flex-1 sm:flex-none">Cancel</Button>
                <Button type="button" variant="jupiterPrimary" size="lg" disabled={busy || !email.includes("@")} onClick={() => void invite()} className="flex-1 sm:min-w-[164px]"><Mail01 className="h-4 w-4" />{busy ? "Sending…" : "Send invitation"}</Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
