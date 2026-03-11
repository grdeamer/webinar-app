"use client"

import React from "react"

type ThemeRow = {
  id: number
  bg_color: string | null
  text_color: string | null
  font_family: string | null
  font_weight: string | null
  font_style: string | null
  panel_bg_color: string | null
  panel_text_color: string | null
  panel_font_family: string | null
  header_bg_color: string | null
  header_text_color: string | null
}

const FONT_OPTIONS = [
  { label: "System", value: "System" },
  {
    label: "Inter",
    value:
      "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
  },
  {
    label: "Roboto",
    value:
      "Roboto, ui-sans-serif, system-ui, -apple-system, Segoe UI, Arial, sans-serif",
  },
  {
    label: "Montserrat",
    value:
      "Montserrat, ui-sans-serif, system-ui, -apple-system, Segoe UI, Arial, sans-serif",
  },
  { label: "Georgia", value: "Georgia, ui-serif, serif" },
  { label: "Times", value: '"Times New Roman", Times, serif' },
  { label: "Johnson Display", value: "JohnsonDisplay, sans-serif" },
]

const WEIGHT_OPTIONS = [
  { label: "Normal", value: "normal" },
  { label: "Bold", value: "bold" },
  { label: "Light (300)", value: "300" },
  { label: "Medium (500)", value: "500" },
  { label: "Heavy (700)", value: "700" },
]

const STYLE_OPTIONS = [
  { label: "Normal", value: "normal" },
  { label: "Italic", value: "italic" },
]

