"use client"

import { useState } from "react"

type PresenterSession = {
  id: string
  title: string
}

type PresenterControlsProps = {
  eventId: string
  eventSlug: string
  userId: string | null
  initialIsPresenter?: boolean
  initialSessionId?: string | null
  sessions?: PresenterSession[]
  disabled?: boolean
  onSendLink?: (userId: string | null) => void
}

export default function PresenterControls({
  eventId,
  eventSlug,
  userId,
  initialIsPresenter = false,
  initialSessionId = null,
  sessions = [],
  disabled = false,
  onSendLink,
}: PresenterControlsProps) {
  const [isPresenter, setIsPresenter] = useState(initialIsPresenter)
  const [selectedSession, setSelectedSession] = useState<string>(initialSessionId ?? "")
  const [sendStatus, setSendStatus] = useState<"idle" | "sending" | "sent" | "error">("idle")
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle")
  const [sendMessage, setSendMessage] = useState<string | null>(null)

  const handleToggle = async () => {
    if (disabled || !userId) return
    setSendMessage(null)

    const next = !isPresenter
    setIsPresenter(next)

    try {
      await fetch(`/api/admin/events/${eventId}/presenters/toggle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          isPresenter: next,
        }),
      })
    } catch (err) {
      console.error("toggle failed", err)
      setIsPresenter(!next) // revert on failure
    }
  }

  const handleSend = async () => {
    if (disabled || !userId) return

    setSendStatus("sending")
    setSendMessage(null)

    try {
      const response = await fetch(`/api/admin/events/${eventId}/emails/send-presenter-links`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
        }),
      })

      const json = await response.json().catch((): null => null)

      if (!response.ok) {
        throw new Error(json?.error || "Failed to send presenter link")
      }

      setSendStatus("sent")
      setSendMessage("Sent")
      console.log("presenter link sent", { userId, result: json })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Send failed"
      setSendStatus("error")
      setSendMessage(message)
      console.error("send presenter link failed", err)
    }
  }

  const handleCopy = async () => {
    if (!selectedSession) return
    setSendMessage(null)

    const url = `${window.location.origin}/presenter/${eventSlug}/sessions/${selectedSession}`

    try {
      await navigator.clipboard.writeText(url)
      setCopyStatus("copied")
      setSendMessage("Presenter link copied")
    } catch (err) {
      setCopyStatus("error")
      setSendMessage("Copy failed")
      console.error("copy presenter link failed", err)
    }
  }

  return (
    <div className="flex items-center gap-2 justify-end">
      <button
        onClick={handleToggle}
        disabled={disabled}
        className={[
          "rounded-full px-3 py-1 text-xs transition",
          disabled
            ? "opacity-40 cursor-not-allowed border border-white/10"
            : isPresenter
            ? "bg-emerald-400/15 text-emerald-200 border border-emerald-300/20"
            : "border border-white/10 text-white/60 hover:bg-white/10",
        ].join(" ")}
      >
        {isPresenter ? "Presenter ✓" : "+ Presenter"}
      </button>

      <select
        value={selectedSession}
        onChange={async (e) => {
          const next = e.target.value
          setSelectedSession(next)
          setCopyStatus("idle")
          setSendMessage(null)

          if (!userId) return

          try {
            await fetch(`/api/admin/events/${eventId}/presenters/session`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                userId,
                sessionId: next || null,
              }),
            })
          } catch (err) {
            console.error("session assign failed", err)
          }
        }}
        disabled={disabled || sessions.length === 0}
        className="rounded-md border border-white/10 bg-black/10 px-2 py-1 text-xs text-white/50 disabled:opacity-40"
      >
        <option value="">Session</option>
        {sessions.map((session) => (
          <option key={session.id} value={session.id}>
            {session.title}
          </option>
        ))}
      </select>

      <button
        onClick={handleCopy}
        disabled={!selectedSession || disabled}
        className={[
          "rounded-md border px-2.5 py-1 text-xs font-medium transition",
          !selectedSession || disabled
            ? "border-white/10 text-white/30 cursor-not-allowed"
            : copyStatus === "copied"
              ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-200"
              : copyStatus === "error"
                ? "border-red-300/20 bg-red-400/10 text-red-200"
                : "border-white/10 text-white/65 hover:bg-white/10 hover:text-white",
        ].join(" ")}
        title={sendMessage ?? undefined}
      >
        {copyStatus === "copied" ? "Copied ✓" : copyStatus === "error" ? "Error" : "Copy Link"}
      </button>

      <button
        onClick={handleSend}
        disabled={!isPresenter || !selectedSession || disabled || sendStatus === "sending"}
        className={[
          "rounded-md px-2.5 py-1 text-xs font-medium transition",
          !isPresenter || !selectedSession || disabled
            ? "bg-white/5 text-white/30 cursor-not-allowed"
            : sendStatus === "sent"
              ? "bg-emerald-400/15 text-emerald-200"
              : sendStatus === "error"
                ? "bg-red-400/15 text-red-200"
                : "bg-violet-500/15 text-violet-200 hover:bg-violet-500/25",
        ].join(" ")}
        title={sendMessage ?? undefined}
      >
        {sendStatus === "sending"
          ? "Sending…"
          : sendStatus === "sent"
            ? "Sent ✓"
            : sendStatus === "error"
              ? "Error"
              : "Send Link"}
      </button>
      {sendMessage && (
        <span className="ml-2 text-xs text-white/60">
          {sendMessage}
        </span>
      )}
    </div>
  )
}
