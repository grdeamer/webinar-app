"use client"

import React from "react"

type PanelRow = {
  id: boolean
  kind: "pdf" | "image" | null
  name: string | null
  path: string | null
  updated_at: string | null
}

export default function LowerPanelUploader() {
  const [panel, setPanel] = React.useState<PanelRow | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const fileRef = React.useRef<HTMLInputElement | null>(null)

  async function refresh() {
    const res = await fetch("/api/admin/general-session/lower-panel", { cache: "no-store" })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(j?.error || "Failed to load lower panel")
    setPanel(j?.panel || null)
  }

  React.useEffect(() => {
    refresh().catch((e) => setError(e?.message || "Failed to load lower panel"))
  }, [])

  async function upload(file: File) {
    setBusy(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/admin/general-session/lower-panel/upload", { method: "POST", body: fd })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || "Upload failed")
      setPanel(j?.panel || null)
    } catch (e: any) {
      setError(e?.message || "Upload failed")
    } finally {
      setBusy(false)
    }
  }

  async function clear() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/general-session/lower-panel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: null, name: null, path: null }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || "Clear failed")
      setPanel(j?.panel || null)
    } catch (e: any) {
      setError(e?.message || "Clear failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Under-Player Panel</h2>
          <p className="mt-1 text-xs text-white/60">
            Shows a PDF or image under the player on <span className="font-semibold">/general-session</span>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm hover:bg-white/15 disabled:opacity-60"
          >
            Upload PDF/Image
          </button>
          <button
            type="button"
            onClick={clear}
            disabled={busy}
            className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-60"
          >
            Clear
          </button>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        className="hidden"
        accept="application/pdf,image/png,image/jpeg,image/webp"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (!f) return
          upload(f)
          e.currentTarget.value = ""
        }}
      />

      {error ? (
        <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 p-3">
        <div className="text-xs text-white/60">Current</div>
        {panel?.path ? (
          <div className="mt-1 text-sm">
            <div className="font-semibold">{panel.name || "Untitled"}</div>
            <div className="text-xs text-white/50">{panel.kind}</div>
          </div>
        ) : (
          <div className="mt-1 text-sm text-white/50">None</div>
        )}
      </div>
    </section>
  )
}
