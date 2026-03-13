"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function AccessPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(data?.error || "Unable to continue")
        setLoading(false)
        return
      }

      router.push("/sessions")
      router.refresh()
    } catch (err) {
      setError("Network error. Try again.")
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center p-6">

      {/* Header */}
      <Link
        href="/"
        className="fixed top-6 left-6 flex items-center gap-2 text-white/70 hover:text-white transition"
      >
        🪐 <span className="font-semibold">Jupiter.events</span>
      </Link>

      {/* Card */}
      <div className="w-full max-w-lg rounded-3xl bg-white/5 border border-white/10 p-8 shadow-2xl shadow-black/30 backdrop-blur">

        <h1 className="text-3xl font-bold tracking-tight">
          Access Your Event
        </h1>

        <p className="text-white/70 mt-2">
          Enter your email to view your assigned sessions.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">

          <div>
            <label className="block text-sm text-white/70 mb-2">
              Email
            </label>

            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              placeholder="you@company.com"
              className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/70 transition"
            />
          </div>

          {error && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          )}

          <button
            disabled={loading}
            className="w-full rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 transition px-5 py-3 font-medium shadow-lg shadow-indigo-600/20"
          >
            {loading ? "Continuing..." : "Continue →"}
          </button>

        </form>

        {/* Back link */}
        <div className="mt-6 text-sm text-white/50">
          <Link href="/" className="hover:text-white transition">
            ← Back to Jupiter.events
          </Link>
        </div>

      </div>

      {/* Admin button */}
      <Link
        href="/admin/login"
        className="fixed bottom-6 right-6 rounded-xl border border-white/10 bg-white/10 hover:bg-white/15 transition px-4 py-2 text-sm"
      >
        Admin
      </Link>

    </main>
  )
}