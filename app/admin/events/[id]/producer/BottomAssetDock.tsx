
import { useEffect, useState } from "react"
import type { JSX } from "react"
import type { PreviewBlock } from "./useProducerBlocks"
import {
  FALLBACK_GRAPHICS_ITEMS,
  FALLBACK_MEDIA_ITEMS,
  TRANSITION_DURATIONS,
  TRANSITION_PRESETS,
  type DockAsset,
  type SceneSummary,
} from "./assetDockTypes"
import {
  DockSection,
  KeyboardShortcutsPanel,
  TallyIndicators,
} from "./AssetDockChrome"

function SceneBlockPreview({ block }: { block: PreviewBlock }): JSX.Element {
  const left = `${Math.max(0, Math.min(100, block.x ?? 0))}%`
  const top = `${Math.max(0, Math.min(100, block.y ?? 0))}%`
  const width = `${Math.max(6, Math.min(100, block.width ?? 20))}%`
  const height = `${Math.max(6, Math.min(100, block.height ?? 12))}%`

  const tone =
    block.type === "text"
      ? "border-sky-200/35 bg-sky-300/18"
      : block.type === "video"
        ? "border-emerald-200/35 bg-emerald-300/18"
        : block.type === "image"
          ? "border-violet-200/35 bg-violet-300/18"
          : "border-amber-200/35 bg-amber-300/18"

  return (
    <div
      className={`absolute rounded-[3px] border ${tone} shadow-[0_0_8px_rgba(255,255,255,0.08)]`}
      style={{ left, top, width, height }}
    />
  )
}

function SceneMiniVisualizer({ scene }: { scene: SceneSummary }): JSX.Element {
  const preset = scene.screenLayoutPreset ?? null
  const blocks = scene.previewBlocks?.slice(0, 5) ?? []

  const label =
    preset === "fullscreen"
      ? "Full"
      : preset === "speaker_focus"
        ? "Speaker"
        : preset === "brand"
          ? "Brand"
          : "Classic"

  const baseClass =
    preset === "brand"
      ? "relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-[radial-gradient(circle_at_25%_25%,rgba(168,85,247,0.24),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(2,6,23,0.98))] shadow-[inset_0_1px_0_rgba(255,255,255,0.055)] transition group-hover:border-violet-200/25 group-hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_18px_rgba(168,85,247,0.12)]"
      : "relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.95),rgba(2,6,23,0.98))] shadow-[inset_0_1px_0_rgba(255,255,255,0.055)] transition group-hover:border-violet-200/25 group-hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_18px_rgba(168,85,247,0.12)]"

  return (
    <div className={baseClass}>
      {preset === "fullscreen" ? (
        <div className="absolute inset-1 rounded-lg border border-sky-200/20 bg-sky-400/16" />
      ) : preset === "speaker_focus" ? (
        <>
          <div className="absolute inset-y-1 left-1 w-[62%] rounded-lg border border-sky-200/18 bg-sky-400/12" />
          <div className="absolute right-1 top-1 h-[44%] w-[30%] rounded-lg border border-violet-200/18 bg-violet-400/14" />
        </>
      ) : preset === "brand" ? (
        <>
          <div className="absolute left-1 top-1 h-[58%] w-[58%] rounded-lg border border-sky-200/18 bg-sky-400/12" />
          <div className="absolute bottom-1 right-1 h-[34%] w-[34%] rounded-lg border border-violet-200/18 bg-violet-400/14" />
        </>
      ) : (
        <>
          <div className="absolute left-1 top-1 h-[46%] w-[46%] rounded-lg border border-sky-200/18 bg-sky-400/12" />
          <div className="absolute right-1 top-1 h-[46%] w-[46%] rounded-lg border border-violet-200/18 bg-violet-400/14" />
          <div className="absolute bottom-1 left-1 h-[32%] w-[46%] rounded-lg border border-white/10 bg-white/[0.055]" />
        </>
      )}

      {blocks.map((block) => (
        <SceneBlockPreview key={block.id} block={block} />
      ))}

      <div className="absolute bottom-1 right-1 rounded-md bg-black/45 px-1 py-0.5 text-[7px] font-black uppercase tracking-[0.1em] text-white/60">
        {label}
      </div>
    </div>
  )
}


