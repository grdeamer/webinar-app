import type { CSSProperties, JSX } from "react"
import type { PreviewBlock } from "./useProducerBlocks"

export type SharedBlockStyleOptions = {
  x: number
  y: number
  width: number
  height: number
  zIndex?: number
  opacity?: number
  scale?: number
  rotation?: number
  blendMode?: CSSProperties["mixBlendMode"]
}

export function getSharedBlockStyle({
  x,
  y,
  width,
  height,
  zIndex,
  opacity,
  scale,
  rotation,
  blendMode,
}: SharedBlockStyleOptions): CSSProperties {
  const resolvedBlendMode = blendMode ?? "normal"
  const cinematicBlendModes = [
    "screen",
    "overlay",
    "soft-light",
    "hard-light",
    "color-dodge",
    "lighten",
  ]

  const isBrightBlendMode = cinematicBlendModes.includes(resolvedBlendMode)

  return {
    position: "absolute",
    left: x,
    top: y,
    width,
    height,
    zIndex,
    opacity: opacity ?? 1,
    transform: `scale(${scale ?? 1}) rotate(${rotation ?? 0}deg)`,
    transformOrigin: "center center",
    mixBlendMode: resolvedBlendMode,
    isolation: "isolate",
    willChange: "transform, opacity, filter",
    filter:
      resolvedBlendMode === "overlay"
        ? "contrast(1.06) saturate(1.08)"
        : resolvedBlendMode === "soft-light"
          ? "brightness(1.02) saturate(1.04)"
          : resolvedBlendMode === "hard-light"
            ? "contrast(1.12) saturate(1.12)"
            : resolvedBlendMode === "screen"
              ? "brightness(1.08)"
              : undefined,
    boxShadow: isBrightBlendMode
      ? "0 0 34px rgba(255,255,255,0.06)"
      : undefined,
    backfaceVisibility: "hidden",
    perspective: 1000,
  }
}

function renderBlockContent(block: PreviewBlock): JSX.Element | null {
  if (block.type === "text") {
    return <div className="p-2 text-sm">{block.content}</div>
  }

  if (block.type === "video" && block.src) {
    return <video src={block.src} controls className="h-full w-full object-cover" />
  }

  if (block.type === "image" && block.src) {
    return (
      <img
        src={block.src}
        className="h-full w-full object-contain"
        alt={block.label || "Image"}
      />
    )
  }

  if (block.type === "pdf" && block.src) {
    return (
      <iframe
        src={block.src}
        className="h-full w-full bg-white"
        title={block.label || "PDF"}
      />
    )
  }

  return null
}

export function renderPlacedBlocks({
  blocks,
  opts,
  selectedBlockId,
  setSelectedBlockId,
  startDraggingBlock,
  startResizingBlock,
}: {
  blocks: PreviewBlock[]
  opts?: {
    selectable?: boolean
    showChrome?: boolean
    selectedBlockId?: string | null
  }
  selectedBlockId: string | null
  setSelectedBlockId: (value: string | null) => void
  startDraggingBlock: (e: React.MouseEvent<HTMLDivElement>, blockId: string) => void
  startResizingBlock: (e: React.MouseEvent<HTMLDivElement>, blockId: string) => void
}): JSX.Element[] {
  return blocks
    .filter((block) => !block.hidden)
    .map((block) => (
      <div
        key={block.id}
        onClick={
          opts?.selectable
            ? (e) => {
                e.stopPropagation()
                setSelectedBlockId(block.id)
              }
            : undefined
        }
        className={`absolute overflow-hidden rounded-lg transition-[transform,opacity,filter,box-shadow] duration-150 ${
          opts?.selectable
            ? selectedBlockId === block.id
              ? "border-2 border-sky-400 bg-white/10 shadow-[0_0_0_1px_rgba(56,189,248,0.35)]"
              : "border border-white/20 bg-white/10"
            : "border border-white/10 bg-white/10"
        }`}
        style={getSharedBlockStyle({
          x: block.x,
          y: block.y,
          width: block.width,
          height: block.height,
          zIndex: block.zIndex,
          opacity: block.opacity,
          scale: block.scale,
          rotation: block.rotation,
          blendMode: block.blendMode,
        })}
        data-blend-mode={block.blendMode ?? "normal"}
      >
        {opts?.showChrome ? (
          <div
            onMouseDown={
              opts?.selectable
                ? (e) => {
                    e.stopPropagation()
                    setSelectedBlockId(block.id)
                    startDraggingBlock(e, block.id)
                  }
                : undefined
            }
            className={`flex items-center justify-between rounded-t-lg border-b border-white/10 bg-black/40 px-2 py-1 text-[11px] font-semibold text-white/70 ${
              opts?.selectable ? "cursor-move" : "pointer-events-none"
            }`}
          >
            <div className="flex items-center gap-2 overflow-hidden">
              {block.locked ? (
                <span className="rounded-full border border-amber-300/16 bg-amber-400/[0.10] px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.10em] text-amber-100/70">
                  Lock
                </span>
              ) : null}

              {block.groupId ? (
                <span className="rounded-full border border-violet-300/16 bg-violet-400/[0.10] px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.10em] text-violet-100/70">
                  Group
                </span>
              ) : null}

              {block.timelineDurationMs ? (
                <span className="rounded-full border border-cyan-300/14 bg-cyan-400/[0.08] px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.10em] text-cyan-100/70">
                  Timeline
                </span>
              ) : null}

              <span className="truncate">{block.label || block.type}</span>
            </div>
            <span className="text-white/35">{opts?.selectable ? "Drag" : "Live"}</span>
          </div>
        ) : null}

        <div
          className={
            opts?.showChrome
              ? "h-[calc(100%-28px)] overflow-hidden rounded-b-lg"
              : "h-full w-full overflow-hidden"
          }
          style={{
            background:
              block.blendMode && block.blendMode !== "normal"
                ? "rgba(255,255,255,0.015)"
                : undefined,
          }}
        > 
          {renderBlockContent(block)}
        </div>

        {opts?.selectable && opts?.showChrome && !block.locked ? (
          <div
            onMouseDown={(e) => startResizingBlock(e, block.id)}
            className="absolute bottom-1 right-1 h-3 w-3 cursor-se-resize rounded-sm bg-white/70"
            title="Resize block"
          />
        ) : null}
      </div>
    ))
}

/*
  Blend Mode Notes
  ----------------
  The production canvas is now composition-aware.

  Current supported cinematic blend modes:
  - screen
  - multiply
  - overlay
  - soft-light
  - hard-light
  - lighten
  - darken
  - color-dodge
  - color-burn
  - difference
  - exclusion

  This establishes the foundation for:
  - glow passes
  - cinematic compositing
  - volumetric overlays
  - HUD graphics
  - atmospheric graphics
  - motion graphics layering
*/