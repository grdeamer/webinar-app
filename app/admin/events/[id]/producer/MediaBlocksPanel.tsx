import type { JSX } from "react"

function UtilityButton({
  children,
  onClick,
  disabled = false,
  tone = "default",
}: {
  children: string
  onClick: () => void
  disabled?: boolean
  tone?: "default" | "primary" | "danger"
}): JSX.Element {
  const toneClass =
    tone === "primary"
      ? "border-sky-200/18 bg-white/[0.82] text-slate-950 shadow-[0_10px_28px_rgba(255,255,255,0.08)] hover:bg-white/90"
      : tone === "danger"
        ? "border-red-300/18 bg-red-500/[0.08] text-red-100/76 hover:bg-red-500/[0.12]"
        : "border-white/10 bg-white/[0.04] text-white/68 hover:bg-white/[0.06] hover:text-white/82"

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl border px-3 py-1.5 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${toneClass}`}
    >
      {children}
    </button>
  )
}

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
    <div className="relative overflow-hidden rounded-[28px] border border-white/6 bg-[linear-gradient(180deg,rgba(10,14,24,0.94),rgba(5,8,16,0.985))] p-3 shadow-[0_18px_54px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.028)]">
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/16 to-transparent" />

      <div className="relative z-10 mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/38">
            Add Blocks / Upload Media
          </div>
          <div className="mt-0.5 text-[11px] text-white/28">
            Build overlays and manage selected block actions.
          </div>
        </div>

        <span className="rounded-full border border-white/8 bg-white/[0.035] px-2.5 py-1 text-[10px] font-semibold text-white/52">
          Preview blocks: {previewBlocksCount}
        </span>
      </div>

      <div className="relative z-10 flex flex-wrap items-center gap-2">
        <UtilityButton onClick={onAddText}>Add Text</UtilityButton>
        <UtilityButton onClick={onAddVideo}>Add Video</UtilityButton>
        <UtilityButton onClick={onAddPdf}>Add PDF</UtilityButton>
        <UtilityButton onClick={onAddImage}>Add Image</UtilityButton>

        <div className="mx-0.5 h-6 w-px bg-white/8" />

        <UtilityButton onClick={onUploadPdf} tone="primary">
          Upload PDF
        </UtilityButton>
        <UtilityButton onClick={onUploadVideo} tone="primary">
          Upload Video
        </UtilityButton>
        <UtilityButton onClick={onUploadImage} tone="primary">
          Upload Image
        </UtilityButton>

        <div className="mx-0.5 h-6 w-px bg-white/8" />

        <UtilityButton onClick={onDuplicate} disabled={!hasSelectedBlock}>
          Duplicate
        </UtilityButton>
        <UtilityButton onClick={onBringToFront} disabled={!hasSelectedBlock}>
          Bring To Front
        </UtilityButton>
        <UtilityButton onClick={onDelete} disabled={!hasSelectedBlock} tone="danger">
          Delete
        </UtilityButton>
      </div>
    </div>
  )
}