function SceneTile({
  scene,
  index,
  isActive,
  isProgramLive,
  isHotkeyTriggered,
  onApplyScene,
  onDoubleClickScene,
  onDeleteScene,
}: {
  scene: SceneSummary
  index: number
  isActive: boolean
  isProgramLive: boolean
  isHotkeyTriggered: boolean
  onApplyScene?: (sceneId: string) => void
  onDoubleClickScene?: (sceneId: string) => void
  onDeleteScene?: (sceneId: string) => void
}): JSX.Element {
  const [confirmDelete, setConfirmDelete] = useState(false)
  return (
    <button
      type="button"
      onClick={() => onApplyScene?.(scene.id)}
      onDoubleClick={() => onDoubleClickScene?.(scene.id)}
      className={`group relative min-w-[96px] rounded-[16px] border p-1.5 text-left transition duration-200 ${
        isHotkeyTriggered
          ? "-translate-y-0.5 border-amber-200/70 bg-amber-300/14 shadow-[0_0_34px_rgba(251,191,36,0.32)]"
          : isActive
            ? "border-violet-300/60 bg-violet-400/12 shadow-[0_0_24px_rgba(168,85,247,0.22)]"
            : "border-white/10 bg-white/[0.035]"
      } hover:-translate-y-0.5 hover:border-violet-300/40 hover:bg-violet-400/10 hover:shadow-[0_0_20px_rgba(168,85,247,0.18)] active:translate-y-0`}
    >
      {isHotkeyTriggered ? (
        <div className="absolute inset-0 rounded-[16px] border border-amber-200/50 shadow-[inset_0_0_18px_rgba(251,191,36,0.18)]" />
      ) : null}
      {isActive ? (
        <div className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-violet-300 shadow-[0_0_10px_rgba(196,181,253,0.95)]" />
      ) : null}

      {isProgramLive ? (
        <div className="absolute left-1.5 bottom-[46px] z-10 rounded-md border border-red-300/30 bg-red-500/20 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.1em] text-red-100 shadow-[0_0_14px_rgba(248,113,113,0.18)]">
          Program
        </div>
      ) : null}

      {onDeleteScene ? (
        <>
          <span
            role="button"
            tabIndex={0}
            aria-label={`Delete ${scene.name}`}
            onClick={(event) => {
              event.stopPropagation()
              setConfirmDelete(true)
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return
              event.preventDefault()
              event.stopPropagation()
              setConfirmDelete(true)
            }}
            className="absolute right-1.5 top-1.5 z-20 flex h-5 w-5 items-center justify-center rounded-full border border-red-300/40 bg-red-500/80 text-[11px] font-black leading-none text-white shadow-[0_0_16px_rgba(248,113,113,0.28)] transition hover:bg-red-400"
          >
            ×
          </span>

          {confirmDelete ? (
            <div
              className="absolute inset-1 z-30 flex flex-col justify-center rounded-[14px] border border-red-300/30 bg-slate-950/92 p-2 text-center shadow-[0_20px_50px_rgba(0,0,0,0.45)] backdrop-blur"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="text-[9px] font-black uppercase tracking-[0.16em] text-red-100/85">
                Delete scene?
              </div>

              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    setConfirmDelete(false)
                  }}
                  className="rounded-lg border border-white/10 bg-white/[0.06] px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/65 transition hover:bg-white/[0.1]"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    onDeleteScene(scene.id)
                    setConfirmDelete(false)
                  }}
                  className="rounded-lg border border-red-300/35 bg-red-500/25 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-red-100 transition hover:bg-red-500/40"
                >
                  Delete
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
      <div className="absolute left-1.5 top-1.5 rounded-md border border-white/10 bg-black/45 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.1em] text-white/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
        {index + 1}
      </div>

      <div className="absolute bottom-[46px] right-1.5 z-10 rounded-md border border-violet-200/20 bg-black/55 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.08em] text-violet-100/75 shadow-[0_0_12px_rgba(168,85,247,0.12)]">
        ⇧{index + 1}
      </div>
      <SceneMiniVisualizer scene={scene} />
      <div className="mt-1.5 flex items-center justify-between gap-1 text-[9px] font-black uppercase tracking-[0.16em] text-white/35">
        <span>Scene {index + 1}</span>
        <span className="rounded border border-white/10 bg-white/[0.045] px-1 py-0.5 text-[7px] tracking-[0.08em] text-white/45">
          {index + 1}
        </span>
      </div>
      <div
        className={`mt-0.5 truncate text-[11px] font-semibold group-hover:text-violet-100${
          isActive ? " text-violet-100" : ""
        }`}
      >
        {scene.name}
      </div>
    </button>
  )
}