export default function ThemePanel() {
  const [theme, setTheme] = React.useState<ThemeRow | null>(null)

  const [bg, setBg] = React.useState("#020617")
  const [fg, setFg] = React.useState("#ffffff")
  const [font, setFont] = React.useState("System")
  const [weight, setWeight] = React.useState<string>("normal")
  const [style, setStyle] = React.useState<string>("normal")

  const [panelBg, setPanelBg] = React.useState("#0f172a")
  const [panelFg, setPanelFg] = React.useState("#ffffff")
  const [panelFont, setPanelFont] = React.useState("System")

  const [headerBg, setHeaderBg] = React.useState("#ffffff")
  const [headerFg, setHeaderFg] = React.useState("#111111")

  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [ok, setOk] = React.useState<string | null>(null)

  async function load() {
    setError(null)

    const res = await fetch("/api/admin/general-session/theme", {
      cache: "no-store",
    })

    const j = await res.json().catch(() => ({}))

    if (!res.ok) {
      throw new Error(j?.error || "Failed to load theme")
    }

    const t = (j?.theme || null) as ThemeRow | null
    setTheme(t)

    setBg(t?.bg_color || "#020617")
    setFg(t?.text_color || "#ffffff")
    setFont(t?.font_family || "System")
    setWeight(t?.font_weight || "normal")
    setStyle(t?.font_style || "normal")

    setPanelBg(t?.panel_bg_color || "#0f172a")
    setPanelFg(t?.panel_text_color || "#ffffff")
    setPanelFont(t?.panel_font_family || "System")

    setHeaderBg(t?.header_bg_color || "#ffffff")
    setHeaderFg(t?.header_text_color || "#111111")
  }

  React.useEffect(() => {
    load().catch((e) => setError(e?.message || "Failed to load theme"))
  }, [])

  async function save() {
    setBusy(true)
    setError(null)
    setOk(null)

    try {
      const payload = {
        bg_color: bg,
        text_color: fg,
        font_family: font || "System",
        font_weight: weight || "normal",
        font_style: style || "normal",
        panel_bg_color: panelBg,
        panel_text_color: panelFg,
        panel_font_family: panelFont || "System",
        header_bg_color: headerBg,
        header_text_color: headerFg,
      }

      const res = await fetch("/api/admin/general-session/theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const j = await res.json().catch(() => ({}))

      if (!res.ok || !j?.ok) {
        throw new Error(j?.error || "Failed to save theme")
      }

      setTheme((j?.theme || null) as ThemeRow | null)
      setOk("Theme saved")
      setTimeout(() => setOk(null), 1500)
    } catch (e: any) {
      setError(e?.message || "Failed to save theme")
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">General Session Theme</h2>
          <p className="mt-1 text-xs text-white/60">
            Changes apply only to <span className="font-semibold">/general-session</span>.
          </p>
        </div>

        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm hover:bg-white/15 disabled:opacity-60"
        >
          {busy ? "Saving..." : "Save Theme"}
        </button>
      </div>

      {error ? (
        <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {ok ? (
        <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-100">
          {ok}
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="text-sm font-semibold">Page Shell</div>
          <div className="mt-3 grid gap-4">
            <label className="block">
              <div className="text-xs text-white/60">Background</div>
              <div className="mt-1 flex items-center gap-3">
                <input
                  type="color"
                  value={bg}
                  onChange={(e) => setBg(e.target.value)}
                  className="h-10 w-12 rounded-lg border border-white/10 bg-transparent"
                  aria-label="Background color"
                />
                <input
                  value={bg}
                  onChange={(e) => setBg(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm"
                />
              </div>
            </label>

            <label className="block">
              <div className="text-xs text-white/60">Text</div>
              <div className="mt-1 flex items-center gap-3">
                <input
                  type="color"
                  value={fg}
                  onChange={(e) => setFg(e.target.value)}
                  className="h-10 w-12 rounded-lg border border-white/10 bg-transparent"
                  aria-label="Text color"
                />
                <input
                  value={fg}
                  onChange={(e) => setFg(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm"
                />
              </div>
            </label>

            <label className="block">
              <div className="text-xs text-white/60">Font</div>
              <select
                value={font}
                onChange={(e) => setFont(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm"
              >
                {FONT_OPTIONS.map((o) => (
                  <option key={o.label} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <div className="text-xs text-white/60">Weight</div>
              <select
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm"
              >
                {WEIGHT_OPTIONS.map((o) => (
                  <option key={o.label} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <div className="text-xs text-white/60">Style</div>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm"
              >
                {STYLE_OPTIONS.map((o) => (
                  <option key={o.label} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="text-sm font-semibold">Inner Window</div>
          <div className="mt-3 grid gap-4">
            <label className="block">
              <div className="text-xs text-white/60">Panel Background</div>
              <div className="mt-1 flex items-center gap-3">
                <input
                  type="color"
                  value={panelBg}
                  onChange={(e) => setPanelBg(e.target.value)}
                  className="h-10 w-12 rounded-lg border border-white/10 bg-transparent"
                  aria-label="Panel background color"
                />
                <input
                  value={panelBg}
                  onChange={(e) => setPanelBg(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm"
                />
              </div>
            </label>

            <label className="block">
              <div className="text-xs text-white/60">Panel Text</div>
              <div className="mt-1 flex items-center gap-3">
                <input
                  type="color"
                  value={panelFg}
                  onChange={(e) => setPanelFg(e.target.value)}
                  className="h-10 w-12 rounded-lg border border-white/10 bg-transparent"
                  aria-label="Panel text color"
                />
                <input
                  value={panelFg}
                  onChange={(e) => setPanelFg(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm"
                />
              </div>
            </label>

            <label className="block">
              <div className="text-xs text-white/60">Panel Font</div>
              <select
                value={panelFont}
                onChange={(e) => setPanelFont(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm"
              >
                {FONT_OPTIONS.map((o) => (
                  <option key={o.label} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="text-sm font-semibold">Header Band</div>
          <div className="mt-3 grid gap-4">
            <label className="block">
              <div className="text-xs text-white/60">Header Background</div>
              <div className="mt-1 flex items-center gap-3">
                <input
                  type="color"
                  value={headerBg}
                  onChange={(e) => setHeaderBg(e.target.value)}
                  className="h-10 w-12 rounded-lg border border-white/10 bg-transparent"
                  aria-label="Header background color"
                />
                <input
                  value={headerBg}
                  onChange={(e) => setHeaderBg(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm"
                />
              </div>
            </label>

            <label className="block">
              <div className="text-xs text-white/60">Header Text</div>
              <div className="mt-1 flex items-center gap-3">
                <input
                  type="color"
                  value={headerFg}
                  onChange={(e) => setHeaderFg(e.target.value)}
                  className="h-10 w-12 rounded-lg border border-white/10 bg-transparent"
                  aria-label="Header text color"
                />
                <input
                  value={headerFg}
                  onChange={(e) => setHeaderFg(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm"
                />
              </div>
            </label>
          </div>
        </div>
      </div>

      <div
        className="mt-4 rounded-3xl border border-white/10 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
        style={{
          backgroundColor: bg,
          color: fg,
          fontFamily: font === "System" ? undefined : font,
          fontWeight: weight as React.CSSProperties["fontWeight"],
          fontStyle: style as React.CSSProperties["fontStyle"],
        }}
      >
        <div
          className="overflow-hidden rounded-3xl border border-white/10 ring-1 ring-white/5"
          style={{
            backgroundColor: panelBg,
            color: panelFg,
            fontFamily: panelFont === "System" ? undefined : panelFont,
          }}
        >
          <div
            className="border-b border-black/10 px-5 py-4"
            style={{
              backgroundColor: headerBg,
              color: headerFg,
            }}
          >
            <div className="text-sm font-semibold">Header band preview</div>
            <div className="mt-1 text-xs opacity-80">Client logo area / brand strip</div>
          </div>

          <div className="border-b border-white/10 bg-black/10 px-5 py-4">
            <div className="text-lg font-semibold">General Session</div>
            <div className="mt-1 text-xs opacity-80">
              This is roughly how your branded inner webcast window will feel.
            </div>
          </div>

          <div className="grid gap-4 p-5 md:grid-cols-[2fr_1fr]">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-sm font-semibold">Watch Area</div>
              <div className="mt-3 h-32 rounded-2xl border border-white/10 bg-black/20" />
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-sm font-semibold">Q&amp;A Panel</div>
              <div className="mt-3 h-32 rounded-2xl border border-white/10 bg-black/20" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}