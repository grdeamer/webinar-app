"use client"

import { useState } from "react"
import { SessionLayouts, sessionPreviewItems } from "@/components/events/SessionLayouts"
import { eventDesignFonts, eventButtonStyles, resolveEventFont, safeEventLogo, eventDesignPresets, findEventDesignPreset, resolveEventDesign, sessionLayouts, type SessionLayout } from "@/lib/page-editor/eventDesignPresets"
import type { EventTheme } from "@/lib/page-editor/sectionTypes"

const previewPages = ["Home", "Sessions", "Lobby"] as const

export default function EventDesignPicker({ theme, onApply, demo = false }: {
  theme: EventTheme
  demo?: boolean
  onApply: (presetId: string, accentColor: string, brand: Partial<EventTheme>) => Promise<void>
}) {
  const initial = findEventDesignPreset(theme.presetId) ?? eventDesignPresets[1]
  const [choice, setChoice] = useState<string>(initial.id)
  const [accent, setAccent] = useState<string>(theme.accentColor ?? initial.accent)
  const [page, setPage] = useState<typeof previewPages[number]>("Home")
  const [layout, setLayout] = useState<SessionLayout>(theme.sessionLayout ?? "featured")
  const [fontStyle, setFontStyle] = useState(theme.fontStyle ?? "")
  const [buttonStyle, setButtonStyle] = useState(theme.buttonStyle ?? "solid")
  const [logoUrl, setLogoUrl] = useState(theme.logoUrl ?? "")
  const logo = safeEventLogo(logoUrl)
  const brand = { fontStyle, buttonStyle, logoUrl }
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const preset = findEventDesignPreset(choice) ?? initial
  const previewTheme = resolveEventDesign({ presetId: preset.id, accentColor: accent, ...brand }, null)

  async function applyTheme() {
    setBusy(true)
    setMessage("")
    try {
      if (logoUrl && !logo) throw new Error("Enter a valid HTTPS logo URL.")
      await onApply(preset.id, accent, brand)
      setMessage(demo ? `${preset.name} preview updated.` : `${preset.name} applied to this event.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not apply the theme.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="grid gap-3 text-sm" aria-label="Theme preview">
      <label className="grid gap-1">Event theme
        <select aria-label="Event theme" className="rounded-lg border border-slate-500 bg-slate-900 p-2 text-white" value={preset.id} onChange={(event) => {
          const next = findEventDesignPreset(event.target.value)
          if (next) {
            setChoice(next.id)
            setAccent(next.accent)
            setMessage("")
          }
        }}>
          {eventDesignPresets.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
        </select>
      </label>
      <label className="flex items-center justify-between gap-2">Accent
        <input type="color" value={accent} onChange={(event) => setAccent(event.target.value)} />
      </label>
      <label className="grid gap-1">Event typeface
        <select className="rounded-lg border border-slate-500 bg-slate-900 p-2 text-white" value={fontStyle} onChange={(event) => setFontStyle(event.target.value as typeof fontStyle)}>
          <option value="">Theme default</option>
          {Object.entries(eventDesignFonts).map(([id, font]) => <option key={id} value={id}>{font.label}</option>)}
        </select>
      </label>
      <label className="grid gap-1">Button style
        <select className="rounded-lg border border-slate-500 bg-slate-900 p-2 capitalize text-white" value={buttonStyle} onChange={(event) => setButtonStyle(event.target.value as typeof buttonStyle)}>
          {eventButtonStyles.map((style) => <option key={style} value={style}>{style}</option>)}
        </select>
      </label>
      <label className="grid gap-1">Event logo URL
        <input type="url" value={logoUrl} placeholder="https://" onChange={(event) => setLogoUrl(event.target.value.trim())} className="w-full rounded-lg border border-slate-500 bg-slate-900 p-2 text-white" />
      </label>
      <div className="flex flex-wrap gap-1" aria-label="Preview page">
        {previewPages.map((name) => <button type="button" key={name} aria-pressed={page === name} onClick={() => setPage(name)} className="rounded-md border border-slate-500 px-2 py-1 aria-pressed:bg-violet-800">{name}</button>)}
      </div>
      <div className="grid gap-3 rounded-xl p-3" style={{ background: preset.background, color: preset.ink, fontFamily: resolveEventFont(previewTheme) }}>
        {logo && <img src={logo} alt="Event logo" className="h-9 max-w-full object-contain object-left" />}
        {page === "Sessions" ? <>
          <label className="grid gap-1">Preview layout
            <select aria-label="Preview layout" value={layout} onChange={(event) => setLayout(event.target.value as SessionLayout)} className="rounded border p-1" style={{ background: preset.panel, color: preset.ink, borderColor: preset.border }}>
              {sessionLayouts.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <SessionLayouts items={sessionPreviewItems} theme={previewTheme} settings={{ displayMode: layout, showJoinAction: false }} preview />
        </> : <>
          <strong className="text-xl">{page === "Home" ? "Event home" : "Event lobby"}</strong>
          <div className="rounded-lg border p-3" style={{ background: preset.panel, borderColor: preset.border }}>
            {page === "Home" ? "Welcome to the event" : "Your next session"}
          </div>
          <span className="w-fit rounded-md border px-3 py-1 font-semibold" style={{ color: buttonStyle === "outline" ? preset.ink : preset.background, backgroundColor: buttonStyle === "outline" ? undefined : accent, borderColor: accent, borderRadius: buttonStyle === "pill" ? 999 : 6 }}>
            {page === "Home" ? "Register" : "View sessions"}
          </span>
        </>}
      </div>
      <button type="button" disabled={busy} onClick={() => void applyTheme()} className="rounded-lg bg-violet-700 px-3 py-2 font-semibold text-white disabled:opacity-60">
        {busy ? "Applying…" : demo ? "Apply to preview" : "Apply to event"}
      </button>
      {!demo && <p className="text-xs opacity-80">Applies across attendee pages, including published pages. Page content stays as saved.</p>}
      {message && <p role="status" className="text-xs">{message}</p>}
    </section>
  )
}
