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

  function resetDragState(): void {
    setDraggedBlockId(null)
    setDragOverBlockId(null)
  }

  function handleDrop(targetBlockId: string): void {
    if (!draggedBlockId || draggedBlockId === targetBlockId) {
      resetDragState()
      return
    }

    const nextOrder = [...sortedBlocks]
    const fromIndex = nextOrder.findIndex((block) => block.id === draggedBlockId)
    const toIndex = nextOrder.findIndex((block) => block.id === targetBlockId)

    if (fromIndex < 0 || toIndex < 0) {
      resetDragState()
      return
    }

    const [movedBlock] = nextOrder.splice(fromIndex, 1)
    nextOrder.splice(toIndex, 0, movedBlock)

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

        <div className="rounded-full border border-white/8 bg-white/[0.026] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-white/34">
          Z Order
        </div>
      </div>

      <div className="relative z-10 space-y-1.5">
        {sortedBlocks.length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-white/7 bg-white/[0.018] px-3 py-4 text-center text-xs font-semibold text-white/30">
            Add a text, image, video, or PDF block to begin layering.
          </div>
        ) : (
          sortedBlocks.map((block, index) => {
            const isSelected = block.id === selectedBlockId
            const isTopLayer = index === 0
            const isBottomLayer = index === sortedBlocks.length - 1

            return (
              <button
                key={block.id}
                type="button"
                draggable
                onClick={() => onSelectBlock(block.id)}
                onDragStart={(event: DragEvent<HTMLButtonElement>) => {
                  event.dataTransfer.effectAllowed = "move"
                  event.dataTransfer.setData("text/plain", block.id)
                  setDraggedBlockId(block.id)
                }}
                onDragOver={(event: DragEvent<HTMLButtonElement>) => {
                  event.preventDefault()
                  event.dataTransfer.dropEffect = "move"
                  setDragOverBlockId(block.id)
                }}
                onDragLeave={() => {
                  if (dragOverBlockId === block.id) {
                    setDragOverBlockId(null)
                  }
                }}
                onDrop={(event: DragEvent<HTMLButtonElement>) => {
                  event.preventDefault()
                  handleDrop(block.id)
                }}
                onDragEnd={resetDragState}
                className={`group/layer flex w-full items-center justify-between gap-2 rounded-[15px] border px-2.5 py-2 text-left transition-all hover:-translate-y-px ${
                  isSelected
                    ? "border-violet-300/18 bg-violet-400/[0.085] shadow-[0_0_18px_rgba(168,85,247,0.07),inset_0_1px_0_rgba(255,255,255,0.035)]"
                    : "border-white/[0.055] bg-white/[0.020] shadow-[inset_0_1px_0_rgba(255,255,255,0.018)] hover:border-white/10 hover:bg-white/[0.036]"
                } ${
                  draggedBlockId === block.id
                    ? "scale-[0.985] opacity-55"
                    : ""
                } ${
                  dragOverBlockId === block.id && draggedBlockId !== block.id
                    ? "ring-1 ring-violet-300/34 shadow-[0_0_22px_rgba(168,85,247,0.10),inset_0_1px_0_rgba(255,255,255,0.04)]"
                    : ""
                }`}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="relative shrink-0">
                    <LayerMiniPreview block={block} />
                    <div
                      className={`absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border text-[8px] font-black uppercase tracking-tight ${
                        isSelected
                          ? "border-violet-300/22 bg-violet-300/[0.22] text-violet-50/78 shadow-[0_0_10px_rgba(168,85,247,0.16)]"
                          : "border-white/10 bg-black/70 text-white/44"
                      }`}
                    >
                      {index + 1}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold text-white/70">
                      {block.label || block.type}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.11em] text-white/28">
                      <span>{block.type}</span>
                      <span>·</span>
                      <span className="tabular-nums">z {block.zIndex ?? 0}</span>
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
                  <span className="hidden rounded-full border border-white/7 bg-black/18 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.10em] text-white/26 2xl:inline-flex">
                    {block.hidden ? "Hidden" : "Live"}
                  </span>

                  <span
                    className="flex h-7 w-7 cursor-grab items-center justify-center rounded-xl border border-white/7 bg-black/18 text-white/24 active:cursor-grabbing"
                    title="Drag to reorder layer"
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
                    title={block.hidden ? "Show layer" : "Hide layer"}
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