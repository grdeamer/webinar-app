"use client"

import type { PreviewBlock } from "./useProducerBlocks"

type SelectedBlockInspectorProps = {
  selectedBlock: PreviewBlock | null
  onToggleHidden: () => void
  onUpdateOpacity: (value: string) => void
  onUpdateLabel: (value: string) => void
  onUpdatePosition: (field: "x" | "y", value: string) => void
  onUpdateSize: (field: "width" | "height", value: string) => void
  onUpdateSrc: (value: string) => void
  onUpdateTextContent: (value: string) => void
}

export default function SelectedBlockInspector({
  selectedBlock,
  onToggleHidden,
  onUpdateOpacity,
  onUpdateLabel,
  onUpdatePosition,
  onUpdateSize,
  onUpdateSrc,
  onUpdateTextContent,
}: SelectedBlockInspectorProps) {
  if (!selectedBlock) {
    return (
      <div className="mb-5 rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] p-6 text-sm text-white/35">
        Select a preview block to edit its properties.
      </div>
    )
  }

  return (
    <div className="mb-5 rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
            Selected Block
          </div>
          <div className="text-sm text-white/70">
            {selectedBlock.label || selectedBlock.type}
          </div>
        </div>

        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
          {selectedBlock.type}
        </span>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={onToggleHidden}
          className={`rounded-xl px-4 py-2 text-sm font-semibold ${
            selectedBlock.hidden
              ? "border border-amber-300/30 bg-amber-400/10 text-amber-200"
              : "border border-emerald-300/30 bg-emerald-400/10 text-emerald-200"
          }`}
        >
          {selectedBlock.hidden ? "Show Block" : "Hide Block"}
        </button>

        <span className="text-sm text-white/50">
          {selectedBlock.hidden ? "Currently hidden" : "Currently visible"}
        </span>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
            Opacity
          </label>
          <input
            type="number"
            min={0.1}
            max={1}
            step={0.05}
            value={selectedBlock.opacity ?? 1}
            onChange={(e) => onUpdateOpacity(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
              Label
            </label>
            <input
              value={selectedBlock.label || ""}
              onChange={(e) => onUpdateLabel(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
              placeholder="Block label"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
              Type
            </label>
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70">
              {selectedBlock.type}
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
              X
            </label>
            <input
              type="number"
              min={0}
              value={selectedBlock.x}
              onChange={(e) => onUpdatePosition("x", e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
              Y
            </label>
            <input
              type="number"
              min={0}
              value={selectedBlock.y}
              onChange={(e) => onUpdatePosition("y", e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
              Width
            </label>
            <input
              type="number"
              min={80}
              value={selectedBlock.width}
              onChange={(e) => onUpdateSize("width", e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
              Height
            </label>
            <input
              type="number"
              min={60}
              value={selectedBlock.height}
              onChange={(e) => onUpdateSize("height", e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
            />
          </div>
        </div>

        {selectedBlock.type === "video" ||
        selectedBlock.type === "pdf" ||
        selectedBlock.type === "image" ? (
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
              Source URL
            </label>
            <input
              value={selectedBlock.src || ""}
              onChange={(e) => onUpdateSrc(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
              placeholder="https://..."
            />
          </div>
        ) : null}

        {selectedBlock.type === "text" ? (
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
              Text Content
            </label>
            <input
              value={selectedBlock.content || ""}
              onChange={(e) => onUpdateTextContent(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
              placeholder="Enter text..."
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}