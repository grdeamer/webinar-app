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
  onUpload?: (file: File, onProgress: (percent: number) => void) => Promise<void>
  editing: boolean
  device: "desktop" | "tablet" | "mobile"
}

export default function HoldScreenEditor({ settings, eventTitle, saveStatus, onChange, onSave, onUpload, editing, device }: Props) {
  const [selected, setSelected] = useState<HoldScreenField>("heading")
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  async function upload(file: File) {
    if (!onUpload) return
    setUploadError(null)
    if (!file.type.startsWith("image/")) { setUploadError("Choose an image file."); return }
    setUploadProgress(0)
    try { await onUpload(file, setUploadProgress) } catch (error) { setUploadError(error instanceof Error ? error.message : "Upload failed. Try again.") } finally { setUploadProgress(null) }
  }
  function update(key: keyof HoldScreenSettings, value: string) { onChange({ ...settings, [key]: value }) }
  return <div className="flex min-h-0 flex-1 flex-col overflow-auto lg:flex-row">
    {editing ? <aside aria-label="Hold screen components" className="w-full shrink-0 border-r border-white/[0.07] bg-[#080b13] p-4 lg:w-[210px]">
      <h2 className="mb-4 text-xs font-semibold text-white/50">Hold screen components</h2>
      {FIELDS.map(({ key, label }) => <button key={key} type="button" aria-pressed={selected === key} onClick={() => setSelected(key)} className={`mb-1 block w-full rounded-lg px-3 py-2 text-left text-sm ${selected === key ? "bg-violet-500/15 text-violet-100" : "text-white/60 hover:bg-white/5"}`}>{label}{settings.hiddenFields?.includes(key) ? " · Removed" : ""}</button>)}
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
      {selected === "logoUrl" && onUpload ? <div className="mb-5">
        <label className={`block rounded-lg border border-violet-300/25 bg-violet-500/10 px-4 py-3 text-center text-sm text-violet-100 ${uploadProgress !== null ? "opacity-60" : "cursor-pointer hover:bg-violet-500/20"}`}>
          {uploadProgress === null ? "Upload image" : `Uploading ${uploadProgress}%`}
          <input aria-label="Upload logo image" type="file" accept="image/*" disabled={uploadProgress !== null} className="sr-only" onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void upload(file) }} />
        </label>
        {uploadError ? <p role="alert" className="mt-2 text-xs text-red-200">{uploadError}</p> : null}
        <p className="mt-2 text-xs text-white/45">Choose an image from your computer, or paste a URL below.</p>
      </div> : null}
      <label className="block text-xs text-white/65">{selected === "logoUrl" ? "Logo URL (HTTPS)" : FIELDS.find((field) => field.key === selected)?.label}
        {selected === "message" ? <textarea className={INPUT} rows={5} value={settings.message} onChange={(event) => update("message", event.target.value)} /> : <input className={INPUT} value={settings[selected]} placeholder={selected === "title" ? eventTitle : undefined} onChange={(event) => update(selected, event.target.value)} />}
      </label>
      {selected === "logoUrl" ? <label className="mt-4 block text-xs text-white/65">Logo description<input className={INPUT} value={settings.logoAlt} onChange={(event) => update("logoAlt", event.target.value)} /></label> : null}
      {selected === "title" ? <p className="mt-3 text-xs leading-5 text-white/45">Leave blank to follow the event title automatically.</p> : null}
      <button type="button" className="mt-5 w-full rounded-lg border border-red-300/20 px-3 py-2 text-sm text-red-200 hover:bg-red-500/10" onClick={() => {
        const hiddenFields = settings.hiddenFields ?? []
        onChange({ ...settings, hiddenFields: hiddenFields.includes(selected) ? hiddenFields.filter(field => field !== selected) : [...hiddenFields, selected] })
      }}>{settings.hiddenFields?.includes(selected) ? "Restore component" : "Remove component"}</button>
      <p className="mt-2 text-xs text-white/45">Removes it from this screen. Your content is kept so you can restore it.</p>
      <h3 className="mt-8 border-t border-white/[0.07] pt-5 text-sm font-medium">Screen style</h3>
      {([['backgroundColor', 'Background'], ['cardColor', 'Card'], ['textColor', 'Text'], ['accentColor', 'Accent']] as const).map(([key, label]) => <label key={key} className="mt-4 flex items-center justify-between text-xs text-white/65">{label}<input aria-label={`${label} color`} type="color" value={settings[key]} onChange={(event) => update(key, event.target.value)} className="h-8 w-12 cursor-pointer rounded border border-white/10 bg-transparent" /></label>)}
      <p className="mt-6 text-xs leading-5 text-white/45">Changes save with this page. Use Publish → external site publishing to update letstrainonline.live.</p>
    </aside> : null}
  </div>
}
