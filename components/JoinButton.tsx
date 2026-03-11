"use client"

import { useState } from "react"

type Props = {
  webinarId: string
  href: string
}

export default function JoinButton({ webinarId, href }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    if (loading) return
    setLoading(true)

    // open window immediately to avoid popup blockers
    const win = window.open("", "_blank", "noopener,noreferrer")

    try {
      // fire-and-forget logging (never block user)
      fetch("/api/click", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ webinarId }),
        keepalive: true,
      }).catch(() => {})
    } catch {}

    // navigate popup to webinar
    if (win) {
      win.location.href = href
    } else {
      // fallback if popup blocked
      window.location.href = href
    }

    // allow button to reset shortly after
    setTimeout(() => setLoading(false), 600)
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      aria-busy={loading}
      className="
        inline-flex items-center justify-center gap-2
        mt-6 rounded-xl bg-indigo-600 hover:bg-indigo-700
        disabled:opacity-60 disabled:cursor-not-allowed
        transition px-5 py-3 font-medium
        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
      "
    >
      {loading ? "Opening…" : "Join / Watch →"}
    </button>
  )
}