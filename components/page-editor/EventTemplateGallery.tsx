"use client"

import { useEffect, useRef, useState } from "react"
import { SessionLayouts, sessionPreviewItems } from "@/components/events/SessionLayouts"
import { eventDesignFonts, eventDesignPresets, eventDesignTemplates, findEventDesignPreset, resolveEventDesign, resolveEventFont, type EventFont } from "@/lib/page-editor/eventDesignPresets"

const pages = ["Home", "Sessions", "Lobby"] as const
const devices = ["Desktop", "Tablet", "Mobile"] as const
export type EventStarterTemplate = typeof eventDesignTemplates[number]

export default function EventTemplateGallery({ onApply, onClose }: {
  onApply: (template: EventStarterTemplate, themeId: typeof eventDesignPresets[number]["id"], fontStyle: EventFont | "") => Promise<void>
  onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [selected, setSelected] = useState<EventStarterTemplate>(eventDesignTemplates[0])
  const [themeOverride, setThemeOverride] = useState<typeof eventDesignPresets[number]["id"] | null>(null)
  const [fontStyle, setFontStyle] = useState<EventFont | "">("")
  const [page, setPage] = useState<typeof pages[number]>("Home")
  const [device, setDevice] = useState<typeof devices[number]>("Desktop")
  const [assignedOnly, setAssignedOnly] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const preset = findEventDesignPreset(themeOverride ?? selected.themeId)!
  const theme = resolveEventDesign({ presetId: preset.id, sessionLayout: selected.sessions, fontStyle }, null)
  useEffect(() => {
    const node = dialog.current
    node?.showModal()
    return () => node?.close()
  }, [])

  async function apply() {
    setBusy(true)
    setError("")
    try {
      await onApply(selected, preset.id, fontStyle)
      onClose()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not apply the design.")
    } finally {
      setBusy(false)
    }
  }

  return <dialog ref={dialog} aria-labelledby="event-gallery-title" onCancel={(event) => { event.preventDefault(); if (!busy) onClose() }} className="fixed inset-0 m-auto max-h-[90dvh] w-[min(1080px,calc(100%-2rem))] max-w-none overflow-auto rounded-2xl border border-slate-700 bg-[#111522] text-white shadow-2xl backdrop:bg-black/75">
    <div className="flex items-center justify-between gap-3 border-b border-white/10 p-5">
      <h2 id="event-gallery-title" className="text-xl font-semibold">Event templates</h2>
      <button type="button" onClick={onClose} disabled={busy} className="rounded-md border border-white/15 px-3 py-2 text-sm">Close</button>
    </div>
    <div className="grid min-h-[480px] md:grid-cols-[245px_1fr]">
      <div className="grid content-start grid-cols-2 gap-2 border-b border-white/10 p-3 md:grid-cols-1 md:border-b-0 md:border-r">
        {eventDesignTemplates.map((template) => {
          const palette = findEventDesignPreset(template.themeId)!
          return <button key={template.id} type="button" onClick={() => { setSelected(template); setThemeOverride(null) }} aria-pressed={selected.id === template.id} className="grid gap-2 rounded-xl border border-white/10 p-2 text-left text-sm aria-pressed:border-violet-400 aria-pressed:bg-violet-500/15">
            <span aria-hidden="true" className="grid h-12 grid-cols-[2fr_1fr] overflow-hidden rounded-md" style={{ background: palette.background }}>
              <span className="m-2 rounded" style={{ background: palette.panel, boxShadow: `inset 3px 0 ${palette.accent}` }} />
              <span className="my-2 mr-2 rounded" style={{ background: palette.accent }} />
            </span>
            {template.name}
          </button>
        })}
      </div>
      <div className="min-w-0 bg-[#0b0f19] p-3 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1" aria-label="Preview page">{pages.map((name) => <button key={name} type="button" aria-pressed={page === name} onClick={() => setPage(name)} className="rounded-md px-3 py-2 text-sm aria-pressed:bg-violet-800">{name}</button>)}</div>
          <label className="text-sm">Device <select value={device} onChange={(event) => setDevice(event.target.value as typeof device)} className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-white">{devices.map((name) => <option key={name}>{name}</option>)}</select></label>
        </div>
        <fieldset className="mb-4">
          <legend className="mb-2 text-sm font-semibold">Color theme</legend>
          <div className="flex flex-wrap gap-1.5">
            {eventDesignPresets.map((palette) => (
              <button key={palette.id} type="button" aria-pressed={preset.id === palette.id}
                onClick={() => setThemeOverride(palette.id)}
                className="inline-flex min-h-9 items-center gap-2 rounded-md border border-slate-700 px-2 text-xs text-slate-200 hover:border-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300 aria-pressed:border-violet-400 aria-pressed:bg-violet-500/20">
                <span aria-hidden="true" className="flex h-4 w-6 overflow-hidden rounded border border-white/35" style={{ background: palette.background }}>
                  <span className="ml-auto w-2.5" style={{ background: palette.accent }} />
                </span>
                {palette.name}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-400">Suggested for {selected.name} · {findEventDesignPreset(selected.themeId)?.name}</p>
        </fieldset>
        <label className="mb-4 flex flex-wrap items-center gap-2 text-sm font-semibold">
          Typeface
          <select value={fontStyle} onChange={(event) => setFontStyle(event.target.value as EventFont | "")}
            className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-white">
            <option value="">Theme default</option>
            {Object.entries(eventDesignFonts).map(([id, font]) => <option key={id} value={id}>{font.label}</option>)}
          </select>
          <span aria-hidden="true" className="text-base text-slate-300" style={{ fontFamily: resolveEventFont(theme) }}>Aa</span>
        </label>
        <div className="mx-auto grid gap-4 rounded-xl p-4 sm:p-6" style={{ maxWidth: device === "Mobile" ? 360 : device === "Tablet" ? 600 : undefined, backgroundColor: preset.background, color: preset.ink, fontFamily: resolveEventFont(theme) }}>
          <div className="flex flex-wrap items-center gap-3 border-b pb-3 text-xs" style={{ borderColor: preset.border }}>
            <strong>{selected.name}</strong><span>{page}</span><span className="ml-auto">Sample content</span>
          </div>
          {page === "Sessions" ? <>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={assignedOnly} onChange={(event) => setAssignedOnly(event.target.checked)} />Show only sessions assigned to the sample attendee</label>
            <SessionLayouts items={assignedOnly ? sessionPreviewItems.slice(0, 1) : sessionPreviewItems} theme={theme} preview />
          </> :
            <div className="grid gap-3 rounded-xl border p-5" style={{ backgroundColor: preset.panel, borderColor: preset.border }}>
              <h3 className="text-2xl font-semibold">{page === "Home" ? selected.name : "Welcome to the lobby"}</h3>
              <p>{page === "Home" ? "Explore the agenda and reserve your place." : "Your next session starts at 9:00 AM."}</p>
              <span className="w-fit rounded-md border px-3 py-2 font-semibold" style={{ borderColor: preset.accent, color: preset.accent }}>{page === "Home" ? "Register" : "View sessions"}</span>
            </div>}
        </div>
      </div>
    </div>
    <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-[#111522] p-4">
      <p className="text-sm text-slate-300">Applies the theme across attendee pages and sets the default Sessions layout.</p>
      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      <button type="button" onClick={() => void apply()} disabled={busy} className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold disabled:opacity-50">{busy ? "Applying…" : "Apply event design"}</button>
    </div>
  </dialog>
}