function GraphicTile({ item }: { item: DockAsset }): JSX.Element {
  return (
    <button
      type="button"
      className="group min-w-[96px] rounded-[16px] border border-white/10 bg-white/[0.035] p-1.5 text-left transition duration-200 hover:-translate-y-0.5 hover:border-sky-300/35 hover:bg-sky-400/10 hover:shadow-[0_0_18px_rgba(14,165,233,0.14)] active:translate-y-0"
    >
      <div className="flex aspect-video items-end rounded-xl border border-white/10 bg-[linear-gradient(135deg,rgba(14,165,233,0.18),rgba(15,23,42,0.9))] shadow-[inset_0_1px_0_rgba(255,255,255,0.055)] transition group-hover:border-sky-200/25 p-2">
        <div className="h-4 w-16 rounded-md bg-white/80" />
      </div>
      <div className="mt-1.5 truncate text-[11px] font-semibold text-white/78">
        {item.label || "Graphic"}
      </div>
    </button>
  )
}

function MediaTile({
  item,
  index,
}: {
  item: DockAsset
  index: number
}): JSX.Element {
  return (
    <button
      type="button"
      className="group min-w-[96px] rounded-[16px] border border-white/10 bg-white/[0.035] p-1.5 text-left transition duration-200 hover:-translate-y-0.5 hover:border-emerald-300/35 hover:bg-emerald-400/10 hover:shadow-[0_0_18px_rgba(52,211,153,0.13)] active:translate-y-0"
    >
      <div className="relative aspect-video rounded-xl border border-white/10 bg-[radial-gradient(circle_at_50%_50%,rgba(52,211,153,0.22),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.9),rgba(2,6,23,0.95))] shadow-[inset_0_1px_0_rgba(255,255,255,0.055)] transition group-hover:border-emerald-200/25">
        <div className="absolute bottom-1 right-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[8px] font-black text-white/60">
          0{index}:15
        </div>
      </div>
      <div className="mt-1.5 truncate text-[11px] font-semibold text-white/78">
        {item.label || "Media"}
      </div>
    </button>
  )
}

// --- View/List Toggle and List Row Components ---
type DockViewMode = "icons" | "list"

function ViewToggle({
  value,
  onChange,
}: {
  value: DockViewMode
  onChange: (value: DockViewMode) => void
}): JSX.Element {
  return (
    <div className="mb-2 flex items-center gap-1 rounded-full border border-white/10 bg-black/25 p-1">
      {(["icons", "list"] as DockViewMode[]).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          className={`rounded-full px-2 py-1 text-[8px] font-black uppercase tracking-[0.14em] transition ${
            value === mode
              ? "bg-white/16 text-white"
              : "text-white/38 hover:bg-white/[0.06] hover:text-white/65"
          }`}
        >
          {mode}
        </button>
      ))}
    </div>
  )
}

