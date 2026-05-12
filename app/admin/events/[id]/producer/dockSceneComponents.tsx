import { useEffect, useState } from "react"
import type { JSX } from "react"
import { Clock3 } from "lucide-react"

import type { PreviewBlock } from "./useProducerBlocks"
import type { SceneSummary } from "./assetDockTypes"

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
  const thumbnailUrl = scene.thumbnailUrl ?? null

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
      ? "relative aspect-video overflow-hidden rounded-lg border border-white/10 bg-[radial-gradient(circle_at_25%_25%,rgba(168,85,247,0.24),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(2,6,23,0.98))] shadow-[inset_0_1px_0_rgba(255,255,255,0.055)] transition group-hover:border-violet-200/25 group-hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_18px_rgba(168,85,247,0.12)]"
      : "relative aspect-video overflow-hidden rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.95),rgba(2,6,23,0.98))] shadow-[inset_0_1px_0_rgba(255,255,255,0.055)] transition group-hover:border-violet-200/25 group-hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_18px_rgba(168,85,247,0.12)]"

  return (
    <div className={baseClass}>
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={`${scene.name} preview`}
          className="absolute inset-0 h-full w-full object-cover opacity-90"
        />
      ) : null}

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_52%,rgba(0,0,0,0.46)),linear-gradient(180deg,rgba(255,255,255,0.05),transparent_26%,transparent_72%,rgba(0,0,0,0.34))]" />

      {!thumbnailUrl && preset === "fullscreen" ? (
        <div className="absolute inset-1 rounded-lg border border-sky-200/20 bg-sky-400/16" />
      ) : !thumbnailUrl && preset === "speaker_focus" ? (
        <>
          <div className="absolute inset-y-1 left-1 w-[62%] rounded-lg border border-sky-200/18 bg-sky-400/12" />
          <div className="absolute right-1 top-1 h-[44%] w-[30%] rounded-lg border border-violet-200/18 bg-violet-400/14" />
        </>
      ) : !thumbnailUrl && preset === "brand" ? (
        <>
          <div className="absolute left-1 top-1 h-[58%] w-[58%] rounded-lg border border-sky-200/18 bg-sky-400/12" />
          <div className="absolute bottom-1 right-1 h-[34%] w-[34%] rounded-lg border border-violet-200/18 bg-violet-400/14" />
        </>
      ) : !thumbnailUrl ? (
        <>
          <div className="absolute left-1 top-1 h-[46%] w-[46%] rounded-lg border border-sky-200/18 bg-sky-400/12" />
          <div className="absolute right-1 top-1 h-[46%] w-[46%] rounded-lg border border-violet-200/18 bg-violet-400/14" />
          <div className="absolute bottom-1 left-1 h-[32%] w-[46%] rounded-lg border border-white/10 bg-white/[0.055]" />
        </>
      ) : null}

      {blocks.map((block) => (
        <SceneBlockPreview key={block.id} block={block} />
      ))}

      <div className="absolute bottom-1 right-1 rounded-md border border-white/10 bg-black/65 px-1 py-0.5 text-[7px] font-black uppercase tracking-[0.1em] text-white/68 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
        {thumbnailUrl ? "Live" : label}
      </div>

      <div className="absolute left-1 top-1 rounded-md border border-white/10 bg-black/55 px-1 py-0.5 text-[7px] font-black uppercase tracking-[0.1em] text-white/50">
        {blocks.length ? `${blocks.length} FX` : "Clean"}
      </div>
    </div>
  )
}

function formatMemoryTime(): string {
  return new Date().toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })
}

