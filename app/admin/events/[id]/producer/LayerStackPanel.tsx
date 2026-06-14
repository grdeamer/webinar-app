"use client"

import { useState, type DragEvent, type JSX } from "react"
import {
  ArrowDown,
  ArrowUp,
  Blend,
  Clock3,
  Eye,
  EyeOff,
  GripVertical,
  Layers3,
  Lock,
  Network,
} from "lucide-react"

import type { PreviewBlock } from "./useProducerBlocks"

function LayerMiniPreview({ block }: { block: PreviewBlock }): JSX.Element {
  const baseClass =
    "relative h-9 w-12 shrink-0 overflow-hidden rounded-[10px] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.10),transparent_36%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(3,7,18,0.96))] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"

  if (block.type === "camera-slot") {
    return (
      <div className={baseClass}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_25%,rgba(168,85,247,0.28),transparent_34%),linear-gradient(135deg,rgba(30,27,75,0.42),rgba(2,6,23,0.96))]" />
        <div className="absolute inset-1 rounded-[8px] border border-violet-200/16 bg-black/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]" />
        <div className="absolute inset-0 flex items-center justify-center text-[11px] font-black uppercase tracking-[0.08em] text-violet-100/72">
          CAM
        </div>
        <div className="absolute bottom-1 left-1 right-1 h-1 rounded-full bg-violet-200/16">
          <div className="h-full w-1/2 rounded-full bg-violet-200/46" />
        </div>
      </div>
    )
  }

  if (block.type === "image" && block.src) {
    return (
      <div className={baseClass}>
        <img
          src={block.src}
          alt=""
          className="h-full w-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.36))]" />
      </div>
    )
  }

  if (block.type === "video") {
    return (
      <div className={baseClass}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_30%,rgba(52,211,153,0.30),transparent_36%),linear-gradient(135deg,rgba(6,78,59,0.42),rgba(2,6,23,0.96))]" />
        <div className="absolute left-1/2 top-1/2 h-0 w-0 -translate-x-[35%] -translate-y-1/2 border-y-[6px] border-l-[9px] border-y-transparent border-l-emerald-100/70" />
        <div className="absolute inset-x-1 bottom-1 h-1 rounded-full bg-emerald-200/18">
          <div className="h-full w-2/3 rounded-full bg-emerald-200/42" />
        </div>
      </div>
    )
  }

  if (block.type === "pdf") {
    return (
      <div className={baseClass}>
        <div className="absolute inset-1 rounded-md border border-amber-100/16 bg-amber-100/[0.055]" />
        <div className="absolute left-2 right-2 top-2 h-1 rounded-full bg-amber-100/34" />
        <div className="absolute left-2 right-3 top-4 h-1 rounded-full bg-amber-100/22" />
        <div className="absolute left-2 right-4 top-6 h-1 rounded-full bg-amber-100/18" />
      </div>
    )
  }

  return (
    <div className={baseClass}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_25%,rgba(125,211,252,0.24),transparent_34%),linear-gradient(135deg,rgba(14,116,144,0.26),rgba(2,6,23,0.96))]" />
      <div className="absolute inset-0 flex items-center justify-center text-[13px] font-black tracking-tight text-sky-100/70">
        Aa
      </div>
    </div>
  )
}

function getLayerTypeLabel(block: PreviewBlock): string {
  switch (block.type) {
    case "camera-slot":
      return "Camera Slot"
    case "image":
      return "Image"
    case "video":
      return "Video"
    case "pdf":
      return "PDF"
    case "text":
      return "Text"
    default:
      return block.type
  }
}

function getLayerStackPositionLabel(index: number, total: number): string {
  if (total <= 1) return "Only"
  if (index === 0) return "Top"
  if (index === total - 1) return "Base"
  return `L${index + 1}`
}