function SceneListRow({
  scene,
  index,
  isActive,
  isProgramLive,
  isHotkeyTriggered,
  onApplyScene,
  onDoubleClickScene,
  onDeleteScene,
}: {
  scene: SceneSummary
  index: number
  isActive: boolean
  isProgramLive: boolean
  isHotkeyTriggered: boolean
  onApplyScene?: (sceneId: string) => void
  onDoubleClickScene?: (sceneId: string) => void
  onDeleteScene?: (sceneId: string) => void
}): JSX.Element {
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <button
      type="button"
      onClick={() => onApplyScene?.(scene.id)}
      onDoubleClick={() => onDoubleClickScene?.(scene.id)}
      className={`relative flex w-full items-center gap-2 rounded-2xl border px-2 py-2 text-left transition hover:bg-violet-400/10 ${
        isHotkeyTriggered
          ? "border-amber-200/70 bg-amber-300/14 shadow-[0_0_28px_rgba(251,191,36,0.22)]"
          : isActive
            ? "border-violet-300/55 bg-violet-400/12"
            : "border-white/10 bg-white/[0.035]"
      }`}
    >
      <div className="w-12 shrink-0">
        <SceneMiniVisualizer scene={scene} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[11px] font-semibold text-white/82">{scene.name}</div>
        <div className="mt-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-white/35">
          Scene {index + 1}
          {scene.screenLayoutPreset ? ` · ${scene.screenLayoutPreset}` : ""}
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-[7px] font-black uppercase tracking-[0.1em] text-white/35">
          <span className="rounded border border-white/10 bg-white/[0.045] px-1.5 py-0.5">
            {index + 1} Preview
          </span>
          <span className="rounded border border-violet-200/20 bg-violet-400/10 px-1.5 py-0.5 text-violet-100/65">
            ⇧{index + 1} Take
          </span>
          {isProgramLive ? (
            <span className="rounded border border-red-300/25 bg-red-500/15 px-1.5 py-0.5 text-red-100/75">
              Program
            </span>
          ) : null}
        </div>
      </div>

      {onDeleteScene ? (
        <>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              setConfirmDelete(true)
            }}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-red-300/30 bg-red-500/18 text-[12px] font-black text-red-100 transition hover:bg-red-500/35"
          >
            ×
          </button>

          {confirmDelete ? (
            <div
              className="absolute inset-1 z-30 flex items-center justify-between gap-2 rounded-xl border border-red-300/30 bg-slate-950/95 px-2 backdrop-blur"
              onClick={(event) => event.stopPropagation()}
            >
              <span className="text-[9px] font-black uppercase tracking-[0.14em] text-red-100/85">
                Delete?
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    setConfirmDelete(false)
                  }}
                  className="rounded-lg border border-white/10 bg-white/[0.06] px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/65"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    onDeleteScene(scene.id)
                    setConfirmDelete(false)
                  }}
                  className="rounded-lg border border-red-300/35 bg-red-500/25 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-red-100"
                >
                  Delete
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </button>
  )
}

function AssetListRow({
  label,
  tone,
  meta,
}: {
  label: string
  tone: "sky" | "emerald"
  meta: string
}): JSX.Element {
  const toneClass =
    tone === "sky"
      ? "border-sky-300/18 bg-sky-400/8 text-sky-100/80"
      : "border-emerald-300/18 bg-emerald-400/8 text-emerald-100/80"

  return (
    <button
      type="button"
      className={`flex w-full items-center gap-2 rounded-2xl border px-2 py-2 text-left transition hover:-translate-y-0.5 ${toneClass}`}
    >
      <div className="h-7 w-9 shrink-0 rounded-lg border border-white/10 bg-black/35" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[11px] font-semibold text-white/82">{label}</div>
        <div className="mt-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-white/35">
          {meta}
        </div>
      </div>
    </button>
  )
}

