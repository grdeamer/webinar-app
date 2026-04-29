import type { JSX } from "react"
import type { PreviewBlock } from "./useProducerBlocks"

export function renderBlockContent(block: PreviewBlock): JSX.Element | null {
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
        className={`absolute overflow-hidden rounded-lg ${
          opts?.selectable
            ? selectedBlockId === block.id
              ? "border-2 border-sky-400 bg-white/10 shadow-[0_0_0_1px_rgba(56,189,248,0.35)]"
              : "border border-white/20 bg-white/10"
            : "border border-white/10 bg-white/10"
        }`}
        style={{
          left: block.x,
          top: block.y,
          width: block.width,
          height: block.height,
          zIndex: block.zIndex,
          opacity: block.opacity ?? 1,
        }}
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
            <span>{block.label || block.type}</span>
            <span className="text-white/35">{opts?.selectable ? "Drag" : "Live"}</span>
          </div>
        ) : null}

        <div
          className={
            opts?.showChrome
              ? "h-[calc(100%-28px)] overflow-hidden rounded-b-lg"
              : "h-full w-full overflow-hidden"
          }
        >
          {renderBlockContent(block)}
        </div>

        {opts?.selectable && opts?.showChrome ? (
          <div
            onMouseDown={(e) => startResizingBlock(e, block.id)}
            className="absolute bottom-1 right-1 h-3 w-3 cursor-se-resize rounded-sm bg-white/70"
            title="Resize block"
          />
        ) : null}
      </div>
    ))
}