export default function LayerStackPanel({
  blocks,
  selectedBlockId,
  onSelectBlock,
  onToggleLayerHidden,
  onMoveLayerForward,
  onMoveLayerBackward,
  onReorderLayers,
}: {
  blocks: PreviewBlock[]
  selectedBlockId: string | null
  onSelectBlock: (blockId: string) => void
  onToggleLayerHidden: (blockId: string) => void
  onMoveLayerForward: (blockId: string) => void
  onMoveLayerBackward: (blockId: string) => void
  onReorderLayers: (orderedBlockIds: string[]) => void
}): JSX.Element {
  const sortedBlocks = [...blocks].sort((a, b) => (b.zIndex ?? 0) - (a.zIndex ?? 0))

  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null)
  const [dragOverBlockId, setDragOverBlockId] = useState<string | null>(null)
  const [dropPlacement, setDropPlacement] = useState<"before" | "after" | null>(null)

  function resetDragState(): void {
    setDraggedBlockId(null)
    setDragOverBlockId(null)
    setDropPlacement(null)
  }

  function handleDrop(targetBlockId: string): void {
    if (!draggedBlockId || draggedBlockId === targetBlockId) {
      resetDragState()
      return
    }

    const nextOrder = [...sortedBlocks]
    const fromIndex = nextOrder.findIndex((block) => block.id === draggedBlockId)
    const targetIndex = nextOrder.findIndex((block) => block.id === targetBlockId)

    if (fromIndex < 0 || targetIndex < 0) {
      resetDragState()
      return
    }

    const [movedBlock] = nextOrder.splice(fromIndex, 1)
    const adjustedTargetIndex = nextOrder.findIndex((block) => block.id === targetBlockId)
    const insertIndex = dropPlacement === "after" ? adjustedTargetIndex + 1 : adjustedTargetIndex

    nextOrder.splice(insertIndex, 0, movedBlock)

    onReorderLayers(nextOrder.map((block) => block.id))
    resetDragState()
  }

  return (
    <div className="relative overflow-hidden rounded-[18px] border border-white/[0.055] bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.026),transparent_34%),linear-gradient(180deg,rgba(10,14,25,0.84),rgba(4,6,12,0.95))] p-2 shadow-[0_9px_26px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.022)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.01)_42%,transparent_64%)] animate-[rightRailSignalSweep_18s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-violet-200/14 to-transparent" />

      <div className="relative z-10 mb-2 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-violet-100/42">
            <Layers3 size={12} />
            Layer Stack
          </div>
          <div className="mt-1 text-xs font-semibold text-white/42">
            {blocks.length === 0
              ? "No composition layers"
              : `${blocks.length} composition layer${blocks.length === 1 ? "" : "s"}`}
          </div>
        </div>

        <div className="rounded-full border border-sky-300/10 bg-sky-400/[0.045] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-sky-100/42">
          Top → Base
        </div>
      </div>

      <div className="relative z-10 space-y-1.5">
        {sortedBlocks.length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-sky-300/10 bg-sky-400/[0.018] px-3 py-5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.018)]">
            <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-2xl border border-sky-300/12 bg-sky-400/[0.045] text-sky-100/44">
              <Layers3 size={15} />
            </div>
            <div className="text-xs font-semibold text-white/42">
              No composition layers yet.
            </div>
            <div className="mt-1 text-[10px] font-medium leading-4 text-white/26">
              Drag media into Preview or add a text/image/video block to begin.
            </div>
          </div>
        ) : (
          sortedBlocks.map((block, index) => {
            const isSelected = block.id === selectedBlockId
            const isTopLayer = index === 0
            const isBottomLayer = index === sortedBlocks.length - 1
            const layerTypeLabel = getLayerTypeLabel(block)
            const layerPositionLabel = getLayerStackPositionLabel(index, sortedBlocks.length)

            return (
              <button
                key={block.id}
                type="button"
                onClick={() => onSelectBlock(block.id)}
                onDragOver={(event: DragEvent<HTMLButtonElement>) => {
                  event.preventDefault()
                  event.dataTransfer.dropEffect = "move"

                  const rect = event.currentTarget.getBoundingClientRect()
                  const cursorOffset = event.clientY - rect.top

                  setDragOverBlockId(block.id)
                  setDropPlacement(cursorOffset > rect.height / 2 ? "after" : "before")
                }}
                onDragLeave={() => {
                  if (dragOverBlockId === block.id) {
                    setDragOverBlockId(null)
                    setDropPlacement(null)
                  }
                }}
                onDrop={(event: DragEvent<HTMLButtonElement>) => {
                  event.preventDefault()
                  handleDrop(block.id)
                }}
                onDragEnd={resetDragState}
                className={`group/layer relative flex w-full items-center justify-between gap-2 rounded-[15px] border px-2.5 py-2 text-left transition-all hover:-translate-y-px ${
                  isSelected
                    ? "border-violet-300/22 bg-violet-400/[0.095] shadow-[0_0_20px_rgba(168,85,247,0.09),inset_0_1px_0_rgba(255,255,255,0.04)]"
                    : block.hidden
                      ? "border-white/[0.035] bg-white/[0.010] opacity-70 shadow-[inset_0_1px_0_rgba(255,255,255,0.012)] hover:border-white/8 hover:bg-white/[0.022]"
                      : block.locked
                        ? "border-amber-300/10 bg-amber-400/[0.025] shadow-[inset_0_1px_0_rgba(255,255,255,0.016)] hover:border-amber-300/16 hover:bg-amber-400/[0.04]"
                        : "border-white/[0.055] bg-white/[0.020] shadow-[inset_0_1px_0_rgba(255,255,255,0.018)] hover:border-white/10 hover:bg-white/[0.036]"
                } ${
                  draggedBlockId === block.id
                    ? "scale-[0.985] opacity-45 ring-1 ring-emerald-300/24"
                    : ""
                } ${
                  dragOverBlockId === block.id && draggedBlockId !== block.id
                    ? "ring-1 ring-violet-300/34 shadow-[0_0_22px_rgba(168,85,247,0.10),inset_0_1px_0_rgba(255,255,255,0.04)]"
                    : ""
                }`}
              >
                {dragOverBlockId === block.id && draggedBlockId !== block.id && dropPlacement === "before" ? (
                  <span className="pointer-events-none absolute -top-1 left-3 right-3 h-0.5 rounded-full bg-violet-200/70 shadow-[0_0_12px_rgba(196,181,253,0.32)]" />
                ) : null}

                {dragOverBlockId === block.id && draggedBlockId !== block.id && dropPlacement === "after" ? (
                  <span className="pointer-events-none absolute -bottom-1 left-3 right-3 h-0.5 rounded-full bg-violet-200/70 shadow-[0_0_12px_rgba(196,181,253,0.32)]" />
                ) : null}

                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="relative shrink-0">
                    <LayerMiniPreview block={block} />
                    <div
                      className={`absolute -left-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border px-1 text-[7px] font-black uppercase tracking-tight ${
                        isSelected
                          ? "border-violet-300/22 bg-violet-300/[0.22] text-violet-50/78 shadow-[0_0_10px_rgba(168,85,247,0.16)]"
                          : "border-white/10 bg-black/70 text-white/44"
                      }`}
                    >
                      {layerPositionLabel}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="truncate text-xs font-semibold text-white/74">
                        {block.label || layerTypeLabel}
                      </div>
                      {isSelected ? (
                        <span className="shrink-0 rounded-full border border-violet-300/14 bg-violet-400/[0.09] px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.09em] text-violet-100/58">
                          Active
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.11em] text-white/28">
                      <span>{layerTypeLabel}</span>
                      <span>·</span>
                      <span className="tabular-nums">z {block.zIndex ?? 0}</span>
                      <span>·</span>
                      <span className="tabular-nums">{Math.round((block.opacity ?? 1) * 100)}%</span>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      {block.locked ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/12 bg-amber-400/[0.06] px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.10em] text-amber-100/44">
                          <Lock size={8} />
                          Lock
                        </span>
                      ) : null}

                      {block.groupId ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-violet-300/12 bg-violet-400/[0.06] px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.10em] text-violet-100/44">
                          <Network size={8} />
                          Group
                        </span>
                      ) : null}

                      {block.blendMode && block.blendMode !== "normal" ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-sky-300/12 bg-sky-400/[0.06] px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.10em] text-sky-100/44">
                          <Blend size={8} />
                          {block.blendMode}
                        </span>
                      ) : null}

                      {(block.scale ?? 1) !== 1 ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-fuchsia-300/12 bg-fuchsia-400/[0.055] px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.10em] text-fuchsia-100/44">
                          {Math.round((block.scale ?? 1) * 100)}%
                        </span>
                      ) : null}

                      {(block.rotation ?? 0) !== 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-indigo-300/12 bg-indigo-400/[0.055] px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.10em] text-indigo-100/44">
                          {block.rotation}°
                        </span>
                      ) : null}

                      {block.timelineDurationMs ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-cyan-300/12 bg-cyan-400/[0.06] px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.10em] text-cyan-100/44">
                          <Clock3 size={8} />
                          {Math.round((block.timelineDurationMs ?? 0) / 1000)}s
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <span
                    className={`hidden rounded-full border px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.10em] xl:inline-flex ${
                      block.hidden
                        ? "border-amber-300/12 bg-amber-400/[0.055] text-amber-100/42"
                        : "border-emerald-300/12 bg-emerald-400/[0.045] text-emerald-100/42"
                    }`}
                  >
                    {block.hidden ? "Hidden" : "Live"}
                  </span>
                  {block.locked ? (
                    <span className="hidden rounded-full border border-amber-300/12 bg-amber-400/[0.055] px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.10em] text-amber-100/42 xl:inline-flex">
                      Locked
                    </span>
                  ) : null}

                  <span
                    draggable
                    onClick={(event) => event.stopPropagation()}
                    onDragStart={(event: DragEvent<HTMLSpanElement>) => {
                      event.stopPropagation()
                      event.dataTransfer.effectAllowed = "move"
                      event.dataTransfer.setData("text/plain", block.id)
                      setDraggedBlockId(block.id)
                    }}
                    onDragEnd={resetDragState}
                    className="flex h-7 w-7 cursor-grab items-center justify-center rounded-xl border border-white/7 bg-black/18 text-white/24 transition hover:-translate-y-px hover:border-violet-300/20 hover:bg-violet-400/[0.08] hover:text-violet-100/70 active:cursor-grabbing group-hover/layer:border-white/12 group-hover/layer:text-white/38"
                    title="Drag layer in stack"
                  >
                    <GripVertical size={12} />
                  </span>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      onMoveLayerForward(block.id)
                    }}
                    disabled={isTopLayer}
                    className="flex h-7 w-7 items-center justify-center rounded-xl border border-white/7 bg-white/[0.022] text-white/34 transition hover:border-violet-300/16 hover:bg-violet-400/[0.06] hover:text-violet-100/62 disabled:cursor-not-allowed disabled:opacity-25"
                    title="Move layer forward"
                  >
                    <ArrowUp size={12} />
                  </button>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      onMoveLayerBackward(block.id)
                    }}
                    disabled={isBottomLayer}
                    className="flex h-7 w-7 items-center justify-center rounded-xl border border-white/7 bg-white/[0.022] text-white/34 transition hover:border-violet-300/16 hover:bg-violet-400/[0.06] hover:text-violet-100/62 disabled:cursor-not-allowed disabled:opacity-25"
                    title="Move layer backward"
                  >
                    <ArrowDown size={12} />
                  </button>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      onToggleLayerHidden(block.id)
                    }}
                    className={`flex h-7 w-7 items-center justify-center rounded-xl border transition ${
                      block.hidden
                        ? "border-amber-300/14 bg-amber-400/[0.07] text-amber-100/58 hover:bg-amber-400/[0.12]"
                        : "border-emerald-300/14 bg-emerald-400/[0.06] text-emerald-100/58 hover:bg-emerald-400/[0.11]"
                    }`}
                    title={block.hidden ? "Show this layer" : "Hide this layer"}
                  >
                    {block.hidden ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}