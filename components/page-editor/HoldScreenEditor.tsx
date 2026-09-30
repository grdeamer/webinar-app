"use client"

import { useState } from "react"
import EventHoldScreen, { type HoldScreenField } from "@/components/events/EventHoldScreen"
import type { HoldScreenSettings } from "@/lib/page-editor/holdScreen"

const INPUT = "mt-2 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-violet-400"
const FIELDS: { key: HoldScreenField; label: string }[] = [{ key: "logoUrl", label: "Logo" }, { key: "title", label: "Event label" }, { key: "heading", label: "Heading" }, { key: "message", label: "Message" }, { key: "status", label: "Waiting indicator" }]

type Props = {
  settings: HoldScreenSettings
  eventTitle: string
  saveStatus: string
  onChange: (settings: HoldScreenSettings) => void
  onSave: () => void
  editing: boolean
  device: "desktop" | "tablet" | "mobile"
}

export default function HoldScreenEditor({ settings, eventTitle, saveStatus, onChange, onSave, editing, device }: Props) {
  const [selected, setSelected] = useState<HoldScreenField>("heading")
  function update(key: keyof HoldScreenSettings, value: string) { onChange({ ...settings, [key]: value }) }
  return <div className="flex min-h-0 flex-1 flex-col overflow-auto lg:flex-row">
    {editing ? <aside aria-label="Hold screen components" className="w-full shrink-0 border-r border-white/[0.07] bg-[#080b13] p-4 lg:w-[210px]">
      <h2 className="mb-4 text-xs font-semibold text-white/50">Hold screen components</h2>
      {FIELDS.map(({ key, label }) => <button key={key} type="button" aria-pressed={selected === key} onClick={() => setSelected(key)} className={`mb-1 block w-full rounded-lg px-3 py-2 text-left text-sm ${selected === key ? "bg-violet-500/15 text-violet-100" : "text-white/60 hover:bg-white/5"}`}>{label}</button>)}
      <p className="mt-6 text-xs leading-5 text-white/45">Shown while the event is closed. Previewing this screen does not change event access.</p>
    </aside> : null}
    <main className="min-w-0 flex-1 overflow-auto p-5">
      <div className="mb-3 text-xs text-white/50">{editing ? "Click any part of the hold screen to edit it." : "Hold screen preview"}</div>
      <div className="mx-auto overflow-hidden rounded-2xl" style={{ maxWidth: device === "mobile" ? 390 : device === "tablet" ? 768 : undefined }}>
        <EventHoldScreen settings={settings} eventTitle={eventTitle} selectedField={selected} onSelect={editing ? setSelected : undefined} />
      </div>
    </main>
    {editing ? <aside aria-label="Hold screen properties" className="w-full shrink-0 overflow-auto border-l border-white/[0.07] bg-[#080b13] p-5 lg:w-[320px]">
      <div className="text-[10px] font-bold uppercase tracking-[.16em] text-white/40">Inspector</div>
      <h2 className="mt-2 text-lg font-semibold">{FIELDS.find((field) => field.key === selected)?.label}</h2>
      <div className="my-5 flex items-center justify-between gap-2 border-y border-white/[0.07] py-3 text-xs"><span role="status" className="text-white/55">{saveStatus}</span><button type="button" onClick={onSave} className="text-violet-200">Save now</button></div>
      <label className="block text-xs text-white/65">{selected === "logoUrl" ? "Logo URL (HTTPS)" : FIELDS.find((field) => field.key === selected)?.label}
        {selected === "message" ? <textarea className={INPUT} rows={5} value={settings.message} onChange={(event) => update("message", event.target.value)} /> : <input className={INPUT} value={settings[selected]} placeholder={selected === "title" ? eventTitle : undefined} onChange={(event) => update(selected, event.target.value)} />}
      </label>
      {selected === "logoUrl" ? <label className="mt-4 block text-xs text-white/65">Logo description<input className={INPUT} value={settings.logoAlt} onChange={(event) => update("logoAlt", event.target.value)} /></label> : null}
      {selected === "title" ? <p className="mt-3 text-xs leading-5 text-white/45">Leave blank to follow the event title automatically.</p> : null}
      <h3 className="mt-8 border-t border-white/[0.07] pt-5 text-sm font-medium">Screen style</h3>
      {([['backgroundColor', 'Background'], ['cardColor', 'Card'], ['textColor', 'Text'], ['accentColor', 'Accent']] as const).map(([key, label]) => <label key={key} className="mt-4 flex items-center justify-between text-xs text-white/65">{label}<input aria-label={`${label} color`} type="color" value={settings[key]} onChange={(event) => update(key, event.target.value)} className="h-8 w-12 cursor-pointer rounded border border-white/10 bg-transparent" /></label>)}
      <p className="mt-6 text-xs leading-5 text-white/45">Changes save with this page. Use Publish → external site publishing to update letstrainonline.live.</p>
    </aside> : null}
  </div>
}
