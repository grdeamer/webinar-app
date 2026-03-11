"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

export default function AdminLogoutButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function logout() {
    setBusy(true)
    try {
      await fetch("/api/admin/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
    } finally {
      router.push("/admin/login")
      router.refresh()
    }
  }

  return (
    <button
      onClick={logout}
      disabled={busy}
      className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-60"
    >
      {busy ? "Logging out..." : "Logout"}
    </button>
  )
}