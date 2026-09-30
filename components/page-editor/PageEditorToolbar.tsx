"use client"

import Link from "next/link"
import { ArrowLeft, Monitor, Smartphone, Tablet, Undo2, Redo2 } from "lucide-react"
import type { ElementAlignmentCommand } from "./elementAlignmentCommands"
import { EDITOR_PAGES } from "./editorPages"
import type { EditorPageManifestItem } from "./PageFilmstrip"

type TemplateOption = {
  id: string
  name: string
}

type Props = {
  isEmbedded: boolean
  eventTitle: string
  eventAdminHref: string | null
  selectedPageKey: string
  pages: EditorPageManifestItem[]
  templates: TemplateOption[]
  canUndo: boolean
  canRedo: boolean
  canvasZoom: number
  isMobilePreview: boolean
  previewDevice: "desktop" | "tablet" | "mobile"
  isEditing: boolean
  isCodeEditorOpen: boolean
  selectedElementCount: number
  canGroupElements: boolean
  canUngroupElements: boolean
  showGrid?: boolean
  showRulers?: boolean
  canCopyStyle?: boolean
  canPasteStyle?: boolean
  saveStatus: string
  eventStage: string
  onSelectPage: (pageKey: string) => void
  onSelectTemplate: (templateId: string) => void
  onUndo: () => void
  onRedo: () => void
  onChangeZoom: (zoom: number) => void
  onChangePreviewDevice: (device: "desktop" | "tablet" | "mobile") => void
  onToggleEditing: () => void
  onToggleCodeEditor: () => void
  onToggleGrid?: () => void
  onToggleRulers?: () => void
  onCopyStyle?: () => void
  onPasteStyle?: () => void
  onAlignElements: (command: ElementAlignmentCommand) => void
  onGroupElements: () => void
  onUngroupElements: () => void
  onPreview: () => void
  onShare: () => void
  onPublish: () => void
}

const EXPERIENCE_EDITOR_TOPBAR_CLASS =
  "relative z-40 w-full min-w-0 max-w-full shrink-0 border-b border-white/[0.07] bg-[linear-gradient(180deg,rgba(6,10,18,0.92),rgba(3,6,13,0.78))] shadow-[0_12px_34px_rgba(0,0,0,0.24)] backdrop-blur-xl"

const EXPERIENCE_EDITOR_GHOST_BUTTON_CLASS =
  "rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm font-semibold text-white/72 transition hover:bg-white/10 hover:text-white"

const EXPERIENCE_EDITOR_SELECT_CLASS =
  "rounded-xl border border-white/10 bg-black/24 px-3 py-2 text-sm text-white/78 outline-none transition hover:border-white/16 focus:border-violet-200/28"

const ZOOM_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5] as const
const ALIGNMENT_ACTIONS: Array<{
  label: string
  command: ElementAlignmentCommand
}> = [
  { label: "Left", command: "align-left" },
  { label: "H Center", command: "align-horizontal-center" },
  { label: "Right", command: "align-right" },
  { label: "Top", command: "align-top" },
  { label: "V Center", command: "align-vertical-center" },
  { label: "Bottom", command: "align-bottom" },
]
const SINGLE_ELEMENT_ALIGNMENT_ACTIONS: Array<{
  label: string
  command: ElementAlignmentCommand
}> = [
  { label: "Center in Section", command: "center-in-section" },
  { label: "Center on Page", command: "center-on-page" },
]
const DISTRIBUTION_ACTIONS: Array<{
  label: string
  command: ElementAlignmentCommand
}> = [
  { label: "Distribute H", command: "distribute-horizontally" },
  { label: "Distribute V", command: "distribute-vertically" },
]

