"use client"

import React from "react"

export default function EventEmailGate(props: {
  slug: string
  eventTitle?: string | null
}) {
  const { slug, eventTitle } = props
  const [challengeId, setChallengeId] = React.useState<string | null>(null)
  const [code, setCode] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)

    try {
      const res = await fetch("/api/events/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, email, challengeId, code }),
      })

      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || "Login failed")

      if (j.verificationRequired) { setChallengeId(j.challengeId); return }
      window.location.href = j.redirect || `/events/${slug}`
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.14),transparent_25%),linear-gradient(135deg,rgba(15,23,42,0.9),rgba(2,6,23,0.95))] p-6 shadow-2xl shadow-black/25">
      <div className="text-xs uppercase tracking-[0.2em] text-white/45">
        Attendee access
      </div>

      <h2 className="mt-3 text-2xl font-bold">Enter your event email</h2>

      <p className="mt-3 text-sm leading-6 text-white/68">
        {eventTitle ? (
          <>
            Use the email assigned to{" "}
            <span className="font-semibold text-white">{eventTitle}</span>.
          </>
        ) : (
          "Use the email assigned to your event registration."
        )}{" "}
        We will route you to your assigned sessions and only show access that belongs to you.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label="Event email"
          disabled={Boolean(challengeId)}
          placeholder="you@company.com"
          className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder:text-white/35 outline-none focus:border-sky-400/40"
        />

        {challengeId ? <label className="block text-sm">Check your email for a six-digit code<input aria-label="Verification code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value)} className="mt-2 w-full rounded-xl bg-black/30 p-3" /></label> : null}
        {challengeId ? <button type="button" onClick={() => { setChallengeId(null); setCode("") }}>Use another email or request a new code</button> : null}
        {error ? (
          <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-2xl bg-white px-4 py-3 font-semibold text-slate-950 transition hover:bg-slate-100 disabled:opacity-60"
        >
          {busy ? "Please wait..." : challengeId ? "Verify and enter" : "Email me a code"}
        </button>
      </form>

      <div className="mt-5 grid gap-3 text-xs text-white/50 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
          Assigned session access
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
          Personalized event entry
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
          Agenda + materials in one place
        </div>
      </div>
    </section>
  )
}