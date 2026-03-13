"use client"

import { useEffect, useState } from "react"

type ThemeRow = {
  id?: string
  event_id: string
  page_key: "event_landing" | "sessions_landing"
  bg_color: string | null
  text_color: string | null
  accent_color: string | null
  brand_logo_url: string | null
  brand_logo_position: "left" | "center" | "right" | null
  background_image_url: string | null
  overlay_opacity: number | null
}

type Props = {
  eventId: string
}

type ThemeApiResponse = {
  themes?: ThemeRow[]
  theme?: ThemeRow
  error?: string
} | null

const pageOptions = [
  { value: "event_landing", label: "Event Landing Page" },
  { value: "sessions_landing", label: "Sessions Landing Page" },
] as const

export default function AdminEventThemePanel({ eventId }: Props) {
  const [pageKey, setPageKey] = useState<"event_landing" | "sessions_landing">("sessions_landing")
  const [themes, setThemes] = useState<ThemeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const current: ThemeRow =
    themes.find((t) => t.page_key === pageKey) ?? {
      event_id: eventId,
      page_key: pageKey,
      bg_color: "#020617",
      text_color: "#ffffff",
      accent_color: "#4f46e5",
      brand_logo_url: "",
      brand_logo_position: "left",
      background_image_url: "",
      overlay_opacity: 45,
    }

  async function readJsonSafe(res: Response): Promise<ThemeApiResponse> {
    try {
      return (await res.json()) as ThemeApiResponse
    } catch {
      return null
    }
  }

  async function loadThemes() {
    setLoading(true)
    setMessage(null)

    const res = await fetch(`/api/admin/events/${eventId}/theme`, {
      cache: "no-store",
    })

    const data = await readJsonSafe(res)

    if (!res.ok) {
      setMessage(data?.error || "Failed to load themes")
      setLoading(false)
      return
    }

    setThemes(data?.themes || [])
    setLoading(false)
  }

  useEffect(() => {
    void loadThemes()
  }, [eventId])

  function updateField<K extends keyof ThemeRow>(key: K, value: ThemeRow[K]) {
    setThemes((prev) => {
      const exists = prev.some((t) => t.page_key === pageKey)

      if (!exists) {
        return [
          ...prev,
          {
            event_id: eventId,
            page_key: pageKey,
            bg_color: "#020617",
            text_color: "#ffffff",
            accent_color: "#4f46e5",
            brand_logo_url: "",
            brand_logo_position: "left",
            background_image_url: "",
            overlay_opacity: 45,
            [key]: value,
          } as ThemeRow,
        ]
      }

      return prev.map((t) => (t.page_key === pageKey ? { ...t, [key]: value } : t))
    })
  }

  async function saveTheme() {
    setSaving(true)
    setMessage(null)

    const res = await fetch(`/api/admin/events/${eventId}/theme`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(current),
    })

    const data = await readJsonSafe(res)

    if (!res.ok) {
      setMessage(data?.error || "Failed to save theme")
      setSaving(false)
      return
    }

    setMessage("Theme saved")
    setSaving(false)
    await loadThemes()
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Event Theme</h2>
          <p className="mt-1 text-sm text-white/60">
            Control branding for event and sessions landing pages.
          </p>
        </div>

        <select
          value={pageKey}
          onChange={(e) => setPageKey(e.target.value as "event_landing" | "sessions_landing")}
          className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm"
        >
          {pageOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="mt-6 text-sm text-white/60">Loading theme…</div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="block">
            <div className="mb-2 text-sm text-white/70">Background Color</div>
            <input
              value={current.bg_color ?? ""}
              onChange={(e) => updateField("bg_color", e.target.value)}
              placeholder="#020617"
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm"
            />
          </label>

          <label className="block">
            <div className="mb-2 text-sm text-white/70">Text Color</div>
            <input
              value={current.text_color ?? ""}
              onChange={(e) => updateField("text_color", e.target.value)}
              placeholder="#ffffff"
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm"
            />
          </label>

          <label className="block">
            <div className="mb-2 text-sm text-white/70">Accent Color</div>
            <input
              value={current.accent_color ?? ""}
              onChange={(e) => updateField("accent_color", e.target.value)}
              placeholder="#4f46e5"
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm"
            />
          </label>

          <label className="block">
            <div className="mb-2 text-sm text-white/70">Logo Position</div>
            <select
              value={current.brand_logo_position ?? "left"}
              onChange={(e) =>
                updateField("brand_logo_position", e.target.value as "left" | "center" | "right")
              }
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm"
            >
              <option value="left">Upper Left</option>
              <option value="center">Centered</option>
              <option value="right">Upper Right</option>
            </select>
          </label>

          <label className="block md:col-span-2">
            <div className="mb-2 text-sm text-white/70">Brand Logo URL</div>
            <input
              value={current.brand_logo_url ?? ""}
              onChange={(e) => updateField("brand_logo_url", e.target.value)}
              placeholder="https://..."
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm"
            />
          </label>

          <label className="block md:col-span-2">
            <div className="mb-2 text-sm text-white/70">Background Image URL</div>
            <input
              value={current.background_image_url ?? ""}
              onChange={(e) => updateField("background_image_url", e.target.value)}
              placeholder="https://..."
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm"
            />
          </label>

          <label className="block md:col-span-2">
            <div className="mb-2 text-sm text-white/70">Overlay Opacity (0-100)</div>
            <input
              type="number"
              min={0}
              max={100}
              value={current.overlay_opacity ?? 45}
              onChange={(e) => updateField("overlay_opacity", Number(e.target.value))}
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm"
            />
          </label>
        </div>
      )}

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={saveTheme}
          disabled={saving || loading}
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Theme"}
        </button>

        {message ? <div className="text-sm text-white/70">{message}</div> : null}
      </div>
    </div>
  )
}