export default function PageEditorToolbar(props: Props) {
  const pageTitle = props.pages.find((page) => page.pageKey === props.selectedPageKey)?.title
    ?? EDITOR_PAGES.find((page) => page.value === props.selectedPageKey)?.label
    ?? props.selectedPageKey
  const alignmentActions = [
    ...ALIGNMENT_ACTIONS,
    ...(props.selectedElementCount === 1 ? SINGLE_ELEMENT_ALIGNMENT_ACTIONS : []),
    ...(props.selectedElementCount >= 3 ? DISTRIBUTION_ACTIONS : []),
  ]
  return (
    <header className={EXPERIENCE_EDITOR_TOPBAR_CLASS}>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 px-5 py-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            {props.eventAdminHref ? <Link href={`${props.eventAdminHref}/page-editor`} aria-label="Back to Experience" className="rounded-lg p-2 text-white/55 hover:bg-white/10 hover:text-white"><ArrowLeft className="h-4 w-4" /></Link> : null}
            <div><h1 className="text-sm font-semibold text-white">Experience Builder</h1><p className="max-w-[300px] truncate text-xs text-white/50">{props.eventTitle}</p></div>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] capitalize text-white/55">{props.eventStage === "live" ? "Event live" : props.eventStage === "archived" ? "Archived" : "Event setup"}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={props.onShare} className={EXPERIENCE_EDITOR_GHOST_BUTTON_CLASS}>Share</button>
          <button type="button" disabled={props.isCodeEditorOpen} onClick={props.onPreview} className={`${EXPERIENCE_EDITOR_GHOST_BUTTON_CLASS} disabled:opacity-35`}>{props.isEditing ? "Preview" : "Back to editor"}</button>
          <button type="button" onClick={props.onPublish} className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(124,58,237,0.28)] transition hover:bg-violet-500">Publishing settings</button>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] bg-black/15 px-5 py-2">
        <div className="flex flex-wrap items-center gap-3 text-xs"><span className="font-semibold text-white/80">{pageTitle}</span><span role="status" className="text-white/60">{props.saveStatus}</span><span className="text-[11px] text-amber-100/65">Autosave updates the attendee page</span></div>
        <div className="flex flex-wrap items-center gap-2">
          {props.isEditing ? <><button type="button" aria-label="Undo" onClick={props.onUndo} disabled={!props.canUndo} className="rounded-lg p-2 text-white/65 hover:bg-white/10 disabled:opacity-25"><Undo2 className="h-4 w-4" /></button><button type="button" aria-label="Redo" onClick={props.onRedo} disabled={!props.canRedo} className="rounded-lg p-2 text-white/65 hover:bg-white/10 disabled:opacity-25"><Redo2 className="h-4 w-4" /></button></> : null}
          <div className="flex gap-1 rounded-xl border border-white/10 bg-black/20 p-1" aria-label="Preview device">
            {([{ device: "desktop", Icon: Monitor }, { device: "tablet", Icon: Tablet }, { device: "mobile", Icon: Smartphone }] as const).map(({ device, Icon }) => <button key={device} type="button" aria-label={`${device} preview`} aria-pressed={props.previewDevice === device} onClick={() => props.onChangePreviewDevice(device)} className={`rounded-lg p-2 transition ${props.previewDevice === device ? "bg-white text-black" : "text-white/55 hover:bg-white/10 hover:text-white"}`}><Icon className="h-4 w-4" /></button>)}
          </div>
          <select aria-label="Canvas zoom" value={props.canvasZoom} onChange={(event) => props.onChangeZoom(Number(event.target.value))} disabled={props.isMobilePreview} className={EXPERIENCE_EDITOR_SELECT_CLASS}>{ZOOM_OPTIONS.map((zoom) => <option key={zoom} value={zoom}>{Math.round(zoom * 100)}%</option>)}</select>
          {props.isCodeEditorOpen ? <button type="button" onClick={props.onToggleCodeEditor} className={EXPERIENCE_EDITOR_GHOST_BUTTON_CLASS}>Close code</button> : null}
        </div>
      </div>
      {props.isEditing || props.isCodeEditorOpen ? <details className="border-t border-white/[0.06] px-5 py-2">
        <summary className="w-fit cursor-pointer rounded-md text-xs font-semibold text-white/50 hover:text-white">Advanced layout</summary>
        <div className="mt-3 flex flex-wrap items-center gap-2 pb-2">
          <button type="button" aria-pressed={Boolean(props.showGrid)} onClick={props.onToggleGrid} className={EXPERIENCE_EDITOR_GHOST_BUTTON_CLASS}>Grid {props.showGrid ? "on" : "off"}</button>
          <button type="button" aria-pressed={Boolean(props.showRulers)} onClick={props.onToggleRulers} className={EXPERIENCE_EDITOR_GHOST_BUTTON_CLASS}>Rulers {props.showRulers ? "on" : "off"}</button>
          <button type="button" onClick={props.onToggleCodeEditor} className={EXPERIENCE_EDITOR_GHOST_BUTTON_CLASS}>{props.isCodeEditorOpen ? "Close code" : "HTML + CSS"}</button>
          <select aria-label="Apply page template" value="" onChange={(event) => props.onSelectTemplate(event.target.value)} className={EXPERIENCE_EDITOR_SELECT_CLASS}><option value="">Apply template</option>{props.templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select>
          {props.selectedElementCount > 0 ? <div className="flex w-full flex-wrap items-center gap-2 border-t border-white/10 pt-3"><span className="text-xs text-white/45">Selection · {props.selectedElementCount}</span>{alignmentActions.map((action) => <button key={action.command} type="button" onClick={() => props.onAlignElements(action.command)} className={EXPERIENCE_EDITOR_GHOST_BUTTON_CLASS}>{action.label}</button>)}
            {props.canGroupElements ? <button type="button" onClick={props.onGroupElements} className={EXPERIENCE_EDITOR_GHOST_BUTTON_CLASS}>Group</button> : null}
            {props.canUngroupElements ? <button type="button" onClick={props.onUngroupElements} className={EXPERIENCE_EDITOR_GHOST_BUTTON_CLASS}>Ungroup</button> : null}
            {props.canCopyStyle ? <button type="button" onClick={props.onCopyStyle} className={EXPERIENCE_EDITOR_GHOST_BUTTON_CLASS}>Copy style</button> : null}
            {props.canPasteStyle ? <button type="button" onClick={props.onPasteStyle} className={EXPERIENCE_EDITOR_GHOST_BUTTON_CLASS}>Paste style</button> : null}
          </div> : null}
        </div>
      </details> : null}
    </header>
  )
}