function SlidesPreviewPanel({
  deckName,
  slideCount,
  programSlideLabel,
  onUploadPdf,
  onSendToPreview,
  onTakeSlide,
}: {
  deckName?: string | null
  slideCount: number
  programSlideLabel?: string | null
  onUploadPdf?: () => void
  onSendToPreview?: (slideIndex: number) => void
  onTakeSlide?: (slideIndex: number) => void
}): JSX.Element {
  const safeSlideCount = Math.max(1, slideCount)
  const slides = Array.from({ length: safeSlideCount }, (_, i) => i + 1)
  const [currentSlide, setCurrentSlide] = useState(1)
  const [slideFlash, setSlideFlash] = useState<"preview" | "take" | "nav" | null>(null)

  const flashSlideAction = (mode: "preview" | "take" | "nav"): void => {
    setSlideFlash(mode)
    window.setTimeout(() => {
      setSlideFlash((current) => (current === mode ? null : current))
    }, 420)
  }

  const goPrevious = (): void => {
    flashSlideAction("nav")
    setCurrentSlide((value) => Math.max(1, value - 1))
  }

  const goNext = (): void => {
    flashSlideAction("nav")
    setCurrentSlide((value) => Math.min(safeSlideCount, value + 1))
  }

  useEffect(() => {
    setCurrentSlide((value) => Math.min(Math.max(1, value), safeSlideCount))
  }, [safeSlideCount])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const tag = (event.target as HTMLElement | null)?.tagName?.toLowerCase()
      if (tag === "input" || tag === "textarea" || tag === "select") return

      if (event.key === "[") {
        event.preventDefault()
        goPrevious()
        return
      }

      if (event.key === "]") {
        event.preventDefault()
        goNext()
        return
      }

      if (event.key.toLowerCase() === "p" && event.shiftKey) {
        event.preventDefault()
        flashSlideAction("take")
        onTakeSlide?.(currentSlide)
        return
      }

      if (event.key.toLowerCase() === "p") {
        event.preventDefault()
        flashSlideAction("preview")
        onSendToPreview?.(currentSlide)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [currentSlide, onSendToPreview, onTakeSlide])

  return (
    <DockSection title="Slides" count={safeSlideCount}>
      <div
        className={`rounded-[18px] border p-2 transition duration-200 ${
          slideFlash === "take"
            ? "border-red-300/45 bg-red-500/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_28px_rgba(248,113,113,0.18)]"
            : slideFlash === "preview"
              ? "border-violet-300/45 bg-violet-400/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_28px_rgba(168,85,247,0.18)]"
              : slideFlash === "nav"
                ? "border-amber-200/45 bg-amber-300/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_28px_rgba(251,191,36,0.14)]"
                : "border-amber-200/12 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.14),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.018))] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_24px_rgba(251,191,36,0.08)]"
        }`}
      >
        <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(30,41,59,0.88))]">
          <div className="absolute left-2 top-2 h-1.5 w-10 rounded-full bg-amber-200/70" />
          <div className="absolute left-2 top-5 h-1 w-16 rounded-full bg-white/35" />
          <div className="absolute left-2 top-8 h-1 w-12 rounded-full bg-white/20" />
          <div className="absolute bottom-2 right-2 h-9 w-12 rounded-lg border border-amber-200/20 bg-amber-300/10 flex items-center justify-center text-[10px] font-black text-amber-100/70">
            {currentSlide}
          </div>
          <div className="absolute right-2 top-2 rounded-full border border-amber-200/20 bg-black/45 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-amber-100/80">
            {currentSlide}/{safeSlideCount}
          </div>
          <div className="absolute bottom-2 left-2 rounded-full border border-white/10 bg-black/45 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-amber-100/75">
            PDF Deck
          </div>
          {programSlideLabel ? (
            <div className="absolute bottom-2 right-2 rounded-full border border-red-300/25 bg-red-500/18 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-red-100/85 shadow-[0_0_12px_rgba(248,113,113,0.18)]">
              Program
            </div>
          ) : null}
        </div>

        <div className="mt-2 flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="truncate text-[11px] font-semibold text-white/82">
              {deckName ?? "Session Deck v1"}
            </div>
            <div className="mt-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-white/35">
              Slide {currentSlide} of {safeSlideCount}
            </div>
            {programSlideLabel ? (
              <div className="mt-1 inline-flex rounded-full border border-red-300/25 bg-red-500/14 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-red-100/75">
                Program: {programSlideLabel}
              </div>
            ) : null}
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.14em] text-white/45">
              <span className="rounded border border-white/10 bg-white/[0.045] px-1.5 py-0.5">[</span>
              <span>Prev</span>
              <span className="text-white/25">/</span>
              <span className="rounded border border-white/10 bg-white/[0.045] px-1.5 py-0.5">]</span>
              <span>Next</span>
              <span className="text-white/25">/</span>
              <span className="rounded border border-violet-200/20 bg-violet-400/10 px-1.5 py-0.5 text-violet-100/70">P</span>
              <span>Preview</span>
              <span className="text-white/25">/</span>
              <span className="rounded border border-red-300/25 bg-red-500/15 px-1.5 py-0.5 text-red-100/80">⇧P</span>
              <span>Take</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onUploadPdf}
            className="shrink-0 rounded-lg border border-amber-200/20 bg-amber-300/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-amber-100/80 transition hover:border-amber-200/35 hover:bg-amber-300/15"
          >
            Upload PDF
          </button>
        </div>

        <div className="mt-2 flex gap-1 overflow-x-auto pb-1">
          {slides.map((slide) => (
            <button
              key={slide}
              type="button"
              onClick={() => {
                flashSlideAction("nav")
                setCurrentSlide(slide)
              }}
              className={`relative h-10 w-14 shrink-0 rounded-lg border text-[8px] font-black transition ${
                slide === currentSlide
                  ? "border-amber-200/50 bg-amber-300/20 text-amber-100"
                  : "border-white/10 bg-black/30 text-white/40 hover:border-amber-200/30 hover:bg-amber-300/10"
              }`}
            >
              <span className="absolute inset-0 flex items-center justify-center">
                {slide}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={goPrevious}
            disabled={currentSlide === 1}
            className="rounded-lg border border-white/10 bg-white/[0.045] px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/55 transition hover:border-amber-200/25 hover:bg-amber-300/10 hover:text-amber-100 disabled:cursor-not-allowed disabled:opacity-35"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={currentSlide === safeSlideCount}
            className="rounded-lg border border-amber-200/20 bg-amber-300/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-amber-100/80 transition hover:border-amber-200/35 hover:bg-amber-300/15 disabled:cursor-not-allowed disabled:opacity-35"
          >
            Next
          </button>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => {
              flashSlideAction("preview")
              onSendToPreview?.(currentSlide)
            }}
            className="rounded-lg border border-violet-300/25 bg-violet-400/12 px-2 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-violet-100/85 transition hover:border-violet-300/40 hover:bg-violet-400/18"
          >
            P Preview
          </button>
          <button
            type="button"
            onClick={() => {
              flashSlideAction("take")
              onTakeSlide?.(currentSlide)
            }}
            className="rounded-lg border border-red-300/25 bg-red-500/14 px-2 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-red-100/85 transition hover:border-red-300/40 hover:bg-red-500/20"
          >
            ⇧P Take
          </button>
        </div>
      </div>
    </DockSection>
  )
}

