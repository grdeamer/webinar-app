"use client"

import { useRef, useState } from "react"
import type { EditorToolPanel } from "./EditorToolDock"
import type { EventTheme, SystemComponentKey } from "@/lib/page-editor/sectionTypes"

type Template = { id: string; name?: string }
type Asset = { id: string; url: string; name: string; type: string }
type ElementType = "text" | "image" | "pdf" | "video" | "button" | "spacer"
type TextPreset = "heading" | "subheading" | "body"

const CONTROL = "w-full rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2.5 text-left text-xs font-semibold text-white/75 transition hover:border-violet-300/30 hover:bg-violet-400/10 hover:text-white"

const APP_BLOCKS: Array<{ key: SystemComponentKey; label: string; description: string }> = [
  { key: "agenda", label: "Agenda", description: "Live event schedule" },
  { key: "sessions_list", label: "Sessions", description: "Session directory" },
  { key: "chat", label: "Chat", description: "Attendee conversation" },
  { key: "qa", label: "Q&A", description: "Questions and moderation" },
  { key: "networking", label: "Networking", description: "Connection experience" },
  { key: "sponsors", label: "Sponsors", description: "Sponsor showcase" },
]

export default function EditorToolPanel({
  activePanel,
  templates,
  assets,
  eventTheme,
  onApplyTemplate,
  onAddElement,
  onAddTextPreset,
  onUpload,
  onAddAsset,
  onUpdateTheme,
  onAddApp,
}: {
  activePanel: EditorToolPanel
  templates: Template[]
  assets: Asset[]
  eventTheme: EventTheme
  onApplyTemplate: (id: string) => void
  onAddElement: (type: ElementType) => void
  onAddTextPreset: (preset: TextPreset) => void
  onUpload: (file: File) => Promise<void>
  onAddAsset: (asset: Asset) => void
  onUpdateTheme: (theme: Partial<EventTheme>) => void
  onAddApp: (key: SystemComponentKey) => void
}) {
  const uploadRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function upload(file: File | undefined) {
    if (!file) return
    setUploading(true)
    try { await onUpload(file) } finally { setUploading(false) }
  }

  return (
    <aside aria-label={`${activePanel} tools`} className="w-[246px] shrink-0 overflow-y-auto border-r border-white/[0.07] bg-[#0b0e17] p-4">
      <h2 className="text-sm font-bold capitalize text-white">{activePanel}</h2>
      <p className="mt-1 text-[11px] leading-5 text-white/40">
        {activePanel === "design" ? "Templates and page appearance." : activePanel === "elements" ? "Add content to the active page." : activePanel === "text" ? "Typography presets and text blocks." : activePanel === "media" ? "Upload and reuse event media." : activePanel === "brand" ? "Apply consistent event colors." : "Add live Jupiter experiences."}
      </p>

      <div className="mt-5 space-y-2">
        {activePanel === "design" ? <>
          <PanelLabel>Templates</PanelLabel>
          {templates.length ? templates.map((template) => <button key={template.id} type="button" className={CONTROL} onClick={() => onApplyTemplate(template.id)}>{template.name || "Untitled template"}</button>) : <Empty>No saved templates yet.</Empty>}
          <PanelLabel>Canvas color</PanelLabel>
          <ColorControl label="Background" value={eventTheme.pageBackgroundColor ?? "#020617"} onChange={(value) => onUpdateTheme({ pageBackgroundColor: value })} />
          <ColorControl label="Panel" value={eventTheme.panelBackgroundColor ?? "#0f172a"} onChange={(value) => onUpdateTheme({ panelBackgroundColor: value })} />
        </> : null}

        {activePanel === "elements" ? <>
          {([['text','Text'],['image','Image'],['button','Button'],['video','Video'],['pdf','PDF'],['spacer','Divider']] as Array<[ElementType,string]>).map(([type, label]) => <button key={type} type="button" className={CONTROL} onClick={() => onAddElement(type)}>+ {label}</button>)}
        </> : null}

        {activePanel === "text" ? <>
          <button type="button" className={`${CONTROL} text-xl`} onClick={() => onAddTextPreset("heading")}>Add a heading</button>
          <button type="button" className={`${CONTROL} text-base`} onClick={() => onAddTextPreset("subheading")}>Add a subheading</button>
          <button type="button" className={`${CONTROL} font-normal`} onClick={() => onAddTextPreset("body")}>Add body text</button>
        </> : null}

        {activePanel === "media" ? <>
          <input ref={uploadRef} className="sr-only" type="file" accept="image/*,video/*,application/pdf" onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = "" }} />
          <button type="button" disabled={uploading} className={`${CONTROL} text-center disabled:cursor-wait disabled:opacity-50`} onClick={() => uploadRef.current?.click()}>{uploading ? "Uploading…" : "Upload media"}</button>
          <PanelLabel>Library</PanelLabel>
          {assets.length ? assets.slice().reverse().slice(0, 12).map((asset) => <button key={asset.id} type="button" className={CONTROL} onClick={() => onAddAsset(asset)}><span className="block truncate">{asset.name}</span><span className="mt-0.5 block text-[9px] uppercase text-white/35">{asset.type}</span></button>) : <Empty>Uploaded media will appear here.</Empty>}
        </> : null}

        {activePanel === "brand" ? <>
          <PanelLabel>Brand kit</PanelLabel>
          <button type="button" className={CONTROL} onClick={() => onUpdateTheme({ pageBackgroundColor: "#020617", panelBackgroundColor: "#0f172a", textColor: "#ffffff", gradientColorA: "#0f172a", gradientColorB: "#6d28d9" })}>Jupiter Night</button>
          <button type="button" className={CONTROL} onClick={() => onUpdateTheme({ pageBackgroundColor: "#07111f", panelBackgroundColor: "#10243d", textColor: "#f8fafc", gradientColorA: "#0c4a6e", gradientColorB: "#2563eb" })}>Orbit Blue</button>
          <button type="button" className={CONTROL} onClick={() => onUpdateTheme({ pageBackgroundColor: "#120c18", panelBackgroundColor: "#2a1731", textColor: "#fff7ed", gradientColorA: "#7c2d12", gradientColorB: "#a21caf" })}>Solar Event</button>
          <PanelLabel>Custom colors</PanelLabel>
          <ColorControl label="Text" value={eventTheme.textColor ?? "#ffffff"} onChange={(value) => onUpdateTheme({ textColor: value })} />
          <ColorControl label="Accent A" value={eventTheme.gradientColorA ?? "#0f172a"} onChange={(value) => onUpdateTheme({ gradientColorA: value })} />
          <ColorControl label="Accent B" value={eventTheme.gradientColorB ?? "#1d4ed8"} onChange={(value) => onUpdateTheme({ gradientColorB: value })} />
        </> : null}

        {activePanel === "apps" ? APP_BLOCKS.map((app) => <button key={app.key} type="button" className={CONTROL} onClick={() => onAddApp(app.key)}><span className="block">{app.label}</span><span className="mt-0.5 block text-[10px] font-normal text-white/40">{app.description}</span></button>) : null}
      </div>
    </aside>
  )
}

function PanelLabel({ children }: { children: string }) { return <h3 className="pt-3 text-[9px] font-bold uppercase tracking-[0.18em] text-white/35">{children}</h3> }
function Empty({ children }: { children: string }) { return <p className="rounded-xl border border-dashed border-white/10 p-3 text-[11px] text-white/35">{children}</p> }
function ColorControl({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-xs text-white/60"><span>{label}</span><input aria-label={label} type="color" value={value} onChange={(event) => onChange(event.target.value)} className="h-7 w-9 cursor-pointer border-0 bg-transparent p-0" /></label> }
