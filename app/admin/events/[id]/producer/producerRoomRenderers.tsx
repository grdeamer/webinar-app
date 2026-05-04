import type { JSX } from "react"
import type { PreviewBlock } from "./useProducerBlocks"

function getSlidePageFromLabel(label?: string): number | null {
  if (!label) return null

  const match = label.match(/Slide\s+(\d+)/i)
  if (!match?.[1]) return null

  const page = Number(match[1])
  return Number.isFinite(page) && page > 0 ? page : null
}

function getPdfPageSrc(src: string, page: number | null): string {
  if (!page) return src

  const [baseSrc] = src.split("#")
  return `${baseSrc}#page=${page}&toolbar=0&navpanes=0&scrollbar=0`
}

function getNextPdfPageSrc(src: string, page: number | null): string | null {
  if (!page) return null
  return getPdfPageSrc(src, page + 1)
}

export function renderBlockContent(block: PreviewBlock): JSX.Element | null {
  if (block.type === "text") {
    return <div className="p-2 text-sm">{block.content}</div>
  }

  if (block.type === "video" && block.src) {
    return (
      <video
        src={block.src}
        controls
        muted
        playsInline
        className="h-full w-full object-cover"
      />
    )
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

  if (block.type === "pdf") {
    // If we have a src, render the PDF. Otherwise show a styled slide placeholder.
    if (block.src) {
      const page = getSlidePageFromLabel(block.label)
      const src = getPdfPageSrc(block.src, page)
      const nextSrc = getNextPdfPageSrc(block.src, page)

      return (
        <div className="relative h-full w-full overflow-hidden bg-white">
          <iframe
            key={src}
            src={src}
            className="relative z-10 h-full w-full transition-opacity duration-200"
            title={block.label || "PDF"}
          />

          {nextSrc ? (
            <iframe
              aria-hidden="true"
              tabIndex={-1}
              src={nextSrc}
              className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-0"
              title={`${block.label || "PDF"} next page preload`}
            />
          ) : null}

          {block.label ? (
            <div className="pointer-events-none absolute bottom-2 left-2 z-20 rounded bg-black/60 px-2 py-1 text-[10px] font-semibold text-white shadow-[0_0_12px_rgba(0,0,0,0.25)]">
              {block.label}
              {page ? <span className="ml-1 text-white/60">· page {page}</span> : null}
            </div>
          ) : null}

          {page ? (
            <div className="pointer-events-none absolute right-2 top-2 z-20 rounded bg-black/50 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/70 shadow-[0_0_12px_rgba(0,0,0,0.2)]">
              Preloading {page + 1}
            </div>
          ) : null}
        </div>
      )
    }

    // Placeholder (before real PDF pages are wired)
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <div className="text-center">
          <div className="text-lg font-bold opacity-80">Slide</div>
          <div className="mt-1 text-sm opacity-60">{block.label || "PDF"}</div>
        </div>
      </div>
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