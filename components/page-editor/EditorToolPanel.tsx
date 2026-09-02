"use client"

import { useRef, useState } from "react"
import type { EditorToolPanel } from "./EditorToolDock"
import type { EventTheme, SystemComponentKey } from "@/lib/page-editor/sectionTypes"

type Template = { id: string; name?: string }
type Asset = { id: string; path: string; url: string; name: string; type: string; trashed?: boolean; originalPath?: string }
type ElementType = "text" | "image" | "pdf" | "video" | "button" | "spacer"
type TextPreset = "heading" | "subheading" | "body"
type SectionPreset = "hero" | "content" | "grid" | "system"

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
  onSetBackground,
  onDeleteAsset,
  onRestoreAsset,
  onPermanentlyDeleteAsset,
  onUpdateTheme,
  onAddApp,
  onAddSection,
  onClose,
}: {
  activePanel: EditorToolPanel
  templates: Template[]
  assets: Asset[]
  eventTheme: EventTheme
  onApplyTemplate: (id: string) => void
  onAddElement: (type: ElementType) => void
  onAddTextPreset: (preset: TextPreset) => void
  onUpload: (file: File, onProgress?: (percent: number) => void) => Promise<void>
  onAddAsset: (asset: Asset) => void
  onSetBackground: (asset: Asset | null) => void
  onDeleteAsset: (asset: Asset) => Promise<void>
  onRestoreAsset: (asset: Asset) => Promise<void>
  onPermanentlyDeleteAsset: (asset: Asset) => Promise<void>
  onUpdateTheme: (theme: Partial<EventTheme>) => void
  onAddApp: (key: SystemComponentKey) => void
  onAddSection: (type: SectionPreset, label: string) => void
  onClose: () => void
}) {
  const uploadRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [designTab, setDesignTab] = useState<"templates" | "layouts">("templates")
  const [templateSearch, setTemplateSearch] = useState("")
  const [mediaTab, setMediaTab] = useState<"library" | "trash">("library")
  const visibleTemplates = templates.filter((template) => (template.name ?? "").toLowerCase().includes(templateSearch.trim().toLowerCase()))

  async function upload(file: File | undefined) {
    if (!file) return
    setUploading(true)
    setUploadProgress(0)
    try { await onUpload(file, setUploadProgress) } finally { setUploading(false) }
  }

  return (
    <aside aria-label={`${activePanel} tools`} className="w-[246px] shrink-0 overflow-y-auto border-r border-white/[0.07] bg-[#0b0e17] p-4">
      <div className="flex items-center justify-between gap-3"><h2 className="text-sm font-bold capitalize text-white">{activePanel}</h2><button type="button" aria-label="Close tool panel" onClick={onClose} className="grid h-7 w-7 place-items-center rounded-lg text-white/40 hover:bg-white/10 hover:text-white">×</button></div>
      <p className="mt-1 text-[11px] leading-5 text-white/40">
        {activePanel === "design" ? "Templates and page appearance." : activePanel === "elements" ? "Add content to the active page." : activePanel === "text" ? "Typography presets and text blocks." : activePanel === "media" ? "Upload and reuse event media." : activePanel === "brand" ? "Apply consistent event colors." : "Add live Jupiter experiences."}
      </p>

      <div className="mt-5 space-y-2">
        {activePanel === "design" ? <>
          <div className="grid grid-cols-2 border-b border-white/10">{(["templates", "layouts"] as const).map((tab) => <button key={tab} type="button" aria-pressed={designTab === tab} onClick={() => setDesignTab(tab)} className={`border-b-2 px-2 py-2 text-xs font-semibold capitalize ${designTab === tab ? "border-violet-400 text-white" : "border-transparent text-white/40"}`}>{tab}</button>)}</div>
          {designTab === "templates" ? <>
            <input aria-label="Search templates" type="search" placeholder="Search templates" value={templateSearch} onChange={(event) => setTemplateSearch(event.target.value)} className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-xs text-white outline-none focus:border-violet-300/40" />
            <PanelLabel>All templates</PanelLabel>
            {visibleTemplates.length ? visibleTemplates.map((template) => <button key={template.id} type="button" className={`${CONTROL} overflow-hidden p-0`} onClick={() => { if (window.confirm(`Apply “${template.name || "Untitled template"}” to this page? You can undo this change.`)) onApplyTemplate(template.id) }}><span className="block h-20 bg-[radial-gradient(circle_at_75%_35%,rgba(139,92,246,.65),transparent_30%),linear-gradient(135deg,#071426,#101328)]" /><span className="block px-3 py-2">{template.name || "Untitled template"}</span></button>) : <Empty>No matching templates.</Empty>}
          </> : <>
            <PanelLabel>Page sections</PanelLabel>
            <div className="grid grid-cols-2 gap-2">{([['hero','Hero'],['content','CTA'],['grid','Features'],['grid','Stats'],['system','Agenda'],['system','Speakers'],['system','Sponsors'],['system','Resources']] as Array<[SectionPreset,string]>).map(([type,label]) => <button key={label} type="button" className={CONTROL} onClick={() => onAddSection(type,label)}>{label}</button>)}</div>
          </>}
          <PanelLabel>Canvas color</PanelLabel>
          <ColorControl label="Background" value={eventTheme.pageBackgroundColor ?? "#020617"} onChange={(value) => onUpdateTheme({ pageBackgroundColor: value })} />
          <ColorControl label="Panel" value={eventTheme.panelBackgroundColor ?? "#0f172a"} onChange={(value) => onUpdateTheme({ panelBackgroundColor: value })} />
          {eventTheme.pageBackgroundImageUrl ? <><PanelLabel>Background image</PanelLabel><select aria-label="Background image fit" value={eventTheme.pageBackgroundImageFit ?? "cover"} onChange={(event) => onUpdateTheme({ pageBackgroundImageFit: event.target.value as "cover" | "contain" })} className={CONTROL}><option value="cover">Cover canvas</option><option value="contain">Contain image</option></select><select aria-label="Background image position" value={eventTheme.pageBackgroundImagePosition ?? "center"} onChange={(event) => onUpdateTheme({ pageBackgroundImagePosition: event.target.value })} className={CONTROL}>{["center","top","bottom","left","right"].map((position) => <option key={position} value={position}>{position}</option>)}</select><label className="block text-[10px] text-white/45">Overlay · {Math.round(Number(eventTheme.pageBackgroundOverlay ?? 0.28) * 100)}%<input aria-label="Background overlay" type="range" min="0" max="0.9" step="0.05" value={Number(eventTheme.pageBackgroundOverlay ?? 0.28)} onChange={(event) => onUpdateTheme({ pageBackgroundOverlay: Number(event.target.value) })} className="mt-2 w-full accent-violet-500" /></label><button type="button" className={CONTROL} onClick={() => onSetBackground(null)}>Remove background image</button></> : null}
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
          <button type="button" disabled={uploading} className={`${CONTROL} text-center disabled:cursor-wait disabled:opacity-50`} onClick={() => uploadRef.current?.click()}>{uploading ? `Uploading… ${uploadProgress}%` : "Upload media"}</button>
          {uploading ? <div role="progressbar" aria-label="Media upload progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={uploadProgress} className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-violet-500 transition-[width]" style={{ width: `${uploadProgress}%` }} /></div> : null}
          <div className="grid grid-cols-2 border-b border-white/10">{(["library", "trash"] as const).map((tab) => <button key={tab} type="button" aria-pressed={mediaTab === tab} onClick={() => setMediaTab(tab)} className={`border-b-2 px-2 py-2 text-xs font-semibold capitalize ${mediaTab === tab ? "border-violet-400 text-white" : "border-transparent text-white/40"}`}>{tab}</button>)}</div>
          {assets.filter((asset) => Boolean(asset.trashed) === (mediaTab === "trash")).length ? assets.filter((asset) => Boolean(asset.trashed) === (mediaTab === "trash")).slice().reverse().slice(0, 100).map((asset) => <div key={asset.path} className="flex items-stretch gap-1 rounded-xl border border-white/10 bg-white/[0.035] p-1"><button type="button" disabled={asset.trashed} className="min-w-0 flex-1 rounded-lg px-2 py-2 text-left text-xs font-semibold text-white/75 hover:bg-violet-400/10 disabled:cursor-default disabled:hover:bg-transparent" onClick={() => onAddAsset(asset)}><span className="block truncate">{asset.name}</span><span className="mt-0.5 block truncate text-[9px] uppercase text-white/35">{asset.type}</span></button>{!asset.trashed && asset.type.startsWith("image/") ? <button type="button" aria-label={`Set ${asset.name} as page background`} title="Set as page background" className="rounded-lg px-2 text-[10px] font-bold text-violet-200/70 hover:bg-violet-400/15" onClick={() => onSetBackground(asset)}>BG</button> : null}{asset.trashed ? <><button type="button" aria-label={`Restore ${asset.name}`} className="rounded-lg px-2 text-[10px] font-bold text-emerald-200/70 hover:bg-emerald-400/15" onClick={() => { void onRestoreAsset(asset) }}>Restore</button><button type="button" aria-label={`Permanently delete ${asset.name}`} className="rounded-lg px-2 text-[10px] font-bold text-red-200/60 hover:bg-red-400/15" onClick={() => { void onPermanentlyDeleteAsset(asset) }}>Delete</button></> : <button type="button" aria-label={`Move ${asset.name} to Trash`} title="Move uploaded asset to Trash" className="rounded-lg px-2 text-[10px] font-bold text-red-200/60 hover:bg-red-400/15 hover:text-red-100" onClick={() => { void onDeleteAsset(asset) }}>Trash</button>}</div>) : <Empty>{mediaTab === "trash" ? "Trash is empty." : "Uploaded media will appear here."}</Empty>}
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
function ColorControl({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const normalizedValue = /^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"
  const [edit, setEdit] = useState<{ base: string; draft: string } | null>(null)
  const draft = edit?.base === normalizedValue ? edit.draft : normalizedValue
  const setDraft = (next: string) => setEdit({ base: normalizedValue, draft: next })
  const valid = /^#[0-9a-f]{6}$/i.test(draft)
  return <div className="rounded-xl border border-white/10 bg-white/[0.035] p-2.5 text-xs text-white/60"><div className="flex items-center justify-between gap-2"><span>{label}</span><input aria-label={`${label} picker`} type="color" value={valid ? draft : normalizedValue} onChange={(event) => setDraft(event.target.value)} className="h-7 w-9 cursor-pointer border-0 bg-transparent p-0" /></div><div className="mt-2 flex gap-1.5"><input aria-label={`${label} hex value`} value={draft} onChange={(event) => setDraft(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/25 px-2 py-1.5 font-mono text-[11px] uppercase text-white/70" /><button type="button" disabled={!valid || draft.toLowerCase() === normalizedValue.toLowerCase()} onClick={() => onChange(draft)} className="rounded-lg bg-violet-500 px-2.5 py-1.5 text-[10px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-30">Apply</button></div></div>
}
