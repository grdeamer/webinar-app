"use client"
import { useEffect, useId, useState, type FormEvent } from "react"
import { normalizeRegistrationConfig, validateRegistration, type RegistrationConfig } from "@/lib/registration/schema"
type Session = { id: string; title: string; starts_at?: string | null }
type Props = { slug?: string; preview?: boolean; config?: RegistrationConfig; sessions?: Session[]; previewState?: string }
const INPUT = "mt-1 w-full rounded-xl border border-white/20 bg-black/25 px-3 py-3 text-white outline-none focus:border-sky-300"
const BUTTON = "rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
export default function RegistrationForm({ slug, preview = false, config: initialConfig, sessions: initialSessions = [], previewState }: Props) {
  const id = useId()
  const [loading, setLoading] = useState(!preview)
  const [liveConfig, setConfig] = useState(() => normalizeRegistrationConfig({}, false))
  const config = preview ? initialConfig ?? normalizeRegistrationConfig({}, false) : liveConfig
  const [liveSessions, setSessions] = useState(initialSessions)
  const sessions = preview ? initialSessions : liveSessions
  const [values, setValues] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<string[]>([])
  const [step, setStep] = useState(0), [busy, setBusy] = useState(false), [error, setError] = useState("")
  const [challengeId, setChallengeId] = useState<string | null>(null), [code, setCode] = useState("")
  const [result, setResult] = useState<{ status: string; redirect?: string | null; existing?: boolean; confirmationSent?: boolean } | null>(null)
  useEffect(() => {
    if (preview || !slug) return
    let cancelled = false
    setLoading(true)
    fetch(`/api/events/${encodeURIComponent(slug)}/registration`).then(async (r) => { const data = await r.json(); if (!r.ok) throw new Error(data.error); if (!cancelled) { setConfig(data.config); setSessions(data.sessions ?? []) } }).catch(() => { if (!cancelled) setError("Unable to load registration. Please refresh.") }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [slug, preview])
  const displayedStep = preview && previewState === "success" ? 4 : preview && previewState === "registered" ? 4 : step
  const closed = !config.enabled || config.mode === "closed" || (preview && previewState === "closed")
  async function submit(e: FormEvent) {
    e.preventDefault(); setError("")
    try {
      if (step === 0) { validateRegistration(config, { values, sessionIds: selected }); setStep(1); return }
      if (step === 1) { setStep(2); return }
      if (preview) { if (step === 2) setStep(3); else { setResult({ status: config.mode === "approval_required" ? "pending_approval" : previewState === "waitlist" ? "waitlisted" : "registered" }); setStep(4) }; return }
      setBusy(true)
      const response = await fetch(`/api/events/${encodeURIComponent(slug ?? "")}/registration`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(challengeId ? { challengeId, code } : { values, sessionIds: selected }) })
      const data = await response.json()
      if (!response.ok) { if (challengeId) { setChallengeId(null); setStep(2); setCode("") }; throw new Error(data.error || "Registration failed") }
      if (data.verificationRequired) { setChallengeId(data.challengeId); setStep(3) }
      else { setResult(data); setStep(4) }
    } catch (err) { setError(err instanceof Error ? err.message : "Registration failed") } finally { setBusy(false) }
  }
  if (!preview && loading) return <section id="registration" aria-busy="true" className="rounded-3xl border border-white/15 bg-slate-950/80 p-6 text-white"><p role="status">Loading registration…</p></section>
  if (!preview && error && !liveConfig.enabled) return <section id="registration" className="rounded-3xl border border-white/15 bg-slate-950/80 p-6 text-white"><p role="alert">{error}</p></section>
  const active = result && ["registered", "approved", "checked_in"].includes(result.status)
  return <section id="registration" className={config.variant === "minimal" ? "rounded-xl border border-white/15 bg-slate-950/80 p-4 text-white" : "rounded-3xl border border-white/15 bg-slate-950/80 p-6 text-white"}>
    {preview ? <p className="mb-4 text-xs text-sky-200">Preview only · no attendee is created and no email is sent</p> : null}
    <h2 className="text-2xl font-semibold">{config.title}</h2><p className="mt-2 text-sm text-white/70">{config.body}</p>
    {closed ? <p role="status" className="mt-5">Registration is currently closed. Contact the organizer for help.</p> : displayedStep === 4 ? <div role="status" className="mt-6 space-y-3">
      <h3 className="text-xl">{result?.status === "pending_approval" ? "Awaiting organizer approval" : result?.status === "waitlisted" ? "You’re on the waitlist" : result?.status === "cancelled" || result?.status === "declined" ? "Contact the organizer" : config.confirmationTitle}</h3>
      <p>{result?.status === "pending_approval" ? "Your registration is saved. Event access will be available after approval." : result?.status === "waitlisted" ? "Your request is saved. A seat has not been confirmed yet." : config.confirmationBody}</p>
      {result?.confirmationSent === false ? <p>Your registration is saved, but the confirmation email could not be sent. You can still use the event access form.</p> : null}
      {result?.existing ? <p>You already have a registration. Your existing choices have been preserved.</p> : null}
      {active && result.redirect ? <a className={BUTTON + " inline-block"} href={result.redirect}>Enter your event</a> : null}
    </div> : <form onSubmit={submit} className="mt-6 space-y-5">
      <ol aria-label="Registration steps" className="flex flex-wrap gap-3 text-xs text-white/60">{["Your details", "Sessions", "Review", "Verify email"].map((label, i) => <li key={label} aria-current={displayedStep === i ? "step" : undefined} className={displayedStep === i ? "font-bold text-sky-200" : ""}>{i + 1}. {label}</li>)}</ol>
      {displayedStep === 0 ? <div className="grid gap-4 sm:grid-cols-2">{config.fields.filter((f) => f.visible).map((f) => <label key={f.id} htmlFor={`${id}-${f.id}`} className={f.width === "full" ? "sm:col-span-2" : ""}>{f.label}{f.required ? " *" : ""}{f.fieldType === "textarea" ? <textarea id={`${id}-${f.id}`} required={f.required} maxLength={2000} value={values[f.id] ?? ""} onChange={(e) => setValues({ ...values, [f.id]: e.target.value })} className={INPUT} /> : <input id={`${id}-${f.id}`} type={f.fieldType === "email" ? "email" : f.fieldType === "tel" ? "tel" : "text"} required={f.required} placeholder={f.placeholder} maxLength={320} autoComplete={f.id === "email" ? "email" : f.id === "firstName" ? "given-name" : f.id === "lastName" ? "family-name" : undefined} value={values[f.id] ?? ""} onChange={(e) => setValues({ ...values, [f.id]: e.target.value })} className={INPUT} />}</label>)}</div> : null}
      {displayedStep === 1 ? <fieldset><legend className="mb-3 font-semibold">Choose your sessions</legend>{sessions.length ? sessions.map((s) => <label key={s.id} className="mb-3 flex items-center gap-3 rounded-xl border border-white/15 p-3"><input type="checkbox" checked={selected.includes(s.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, s.id] : selected.filter((v) => v !== s.id))} />{s.title}</label>) : <p>No session selection is required for this event.</p>}</fieldset> : null}
      {displayedStep === 2 ? <div><h3 className="font-semibold">Review your registration</h3><dl className="mt-3 space-y-2">{config.fields.filter((f) => f.visible).map((f) => <div key={f.id}><dt className="text-sm text-white/60">{f.label}</dt><dd className="whitespace-pre-wrap">{values[f.id] || "—"}</dd></div>)}</dl><p className="mt-3">Sessions: {sessions.filter((s) => selected.includes(s.id)).map((s) => s.title).join(", ") || "None selected"}</p><p className="mt-3 text-sm text-white/60">We’ll email you a secure button to verify your address before saving your registration. A six-digit code is included as a fallback.</p></div> : null}
      {displayedStep === 3 ? <label className="block">{preview ? "Preview verification code (any six digits)" : `Click “Verify and continue” in the email sent to ${values.email}, or enter its six-digit code below`}<input aria-label="Verification code" inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6}" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} className={INPUT} /></label> : null}
      {error ? <p role="alert" className="text-red-200">{error}</p> : null}
      <div className="flex flex-wrap gap-3">{step > 0 ? <button type="button" disabled={busy} onClick={() => { setStep(step === 3 ? 2 : step - 1); setChallengeId(null); setCode(""); setError("") }} className="rounded-xl border border-white/20 px-4 py-3">Back</button> : null}<button type="submit" disabled={busy} className={BUTTON}>{busy ? "Please wait…" : step === 3 ? "Verify and register" : step === 2 ? config.ctaLabel || "Email me a secure link" : step === 0 ? "Continue" : "Review registration"}</button></div>
    </form>}
    {closed && error ? <p role="alert" className="mt-3 text-red-200">{error}</p> : null}
  </section>
}
