"use client"

import { useState } from "react"
import EventTemplateGallery from "@/components/page-editor/EventTemplateGallery"
import EventDesignPicker from "@/components/page-editor/EventDesignPicker"
import { SessionLayouts, sessionPreviewItems } from "@/components/events/SessionLayouts"
import { eventDesignTemplates, findEventDesignTemplate, resolveEventDesign, sessionLayouts, type SessionLayout } from "@/lib/page-editor/eventDesignPresets"
import type { EventTheme } from "@/lib/page-editor/sectionTypes"

export default function EventDesignWorkbench() {
  const [theme, setTheme] = useState<EventTheme>({ presetId: "soft-cosmic", sessionLayout: "featured" })
  const [gallery, setGallery] = useState(false)
  const resolved = resolveEventDesign(theme, null)
  return (
    <main className="mx-auto grid max-w-6xl gap-6 p-5 sm:p-8">
      <h1 className="text-3xl font-semibold">Local event design preview</h1>
      <p>Explore sample attendee pages and layouts. Changes here are temporary.</p>
      <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
        <div className="grid content-start gap-4 rounded-xl bg-slate-950 p-4 text-white">
          <button type="button" className="rounded-lg border border-violet-400 px-3 py-2 text-sm" onClick={() => setGallery(true)}>Browse event templates</button>
          {gallery && <EventTemplateGallery onClose={() => setGallery(false)} onApply={async (template, themeId, fontStyle) => setTheme((current) => ({ ...current, presetId: themeId, fontStyle, sessionLayout: template.sessions, accentColor: undefined }))} />}
          <label className="grid gap-1">Starter template
            <select defaultValue="" className="rounded-lg border border-slate-500 bg-slate-900 p-2" onChange={(event) => {
              const selected = findEventDesignTemplate(event.target.value)
              if (selected) setTheme({ presetId: selected.themeId, sessionLayout: selected.sessions })
            }}>
              <option value="" disabled>Choose a starter template</option>
              {eventDesignTemplates.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
            </select>
          </label>
          <EventDesignPicker demo key={JSON.stringify([theme.presetId, theme.accentColor, theme.fontStyle])} theme={theme} onApply={async (presetId, accentColor, brand) => setTheme((current) => ({ ...current, presetId, accentColor, ...brand }))} />
        </div>
        <div className="grid content-start gap-4 rounded-xl p-4 sm:p-6" style={{ backgroundColor: resolved?.pageBackgroundColor, color: resolved?.textColor }}>
          <h2 className="text-2xl font-semibold">My sessions</h2>
          <label className="grid max-w-xs gap-1">Sessions layout
            <select aria-label="Sessions layout" className="rounded-lg border p-2" style={{ backgroundColor: resolved?.panelBackgroundColor, borderColor: resolved?.panelBorderColor }}
              value={theme.sessionLayout} onChange={(event) => setTheme((current) => ({ ...current, sessionLayout: event.target.value as SessionLayout }))}>
              {sessionLayouts.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </label>
          <SessionLayouts items={sessionPreviewItems} theme={resolved} preview />
        </div>
      </div>
    </main>
  )
}
