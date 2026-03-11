"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

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

      router.push("/lobby")
      router.refresh()
    } catch (err: any) {
      setError("Network error. Try again.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-lg rounded-3xl bg-white/5 border border-white/10 p-8 shadow-2xl shadow-black/30">
        <h1 className="text-3xl font-bold tracking-tight">Access Webinars</h1>
        <p className="text-white/70 mt-2">
          Enter your email to view your assigned webinars.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label className="block text-sm text-white/70 mb-2">Email</label>
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
            {loading ? "Loading..." : "Continue →"}
          </button>
        </form>
      </div>
    </div>
  )
}