function DockSceneLegend(): JSX.Element {
  return (
    <div className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-black/24 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.14em] text-white/38 lg:flex">
      <span className="inline-flex items-center gap-1">
        <span className="h-2 w-2 rounded-full bg-violet-300 shadow-[0_0_8px_rgba(196,181,253,0.7)]" />
        Preview
      </span>
      <span className="text-white/18">/</span>
      <span className="inline-flex items-center gap-1 text-red-100/62">
        <span className="h-2 w-2 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.7)]" />
        Program
      </span>
      <span className="text-white/18">/</span>
      <span className="inline-flex items-center gap-1 text-amber-100/62">
        <span className="h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.7)]" />
        Hotkey
      </span>
    </div>
  )
}

export default function BottomAssetDock({
  scenes,
  selectedSceneId,
  programSceneId,
  programSlideLabel,
  hotkeySceneId,
  previewBlocks,
  slideDeckName,
  slideCount,
  onAddScene,
  onUploadPdf,
  onSendSlideToPreview,
  onTakeSlide,
  onApplyScene,
  onDoubleClickScene,
  onDeleteScene,
}: {
  scenes: SceneSummary[]
  selectedSceneId: string | null
  programSceneId: string | null
  programSlideLabel: string | null
  hotkeySceneId: string | null
  previewBlocks: PreviewBlock[]
  slideDeckName?: string | null
  slideCount?: number
  onAddScene?: () => void
  onUploadPdf?: () => void
  onSendSlideToPreview?: (slideIndex: number) => void
  onTakeSlide?: (slideIndex: number) => void
  onApplyScene?: (sceneId: string) => void
  onDoubleClickScene?: (sceneId: string) => void
  onDeleteScene?: (sceneId: string) => void
}): JSX.Element {
  const graphics = previewBlocks.filter((block) => block.type === "text")
  const media = previewBlocks.filter(
    (block) => block.type === "video" || block.type === "image" || block.type === "pdf"
  )
  const graphicsItems: DockAsset[] = graphics.length ? graphics : FALLBACK_GRAPHICS_ITEMS
  const mediaItems: DockAsset[] = media.length ? media : FALLBACK_MEDIA_ITEMS

  const [scenesView, setScenesView] = useState<DockViewMode>("icons")
  const [graphicsView, setGraphicsView] = useState<DockViewMode>("icons")
  const [mediaView, setMediaView] = useState<DockViewMode>("icons")

  return (
    <div className="mt-3 rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.14),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.08),transparent_32%),linear-gradient(180deg,rgba(8,13,30,0.8),rgba(2,4,10,0.94))] px-3 py-2.5 shadow-[0_28px_100px_rgba(0,0,0,0.46),inset_0_1px_0_rgba(255,255,255,0.065)] backdrop-blur-xl">
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/35">
            Live Asset Dock
          </div>
          <div className="mt-1 text-sm text-white/45">
            Scenes, graphics, media, and transition presets.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <DockSceneLegend />
          <KeyboardShortcutsPanel />
          <TallyIndicators />

          <span className="hidden rounded-full border border-violet-300/20 bg-violet-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-violet-100/80 shadow-[0_0_18px_rgba(168,85,247,0.14)] sm:inline-flex">
            Preview Rail
          </span>
        </div>
      </div>

      <div className="grid gap-2 xl:grid-cols-[1.05fr_0.9fr_0.9fr_1fr_0.8fr]">
        <DockSection title="Scenes" count={scenes.length}>
          <ViewToggle value={scenesView} onChange={setScenesView} />

          {scenesView === "icons" ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {scenes.slice(0, 6).map((scene, index) => (
                <SceneTile
                  key={scene.id}
                  scene={scene}
                  index={index}
                  isActive={selectedSceneId === scene.id}
                  isProgramLive={programSceneId === scene.id}
                  isHotkeyTriggered={hotkeySceneId === scene.id}
                  onApplyScene={onApplyScene}
                  onDoubleClickScene={onDoubleClickScene}
                  onDeleteScene={onDeleteScene}
                />
              ))}

              <button
                type="button"
                onClick={onAddScene}
                className="min-w-[96px] rounded-[16px] border border-dashed border-white/14 bg-black/20 p-1.5 text-center text-[10px] font-black uppercase tracking-[0.16em] text-white/35 transition hover:border-white/25 hover:bg-white/[0.04]"
              >
                <div className="flex aspect-video items-center justify-center rounded-xl border border-white/10 bg-black/25 text-xl text-white/35">
                  +
                </div>
                <div className="mt-1.5">Add Scene</div>
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {scenes.slice(0, 6).map((scene, index) => (
                <SceneListRow
                  key={scene.id}
                  scene={scene}
                  index={index}
                  isActive={selectedSceneId === scene.id}
                  isProgramLive={programSceneId === scene.id}
                  isHotkeyTriggered={hotkeySceneId === scene.id}
                  onApplyScene={onApplyScene}
                  onDoubleClickScene={onDoubleClickScene}
                  onDeleteScene={onDeleteScene}
                />
              ))}
              <button
                type="button"
                onClick={onAddScene}
                className="flex w-full items-center justify-center rounded-2xl border border-dashed border-white/14 bg-black/20 px-2 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/35 transition hover:border-white/25 hover:bg-white/[0.04]"
              >
                + Add Scene
              </button>
            </div>
          )}
        </DockSection>

        <DockSection title="Graphics" count={graphics.length}>
          <ViewToggle value={graphicsView} onChange={setGraphicsView} />

          {graphicsView === "icons" ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {graphicsItems.slice(0, 5).map((item) => (
                <GraphicTile key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="space-y-1.5">
              {graphicsItems.slice(0, 5).map((item) => (
                <AssetListRow
                  key={item.id}
                  label={item.label || "Graphic"}
                  meta="Graphic"
                  tone="sky"
                />
              ))}
            </div>
          )}
        </DockSection>

        <DockSection title="Media" count={media.length}>
          <ViewToggle value={mediaView} onChange={setMediaView} />

          {mediaView === "icons" ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {mediaItems.slice(0, 5).map((item, index) => (
                <MediaTile key={item.id} item={item} index={index} />
              ))}
            </div>
          ) : (
            <div className="space-y-1.5">
              {mediaItems.slice(0, 5).map((item) => (
                <AssetListRow
                  key={item.id}
                  label={item.label || "Media"}
                  meta="Media"
                  tone="emerald"
                />
              ))}
            </div>
          )}
        </DockSection>

        <SlidesPreviewPanel
          deckName={slideDeckName}
          slideCount={slideCount ?? 8}
          programSlideLabel={programSlideLabel}
          onUploadPdf={onUploadPdf}
          onSendToPreview={onSendSlideToPreview}
          onTakeSlide={onTakeSlide}
        />
        <DockSection title="Transitions" count={TRANSITION_PRESETS.length}>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {TRANSITION_PRESETS.map((transition) => (
                <button
                  key={transition}
                  type="button"
                  className={`rounded-xl border px-2.5 py-2 text-[10px] font-black uppercase tracking-[0.15em] transition hover:-translate-y-0.5 active:translate-y-0 ${
                    transition === "Cut"
                      ? "border-red-300/25 bg-red-400/10 text-red-100/80 shadow-[0_0_16px_rgba(248,113,113,0.12)] hover:border-red-300/40 hover:bg-red-400/15"
                      : "border-white/10 bg-white/[0.04] text-white/65 hover:border-white/20 hover:bg-white/[0.07]"
                  }`}
                >
                  {transition}
                </button>
              ))}
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-1.5">
              <div className="mb-1.5 flex items-center justify-between px-1">
                <span className="text-[8px] font-black uppercase tracking-[0.18em] text-white/32">
                  Duration
                </span>
                <span className="text-[8px] font-black uppercase tracking-[0.18em] text-white/42">
                  Armed
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {TRANSITION_DURATIONS.map((duration) => (
                  <button
                    key={duration}
                    type="button"
                    className={`rounded-lg border px-1.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] transition ${
                      duration === "500ms"
                        ? "border-violet-300/30 bg-violet-400/12 text-violet-100/80 shadow-[0_0_12px_rgba(168,85,247,0.12)]"
                        : "border-white/10 bg-white/[0.035] text-white/45 hover:border-violet-200/20 hover:bg-violet-400/8 hover:text-violet-100/65"
                    }`}
                  >
                    {duration}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </DockSection>
      </div>
    </div>
  )
}