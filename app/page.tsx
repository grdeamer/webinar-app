"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function HomePage() {
  const router = useRouter()
  const [email, setEmail] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const value = email.trim().toLowerCase()
    if (!value || !value.includes("@")) {
      setError("Please enter a valid email.")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Unable to continue")
      router.push("/lobby")
    } catch (e: any) {
      setError(e?.message || "Unable to continue")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl"
      >
        <h1 className="text-2xl font-bold">Enter your email</h1>
        <p className="mt-2 text-sm text-white/60">
          We’ll take you to your event lobby.
        </p>

        <label className="block mt-5 text-sm font-medium text-white/80">
          Email
        </label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="you@company.com"
          className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 outline-none"
          autoComplete="email"
        />

        {error ? (
          <div className="mt-3 text-sm text-red-300">{error}</div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className={[
            "mt-5 w-full rounded-xl py-2 font-semibold transition",
            loading ? "bg-white/5 text-white/40" : "bg-white text-black hover:opacity-90",
          ].join(" ")}
        >
          {loading ? "Continuing…" : "Continue"}
        </button>
      </form>

      <Link
        href="/admin/login"
        className="fixed bottom-6 right-6 rounded-xl border border-white/10 bg-white/10 hover:bg-white/15 transition px-4 py-2 text-sm"
      >
        Admin
      </Link>
    </main>
  )
}
