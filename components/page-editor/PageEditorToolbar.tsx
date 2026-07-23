"use client"

type TemplateOption = {
  id: string
  name: string
}

type Props = {
  isEmbedded: boolean
  eventTitle: string
  selectedPageKey: string
  templates: TemplateOption[]
  canUndo: boolean
  canRedo: boolean
  canvasZoom: number
  isMobilePreview: boolean
  isEditing: boolean
  onSelectPage: (pageKey: string) => void
  onSelectTemplate: (templateId: string) => void
  onUndo: () => void
  onRedo: () => void
  onChangeZoom: (zoom: number) => void
  onToggleMobilePreview: () => void
  onToggleEditing: () => void
}

const EXPERIENCE_EDITOR_TOPBAR_CLASS =
  "border-b border-white/[0.07] bg-[linear-gradient(180deg,rgba(6,10,18,0.92),rgba(3,6,13,0.78))] shadow-[0_12px_34px_rgba(0,0,0,0.24)] backdrop-blur-xl"

const EXPERIENCE_EDITOR_PRIMARY_BUTTON_CLASS =
  "rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black shadow-[0_12px_34px_rgba(255,255,255,0.08)] transition hover:bg-white/90"

const EXPERIENCE_EDITOR_GHOST_BUTTON_CLASS =
  "rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm font-semibold text-white/72 transition hover:bg-white/10 hover:text-white"

const EXPERIENCE_EDITOR_SELECT_CLASS =
  "rounded-xl border border-white/10 bg-black/24 px-3 py-2 text-sm text-white/78 outline-none transition hover:border-white/16 focus:border-violet-200/28"

const PAGE_OPTIONS = [
  { label: "Home", value: "event_home" },
  { label: "Lobby", value: "lobby" },
  { label: "Agenda", value: "agenda" },
  { label: "Sessions", value: "sessions" },
  { label: "Breakouts", value: "breakouts" },
  { label: "Sponsors", value: "sponsors" },
  { label: "Engage", value: "chat" },
  { label: "Networking", value: "networking" },
  { label: "On-Demand", value: "on_demand" },
] as const

const ZOOM_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5] as const

export default function PageEditorToolbar({
  isEmbedded,
  eventTitle,
  selectedPageKey,
  templates,
  canUndo,
  canRedo,
  canvasZoom,
  isMobilePreview,
  isEditing,
  onSelectPage,
  onSelectTemplate,
  onUndo,
  onRedo,
  onChangeZoom,
  onToggleMobilePreview,
  onToggleEditing,
}: Props) {
  return (
    <div className={EXPERIENCE_EDITOR_TOPBAR_CLASS}>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-white/40">
              {isEmbedded ? "Experience Builder" : "Page Editor Preview"}
            </div>
            <h1 className="text-xl font-semibold capitalize">
              {isEmbedded ? "Experience Builder" : eventTitle}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedPageKey}
            onChange={(event) => onSelectPage(event.target.value)}
            className={EXPERIENCE_EDITOR_SELECT_CLASS}
          >
            {PAGE_OPTIONS.map((page) => (
              <option key={page.value} value={page.value}>
                {page.label}
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

          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/20 p-1">
            {ZOOM_OPTIONS.map((zoom) => (
              <button
                key={zoom}
                type="button"
                onClick={() => onChangeZoom(zoom)}
                disabled={isMobilePreview}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-black transition ${
                  canvasZoom === zoom && !isMobilePreview
                    ? "bg-white text-black"
                    : isMobilePreview
                      ? "cursor-not-allowed text-white/22"
                      : "text-white/56 hover:bg-white/10 hover:text-white"
                }`}
              >
                {Math.round(zoom * 100)}%
              </button>
            ))}

            <button
              type="button"
              onClick={() => onChangeZoom(1)}
              disabled={isMobilePreview}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-black transition ${
                isMobilePreview
                  ? "cursor-not-allowed text-white/22"
                  : "text-white/56 hover:bg-white/10 hover:text-white"
              }`}
            >
              Fit
            </button>
          </div>

          <button
            onClick={onToggleMobilePreview}
            className={EXPERIENCE_EDITOR_GHOST_BUTTON_CLASS}
          >
            {isMobilePreview ? "Mobile" : "Desktop"}
          </button>

          <button
            onClick={onToggleEditing}
            className={EXPERIENCE_EDITOR_PRIMARY_BUTTON_CLASS}
          >
            {isEditing ? "Close Editor" : "Edit Page"}
          </button>
        </div>
      </div>
    </div>
  )
}
