"use client"

import Link from "next/link"
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
  "relative z-40 shrink-0 border-b border-white/[0.07] bg-[linear-gradient(180deg,rgba(6,10,18,0.92),rgba(3,6,13,0.78))] shadow-[0_12px_34px_rgba(0,0,0,0.24)] backdrop-blur-xl"

const EXPERIENCE_EDITOR_PRIMARY_BUTTON_CLASS =
  "rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black shadow-[0_12px_34px_rgba(255,255,255,0.08)] transition hover:bg-white/90"

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

export default function PageEditorToolbar({
  isEmbedded,
  eventTitle,
  eventAdminHref,
  selectedPageKey,
  pages,
  templates,
  canUndo,
  canRedo,
  canvasZoom,
  isMobilePreview,
  previewDevice,
  isEditing,
  isCodeEditorOpen,
  selectedElementCount,
  canGroupElements,
  canUngroupElements,
  showGrid,
  showRulers,
  canCopyStyle,
  canPasteStyle,
  saveStatus,
  eventStage,
  onSelectPage,
  onSelectTemplate,
  onUndo,
  onRedo,
  onChangeZoom,
  onChangePreviewDevice,
  onToggleEditing,
  onToggleCodeEditor,
  onToggleGrid,
  onToggleRulers,
  onCopyStyle,
  onPasteStyle,
  onAlignElements,
  onGroupElements,
  onUngroupElements,
  onPreview,
  onShare,
  onPublish,
}: Props) {
  return (
    <div className={EXPERIENCE_EDITOR_TOPBAR_CLASS}>
      <div className="flex min-h-[72px] items-center justify-between gap-4 px-5 py-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2 text-xs font-semibold text-white/60">
            {!isEmbedded ? <Link href="/admin/events" className="hover:text-white">Events</Link> : <span>Experience Builder</span>}
            <span className="text-white/25">›</span>
            {eventAdminHref ? <Link href={eventAdminHref} className="max-w-[260px] truncate text-white/80 hover:text-white">{eventTitle}</Link> : <span className="max-w-[260px] truncate text-white/80">{eventTitle}</span>}
            <span className="text-white/25">›</span>
            <span className="capitalize text-white">{pages.find((page) => page.pageKey === selectedPageKey)?.title ?? EDITOR_PAGES.find((page) => page.value === selectedPageKey)?.label ?? selectedPageKey}</span>
          </div>
          <div className="mt-2 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.12em]">
            <span className={`rounded-full border px-2 py-1 ${eventStage === "live" ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-200" : eventStage === "archived" ? "border-white/10 bg-white/5 text-white/45" : "border-amber-300/20 bg-amber-400/10 text-amber-100"}`}>{eventStage === "live" ? "Live" : eventStage === "archived" ? "Archived" : "Build"}</span>
            <span className="normal-case tracking-normal text-white/38">{saveStatus}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <select
            value={selectedPageKey}
            onChange={(event) => onSelectPage(event.target.value)}
            className={EXPERIENCE_EDITOR_SELECT_CLASS}
          >
            {pages.map((page) => (
              <option key={page.pageKey} value={page.pageKey}>
                {page.title}
              </option>
            ))}
          </select>

          <select
            onChange={(event) => onSelectTemplate(event.target.value)}
            className={EXPERIENCE_EDITOR_SELECT_CLASS}
          >
            <option value="">Apply Template</option>

            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                canUndo
                  ? "border-white/10 bg-black/20 text-white/70 hover:bg-white/10 hover:text-white"
                  : "cursor-not-allowed border-white/5 bg-white/[0.025] text-white/28"
              }`}
            >
              Undo
            </button>

            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                canRedo
                  ? "border-white/10 bg-black/20 text-white/70 hover:bg-white/10 hover:text-white"
                  : "cursor-not-allowed border-white/5 bg-white/[0.025] text-white/28"
              }`}
            >
              Redo
            </button>
          </div>

          <select aria-label="Canvas zoom" value={canvasZoom} onChange={(event) => onChangeZoom(Number(event.target.value))} disabled={isMobilePreview} className={EXPERIENCE_EDITOR_SELECT_CLASS}>{ZOOM_OPTIONS.map((zoom) => <option key={zoom} value={zoom}>{Math.round(zoom * 100)}%</option>)}</select>

          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/20 p-1">
            <button
              type="button"
              onClick={onToggleGrid}
              title="Toggle grid (G)"
              className={`rounded-lg px-2.5 py-1.5 text-xs font-black transition ${
                showGrid
                  ? "bg-white text-black"
                  : "text-white/56 hover:bg-white/10 hover:text-white"
              }`}
            >
              Grid
            </button>
            <button
              type="button"
              onClick={onToggleRulers}
              title="Toggle rulers (R)"
              className={`rounded-lg px-2.5 py-1.5 text-xs font-black transition ${
                showRulers
                  ? "bg-white text-black"
                  : "text-white/56 hover:bg-white/10 hover:text-white"
              }`}
            >
              Rulers
            </button>
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/20 p-1" aria-label="Preview device">
            {(["desktop", "tablet", "mobile"] as const).map((device) => (
              <button
                key={device}
                type="button"
                aria-pressed={previewDevice === device}
                onClick={() => onChangePreviewDevice(device)}
                className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold capitalize transition ${previewDevice === device ? "bg-white text-black" : "text-white/52 hover:bg-white/10 hover:text-white"}`}
              >
                {device}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onToggleCodeEditor}
            className={
              isCodeEditorOpen
                ? "rounded-xl border border-violet-300/25 bg-violet-400/15 px-4 py-2 text-sm font-semibold text-violet-50 shadow-[0_0_24px_rgba(139,92,246,0.12)]"
                : EXPERIENCE_EDITOR_GHOST_BUTTON_CLASS
            }
          >
            {isCodeEditorOpen ? "Close Code" : "HTML + CSS"}
          </button>

          <button type="button" onClick={onPreview} className={EXPERIENCE_EDITOR_GHOST_BUTTON_CLASS}>Preview</button>
          <button type="button" onClick={onShare} className={EXPERIENCE_EDITOR_GHOST_BUTTON_CLASS}>Share</button>
          <button type="button" onClick={onPublish} className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(124,58,237,0.28)] transition hover:bg-violet-500">Publish</button>

          <button
            onClick={onToggleEditing}
            disabled={isCodeEditorOpen}
            className={`${EXPERIENCE_EDITOR_PRIMARY_BUTTON_CLASS} disabled:cursor-not-allowed disabled:opacity-35`}
          >
            {isCodeEditorOpen
              ? "Visual Editor"
              : isEditing
                ? "Close Editor"
                : "Edit Page"}
          </button>
        </div>
      </div>

      {isEditing && selectedElementCount > 0 ? (
        <div className="border-t border-white/[0.06] bg-black/15">
          <div className="mx-auto flex max-w-7xl items-center gap-2 px-6 py-2">
            <span className="mr-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/38">
              Align{selectedElementCount > 1 ? ` · ${selectedElementCount}` : ""}
            </span>
            {ALIGNMENT_ACTIONS.map((action) => (
              <button
                key={action.command}
                type="button"
                onClick={() => onAlignElements(action.command)}
                className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-[10px] font-bold text-white/62 transition hover:bg-white/10 hover:text-white"
              >
                {action.label}
              </button>
            ))}
            {selectedElementCount === 1
              ? SINGLE_ELEMENT_ALIGNMENT_ACTIONS.map((action) => (
                  <button
                    key={action.command}
                    type="button"
                    onClick={() => onAlignElements(action.command)}
                    className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-[10px] font-bold text-white/62 transition hover:bg-white/10 hover:text-white"
                  >
                    {action.label}
                  </button>
                ))
              : null}
            {selectedElementCount >= 3
              ? DISTRIBUTION_ACTIONS.map((action) => (
                  <button
                    key={action.command}
                    type="button"
                    onClick={() => onAlignElements(action.command)}
                    className="rounded-lg border border-fuchsia-300/15 bg-fuchsia-400/10 px-2.5 py-1.5 text-[10px] font-bold text-fuchsia-50/70 transition hover:bg-fuchsia-400/20 hover:text-white"
                  >
                    {action.label}
                  </button>
                ))
              : null}
            {canGroupElements ? (
              <button
                type="button"
                onClick={onGroupElements}
                className="ml-1 rounded-lg border border-emerald-300/15 bg-emerald-400/10 px-2.5 py-1.5 text-[10px] font-bold text-emerald-50/70 transition hover:bg-emerald-400/20 hover:text-white"
              >
                Group
              </button>
            ) : null}
            {canUngroupElements ? (
              <button
                type="button"
                onClick={onUngroupElements}
                className="ml-1 rounded-lg border border-amber-300/15 bg-amber-400/10 px-2.5 py-1.5 text-[10px] font-bold text-amber-50/70 transition hover:bg-amber-400/20 hover:text-white"
              >
                Ungroup
              </button>
            ) : null}
            {canCopyStyle ? (
              <button
                type="button"
                onClick={onCopyStyle}
                title="Copy style (Cmd+Shift+C)"
                className="ml-1 rounded-lg border border-sky-300/15 bg-sky-400/10 px-2.5 py-1.5 text-[10px] font-bold text-sky-50/70 transition hover:bg-sky-400/20 hover:text-white"
              >
                Copy Style
              </button>
            ) : null}
            {canPasteStyle ? (
              <button
                type="button"
                onClick={onPasteStyle}
                title="Paste style (Cmd+Shift+V)"
                className="ml-1 rounded-lg border border-violet-300/15 bg-violet-400/10 px-2.5 py-1.5 text-[10px] font-bold text-violet-50/70 transition hover:bg-violet-400/20 hover:text-white"
              >
                Paste Style
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
