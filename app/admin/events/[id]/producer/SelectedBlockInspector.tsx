"use client"

import {
  Eye,
  EyeOff,
  Layers3,
  Move,
  ScanLine,
  Sparkles,
  Type,
} from "lucide-react"

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

function InspectorField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/36">
        <span className="h-1.5 w-1.5 rounded-full bg-violet-300/70 shadow-[0_0_8px_rgba(196,181,253,0.65)]" />
        {label}
      </label>
      {children}
    </div>
  )
}

function InspectorInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] px-3 py-2.5 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] outline-none transition focus:border-violet-300/22 focus:bg-violet-400/[0.06]"
    />
  )
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
      <div className="mb-5 rounded-[28px] border border-dashed border-violet-300/12 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.08),transparent_34%),rgba(255,255,255,0.02)] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-violet-100/56">
          <Sparkles size={13} />
          Layer Inspector Idle
        </div>

        <div className="mt-2 text-sm leading-6 text-white/42">
          Select a preview block to inspect routing, composition, visibility, and media properties.
        </div>
      </div>
    )
  }

  return (
    <div className="mb-5 rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.08),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.018))] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="mb-4 flex items-start justify-between gap-3 rounded-[24px] border border-violet-300/12 bg-violet-400/[0.05] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-violet-100/60">
            <Layers3 size={13} />
            Selected Layer
          </div>

          <div className="mt-1 text-base font-semibold tracking-tight text-white">
            {selectedBlock.label || selectedBlock.type}
          </div>

          <div className="mt-1 text-xs text-white/42">
            Live composition + routing properties
          </div>
        </div>

        <div className="rounded-full border border-violet-300/14 bg-violet-400/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-violet-100/60 shadow-[0_0_18px_rgba(168,85,247,0.1)]">
          {selectedBlock.type}
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3 rounded-[24px] border border-white/10 bg-black/20 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/36">
            <ScanLine size={12} />
            Layer Visibility
          </div>

          <div className="mt-1 text-sm text-white/56">
            {selectedBlock.hidden ? "Currently hidden from composition" : "Currently routed to composition"}
          </div>
        </div>

        <button
          onClick={onToggleHidden}
          className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold transition-all ${
            selectedBlock.hidden
              ? "border-amber-300/24 bg-amber-400/10 text-amber-100 shadow-[0_0_18px_rgba(251,191,36,0.08)]"
              : "border-emerald-300/24 bg-emerald-400/10 text-emerald-100 shadow-[0_0_18px_rgba(52,211,153,0.08)]"
          }`}
        >
          {selectedBlock.hidden ? <Eye size={15} /> : <EyeOff size={15} />}
          {selectedBlock.hidden ? "Show Layer" : "Hide Layer"}
        </button>
      </div>

      <div className="space-y-4">
        <InspectorField label="Opacity">
          <InspectorInput
            type="number"
            min={0.1}
            max={1}
            step={0.05}
            value={selectedBlock.opacity ?? 1}
            onChange={(e) => onUpdateOpacity(e.target.value)}
          />
        </InspectorField>

        <div className="rounded-[24px] border border-white/8 bg-black/18 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/36">
              <Move size={13} className="text-violet-100/58" />
              Geometry Controls
            </div>

            <div className="rounded-full border border-white/10 bg-white/[0.035] px-2 py-1 text-[8px] font-black uppercase tracking-[0.14em] text-white/34">
              Canvas Space
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
          <InspectorField label="Position X">
            <InspectorInput
              type="number"
              min={0}
              value={selectedBlock.x}
              onChange={(e) => onUpdatePosition("x", e.target.value)}
            />
          </InspectorField>
          <InspectorField label="Position Y">
            <InspectorInput
              type="number"
              min={0}
              value={selectedBlock.y}
              onChange={(e) => onUpdatePosition("y", e.target.value)}
            />
          </InspectorField>
          <InspectorField label="Width">
            <InspectorInput
              type="number"
              min={80}
              value={selectedBlock.width}
              onChange={(e) => onUpdateSize("width", e.target.value)}
            />
          </InspectorField>
          <InspectorField label="Height">
            <InspectorInput
              type="number"
              min={60}
              value={selectedBlock.height}
              onChange={(e) => onUpdateSize("height", e.target.value)}
            />
          </InspectorField>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <InspectorField label="Layer Label">
            <InspectorInput
              value={selectedBlock.label || ""}
              onChange={(e) => onUpdateLabel(e.target.value)}
              placeholder="Layer label"
            />
          </InspectorField>
          <InspectorField label="Layer Type">
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <Type size={14} className="text-violet-200/60" />
              {selectedBlock.type}
            </div>
          </InspectorField>
        </div>

        {(selectedBlock.type === "video" ||
          selectedBlock.type === "pdf" ||
          selectedBlock.type === "image") && (
          <InspectorField label="Media Source">
            <InspectorInput
              value={selectedBlock.src || ""}
              onChange={(e) => onUpdateSrc(e.target.value)}
              placeholder="https://..."
            />
          </InspectorField>
        )}

        {selectedBlock.type === "text" && (
          <InspectorField label="Text Content">
            <InspectorInput
              value={selectedBlock.content || ""}
              onChange={(e) => onUpdateTextContent(e.target.value)}
              placeholder="Enter text..."
            />
          </InspectorField>
        )}
      </div>
    </div>
  )
}