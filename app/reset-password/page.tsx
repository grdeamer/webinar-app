"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()

  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [message, setMessage] = React.useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setMessage(null)

    const pw = password.trim()
    const confirm = confirmPassword.trim()

    if (!pw) {
      setError("Enter a new password.")
      return
    }

    if (pw.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }

    if (pw !== confirm) {
      setError("Passwords do not match.")
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({
      password: pw,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setMessage("Password updated successfully. Redirecting to login...")

    setTimeout(() => {
      router.push("/login")
      router.refresh()
    }, 1200)
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-2xl font-bold">Reset Password</h1>
        <p className="mt-2 text-sm text-white/60">
          Enter your new password below.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              New password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-white/10 border border-white/15 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/80 focus:border-indigo-500/40 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Confirm new password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-white/10 border border-white/15 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/80 focus:border-indigo-500/40 transition"
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          {message ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              {message}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition px-5 py-3 font-medium shadow-lg shadow-indigo-600/20"
          >
            {loading ? "Updating..." : "Update password"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <Link href="/login" className="text-indigo-300 hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    </main>
  )
}