export function SceneTile({
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
  const [recallFlash, setRecallFlash] = useState(false)
  const memoryLabel = `M${String(index + 1).padStart(2, "0")}`

  useEffect(() => {
    if (!isActive && !isHotkeyTriggered) return

    setRecallFlash(true)

    const id = window.setTimeout(() => {
      setRecallFlash(false)
    }, 680)

    return () => window.clearTimeout(id)
  }, [isActive, isHotkeyTriggered, scene.id])

  return (
    <button
      type="button"
      onClick={() => onApplyScene?.(scene.id)}
      onDoubleClick={() => onDoubleClickScene?.(scene.id)}
      className={`group relative min-w-[96px] overflow-hidden rounded-[18px] border p-1.5 text-left transition duration-200 before:pointer-events-none before:absolute before:inset-0 before:rounded-[18px] before:bg-[linear-gradient(118deg,transparent_0%,rgba(255,255,255,0.08)_18%,transparent_36%)] before:opacity-0 before:transition-opacity hover:before:opacity-100 ${
        isHotkeyTriggered
          ? "-translate-y-0.5 border-amber-200/70 bg-amber-300/14 shadow-[0_0_38px_rgba(251,191,36,0.34),inset_0_1px_0_rgba(255,255,255,0.08)]"
          : isProgramLive
            ? "border-red-300/55 bg-red-500/12 shadow-[0_0_34px_rgba(248,113,113,0.24),inset_0_1px_0_rgba(255,255,255,0.06)]"
            : isActive
              ? "border-violet-300/60 bg-violet-400/12 shadow-[0_0_28px_rgba(168,85,247,0.24),inset_0_1px_0_rgba(255,255,255,0.06)]"
              : "border-white/10 bg-white/[0.035] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]"
      } hover:-translate-y-0.5 hover:border-violet-300/40 hover:bg-violet-400/10 hover:shadow-[0_0_24px_rgba(168,85,247,0.20)] active:translate-y-0`}
    >
      {isHotkeyTriggered ? (
        <div className="absolute inset-0 rounded-[16px] border border-amber-200/50 shadow-[inset_0_0_18px_rgba(251,191,36,0.18)]" />
      ) : null}
      {recallFlash ? (
        <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden rounded-[18px] border border-violet-200/45 bg-violet-400/10 shadow-[0_0_32px_rgba(168,85,247,0.28),inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div className="absolute inset-y-0 left-0 w-1/2 translate-x-[-120%] bg-gradient-to-r from-transparent via-white/22 to-transparent animate-[scene-recall-sweep_680ms_ease-out_1]" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/18 backdrop-blur-[1px]">
            <div className="rounded-full border border-white/18 bg-black/58 px-3 py-1 text-[8px] font-black uppercase tracking-[0.2em] text-white/78 shadow-[0_0_22px_rgba(255,255,255,0.16)]">
              Memory Recall
            </div>
          </div>
        </div>
      ) : null}
      {isProgramLive ? (
        <div className="pointer-events-none absolute inset-0 rounded-[18px] border border-red-300/35 shadow-[inset_0_0_22px_rgba(248,113,113,0.16)]" />
      ) : null}
      {isActive ? (
        <div className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-violet-300 shadow-[0_0_10px_rgba(196,181,253,0.95)]" />
      ) : null}

      {isProgramLive ? (
        <div className="absolute left-1.5 bottom-[42px] z-10 flex items-center gap-1 rounded-md border border-red-300/34 bg-red-500/22 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.1em] text-red-100 shadow-[0_0_16px_rgba(248,113,113,0.22)]">
          <span className="h-1.5 w-1.5 rounded-full bg-red-300 shadow-[0_0_8px_rgba(248,113,113,0.8)]" />
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
      <div className="absolute left-1.5 top-1.5 rounded-md border border-white/10 bg-black/50 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.1em] text-white/58 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
        {memoryLabel}
      </div>

      <div className="absolute bottom-[42px] right-1.5 z-10 rounded-md border border-violet-200/20 bg-black/60 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.08em] text-violet-100/75 shadow-[0_0_12px_rgba(168,85,247,0.14)]">
        ⇧{index + 1} TAKE
      </div>
      <SceneMiniVisualizer scene={scene} />
      <div className="mt-1 flex items-center justify-between gap-1 text-[8px] font-black uppercase tracking-[0.16em] text-white/32">
        <span>{memoryLabel}</span>
        <span className="rounded border border-white/10 bg-white/[0.045] px-1 py-0.5 text-[7px] tracking-[0.08em] text-white/45">
          Recall
        </span>
      </div>
      <div
        className={`mt-0.5 truncate text-[10px] font-semibold group-hover:text-violet-100${
          isActive ? " text-violet-100" : ""
        }`}
      >
        {scene.name}
      </div>
      <div className="mt-1 flex items-center justify-between gap-1 text-[7px] font-black uppercase tracking-[0.1em] text-white/30">
        <span className="inline-flex items-center gap-1">
          <Clock3 size={8} />
          {formatMemoryTime()}
        </span>
        <span className={isActive ? "text-violet-100/70" : "text-white/28"}>
          {isActive ? "Armed" : "Memory"}
        </span>
      </div>
    </button>
  )
}

export function SceneListRow({
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
  const [recallFlash, setRecallFlash] = useState(false)
  const memoryLabel = `M${String(index + 1).padStart(2, "0")}`

  useEffect(() => {
    if (!isActive && !isHotkeyTriggered) return

    setRecallFlash(true)

    const id = window.setTimeout(() => {
      setRecallFlash(false)
    }, 680)

    return () => window.clearTimeout(id)
  }, [isActive, isHotkeyTriggered, scene.id])

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
      {recallFlash ? (
        <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-2xl border border-violet-200/35 bg-violet-400/8 shadow-[0_0_24px_rgba(168,85,247,0.20)]">
          <div className="absolute inset-y-0 left-0 w-1/3 translate-x-[-120%] bg-gradient-to-r from-transparent via-white/18 to-transparent animate-[scene-recall-sweep_680ms_ease-out_1]" />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-white/12 bg-black/58 px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.16em] text-white/66">
            Recall
          </div>
        </div>
      ) : null}
      <div className="w-12 shrink-0">
        <SceneMiniVisualizer scene={scene} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[11px] font-semibold text-white/82">{scene.name}</div>
        <div className="mt-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-white/35">
          {memoryLabel}
          {scene.screenLayoutPreset ? ` · ${scene.screenLayoutPreset}` : ""}
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-[7px] font-black uppercase tracking-[0.1em] text-white/35">
          <span className="rounded border border-white/10 bg-white/[0.045] px-1.5 py-0.5">
            {memoryLabel} Preview
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