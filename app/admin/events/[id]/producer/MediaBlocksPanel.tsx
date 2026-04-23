import type { JSX } from "react"

export default function MediaBlocksPanel({
  previewBlocksCount,
  onAddText,
  onAddVideo,
  onAddPdf,
  onAddImage,
  onUploadPdf,
  onUploadVideo,
  onUploadImage,
  onDuplicate,
  onBringToFront,
  onDelete,
  hasSelectedBlock,
}: {
  previewBlocksCount: number
  onAddText: () => void
  onAddVideo: () => void
  onAddPdf: () => void
  onAddImage: () => void
  onUploadPdf: () => void
  onUploadVideo: () => void
  onUploadImage: () => void
  onDuplicate: () => void
  onBringToFront: () => void
  onDelete: () => void
  hasSelectedBlock: boolean
}): JSX.Element {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
        Add Blocks / Upload Media
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={onAddText}
          className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Add Text
        </button>

        <button
          onClick={onAddVideo}
          className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Add Video
        </button>

        <button
          onClick={onAddPdf}
          className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Add PDF
        </button>

        <button
          onClick={onAddImage}
          className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Add Image
        </button>

        <button
          onClick={onUploadPdf}
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-white/90"
        >
          Upload PDF
        </button>

        <button
          onClick={onUploadVideo}
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-white/90"
        >
          Upload Video
        </button>

        <button
          onClick={onUploadImage}
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-white/90"
        >
          Upload Image
        </button>

        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
          Preview blocks: {previewBlocksCount}
        </span>

        <button
          onClick={onDuplicate}
          disabled={!hasSelectedBlock}
          className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40 hover:bg-white/10"
        >
          Duplicate
        </button>

        <button
          onClick={onBringToFront}
          disabled={!hasSelectedBlock}
          className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40 hover:bg-white/10"
        >
          Bring To Front
        </button>

        <button
          onClick={onDelete}
          disabled={!hasSelectedBlock}
          className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 transition disabled:cursor-not-allowed disabled:opacity-40 hover:bg-red-500/15"
        >
          Delete
        </button>
      </div>
    </div>
  )
}