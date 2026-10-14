"use client"
import { useState } from "react"
export default function VerifyEmailPage() {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [complete, setComplete] = useState(false)
  async function verify() {
    setBusy(true); setMessage("")
    try {
      const token = window.location.hash.slice(1)
      const response = await fetch("/api/events/verify-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Unable to verify email")
      window.history.replaceState(null, "", window.location.pathname)
      if (result.redirect) { window.location.assign(result.redirect); return }
      setComplete(true)
      setMessage(result.status === "waitlisted" ? "You’re on the waitlist. A seat is not confirmed yet." : "Your registration is awaiting organizer approval.")
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to verify email") }
    finally { setBusy(false) }
  }
  return <main className="min-h-screen bg-[#050b18] px-6 py-24 text-white"><section className="mx-auto max-w-lg rounded-3xl border border-white/10 bg-white/5 p-9"><div className="mb-6 text-sm tracking-widest text-cyan-200">JUPITER · SECURE ACCESS</div><h1 className="text-3xl font-semibold">{complete ? "Registration received" : "Verify your email"}</h1><p className="mt-4 text-slate-300">{complete ? "We’ll email you when your registration status changes." : "Continue to confirm your email and open your Jupiter experience."}</p>{!complete && <button disabled={busy} onClick={verify} className="mt-8 rounded-xl bg-blue-600 px-6 py-3 font-semibold disabled:opacity-50">{busy ? "Verifying…" : "Verify and continue"}</button>}{message && <p role="status" className="mt-6 text-slate-200">{message}</p>}</section></main>
}
