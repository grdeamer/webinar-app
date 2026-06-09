"use client"

import type { ReactNode } from "react"
import {
  Eye,
  EyeOff,
  Layers3,
  Move,
  RotateCw,
  ScanLine,
  Sparkles,
  Type,
  ZoomIn,
  Lock,
  Unlock,
  Blend,
  Clock3,
  Network,
} from "lucide-react"

import type { PreviewBlock } from "./useProducerBlocks"

type SelectedBlockInspectorProps = {
  selectedBlock: PreviewBlock | null
  onToggleHidden: () => void
  onToggleLocked: () => void
  onUpdateOpacity: (value: string) => void
  onUpdateScale: (value: string) => void
  onUpdateRotation: (value: string) => void
  onUpdateLabel: (value: string) => void
  onUpdateBlendMode: (value: string) => void
  onUpdateGroupId: (value: string) => void
  onUpdateTimelineStart: (value: string) => void
  onUpdateTimelineDuration: (value: string) => void
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
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/28">
        <span className="h-1.5 w-1.5 rounded-full bg-violet-300/60 shadow-[0_0_5px_rgba(196,181,253,0.28)]" />
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
      className="w-full rounded-2xl border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.012))] px-3 py-2.5 text-sm text-white/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] outline-none transition focus:border-violet-300/16 focus:bg-violet-400/[0.04]"
    />
  )
}

function InspectorSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="w-full rounded-2xl border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.012))] px-3 py-2.5 text-sm text-white/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] outline-none transition focus:border-violet-300/16 focus:bg-violet-400/[0.04]"
    />
  )
}

function InspectorReadout({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-white/6 bg-white/[0.018] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
      <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.14em] text-white/24">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold tabular-nums text-white/62">
        {value}
      </div>
    </div>
  )
}

export default function SelectedBlockInspector({
  selectedBlock,
  onToggleHidden,
  onToggleLocked,
  onUpdateOpacity,
  onUpdateScale,
  onUpdateRotation,
  onUpdateLabel,
  onUpdateBlendMode,
  onUpdateGroupId,
  onUpdateTimelineStart,
  onUpdateTimelineDuration,
  onUpdatePosition,
  onUpdateSize,
  onUpdateSrc,
  onUpdateTextContent,
}: SelectedBlockInspectorProps) {
  if (!selectedBlock) {
    return (
      <div className="mb-5 rounded-[24px] border border-dashed border-violet-300/8 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.05),transparent_34%),rgba(255,255,255,0.012)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-violet-100/42">
          <Sparkles size={13} />
          Inspector Ready
        </div>

        <div className="mt-2 text-sm leading-6 text-white/32">
          Select a layer to adjust layout, visibility, transforms, and media settings.
        </div>
      </div>
    )
  }

  const opacityValue = selectedBlock.opacity ?? 1
  const scaleValue = selectedBlock.scale ?? 1
  const rotationValue = selectedBlock.rotation ?? 0
  const timelineStartValue = selectedBlock.timelineStartMs ?? 0
  const timelineDurationValue = selectedBlock.timelineDurationMs ?? 4000

  return (
    <div className="mb-5 rounded-[24px] border border-white/8 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.04),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.022),rgba(255,255,255,0.01))] p-4 shadow-[0_18px_54px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className="mb-4 flex items-start justify-between gap-3 rounded-[22px] border border-violet-300/8 bg-violet-400/[0.035] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-violet-100/44">
            <Layers3 size={13} />
            Selected Layer
          </div>

          <div className="mt-1 text-base font-semibold tracking-tight text-white/78">
            {selectedBlock.label || selectedBlock.type}
          </div>

          <div className="mt-1 text-xs text-white/32">
            Layout, transform, and source settings
          </div>
        </div>

        <div className="rounded-full border border-violet-300/10 bg-violet-400/[0.06] px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-violet-100/46 shadow-[0_0_8px_rgba(168,85,247,0.04)]">
          {selectedBlock.type}
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3 rounded-[22px] border border-white/8 bg-black/16 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/28">
            <ScanLine size={12} />
            Visibility
          </div>

          <div className="mt-1 text-sm text-white/42">
            {selectedBlock.hidden ? "Layer hidden from output" : "Layer visible in output"}
          </div>
        </div>

        <button
          onClick={onToggleHidden}
          className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold transition-all hover:-translate-y-px ${
            selectedBlock.hidden
              ? "border-amber-300/14 bg-amber-400/[0.07] text-amber-100/62 shadow-[0_0_6px_rgba(251,191,36,0.03)]"
              : "border-emerald-300/14 bg-emerald-400/[0.07] text-emerald-100/62 shadow-[0_0_6px_rgba(52,211,153,0.03)]"
          }`}
        >
          {selectedBlock.hidden ? <Eye size={15} /> : <EyeOff size={15} />}
          {selectedBlock.hidden ? "Show Layer" : "Hide Layer"}
        </button>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <button
          type="button"
          onClick={onToggleLocked}
          className={`flex items-center justify-between gap-3 rounded-[22px] border px-3 py-3 text-left transition-all hover:-translate-y-px ${
            selectedBlock.locked
              ? "border-amber-300/14 bg-amber-400/[0.07] text-amber-100/66 shadow-[0_0_10px_rgba(251,191,36,0.04)]"
              : "border-white/8 bg-black/16 text-white/48 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]"
          }`}
        >
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/32">
              {selectedBlock.locked ? <Lock size={12} /> : <Unlock size={12} />}
              Layer Lock
            </div>
            <div className="mt-1 text-sm font-semibold text-white/62">
              {selectedBlock.locked ? "Protected from canvas edits" : "Editable on canvas"}
            </div>
          </div>
          <span className="rounded-full border border-white/8 bg-white/[0.026] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-white/34">
            {selectedBlock.locked ? "Locked" : "Open"}
          </span>
        </button>

        <div className="rounded-[22px] border border-white/8 bg-black/16 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/32">
            <Blend size={12} />
            Blend Mode
          </div>
          <div className="mt-2">
            <InspectorSelect
              value={selectedBlock.blendMode ?? "normal"}
              onChange={(e) => onUpdateBlendMode(e.target.value)}
            >
              <option value="normal">Normal</option>
              <option value="screen">Screen</option>
              <option value="multiply">Multiply</option>
              <option value="overlay">Overlay</option>
              <option value="soft-light">Soft Light</option>
              <option value="hard-light">Hard Light</option>
              <option value="color-dodge">Color Dodge</option>
              <option value="color-burn">Color Burn</option>
              <option value="lighten">Lighten</option>
              <option value="darken">Darken</option>
              <option value="difference">Difference</option>
              <option value="exclusion">Exclusion</option>
            </InspectorSelect>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-[22px] border border-white/6 bg-black/14 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/28">
              <Sparkles size={13} className="text-violet-100/58" />
              Transform
            </div>

            <div className="rounded-full border border-white/8 bg-white/[0.022] px-2 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-white/24">
              Visual
            </div>
          </div>

          <div className="mb-3 grid gap-2 md:grid-cols-3">
            <InspectorReadout
              icon={<ScanLine size={11} className="text-violet-200/48" />}
              label="Opacity"
              value={`${Math.round(opacityValue * 100)}%`}
            />
            <InspectorReadout
              icon={<ZoomIn size={11} className="text-violet-200/48" />}
              label="Scale"
              value={`${scaleValue.toFixed(2)}x`}
            />
            <InspectorReadout
              icon={<RotateCw size={11} className="text-violet-200/48" />}
              label="Rotate"
              value={`${rotationValue}°`}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <InspectorField label="Opacity">
              <InspectorInput
                type="number"
                min={0.1}
                max={1}
                step={0.05}
                value={opacityValue}
                onChange={(e) => onUpdateOpacity(e.target.value)}
              />
            </InspectorField>

            <InspectorField label="Scale">
              <InspectorInput
                type="number"
                min={0.1}
                max={4}
                step={0.05}
                value={scaleValue}
                onChange={(e) => onUpdateScale(e.target.value)}
              />
            </InspectorField>

            <InspectorField label="Rotation">
              <InspectorInput
                type="number"
                min={-180}
                max={180}
                step={1}
                value={rotationValue}
                onChange={(e) => onUpdateRotation(e.target.value)}
              />
            </InspectorField>
          </div>
        </div>

        <div className="rounded-[22px] border border-white/6 bg-black/14 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/28">
              <Clock3 size={13} className="text-cyan-100/58" />
              Timeline
            </div>

            <div className="rounded-full border border-cyan-300/10 bg-cyan-400/[0.045] px-2 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-cyan-100/38">
              Animation Ready
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <InspectorField label="Start MS">
              <InspectorInput
                type="number"
                min={0}
                step={100}
                value={timelineStartValue}
                onChange={(e) => onUpdateTimelineStart(e.target.value)}
              />
            </InspectorField>

            <InspectorField label="Duration MS">
              <InspectorInput
                type="number"
                min={100}
                step={100}
                value={timelineDurationValue}
                onChange={(e) => onUpdateTimelineDuration(e.target.value)}
              />
            </InspectorField>
          </div>
        </div>

        <div className="rounded-[22px] border border-white/6 bg-black/14 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/28">
              <Network size={13} className="text-violet-100/58" />
              Grouping
            </div>

            <div className="rounded-full border border-violet-300/10 bg-violet-400/[0.045] px-2 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-violet-100/38">
              Scene Graph
            </div>
          </div>

          <InspectorField label="Group ID">
            <InspectorInput
              value={selectedBlock.groupId || ""}
              onChange={(e) => onUpdateGroupId(e.target.value)}
              placeholder="Optional group key"
            />
          </InspectorField>
        </div>

        <div className="rounded-[22px] border border-white/6 bg-black/14 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/28">
              <Move size={13} className="text-violet-100/58" />
              Layout Controls
            </div>

            <div className="rounded-full border border-white/8 bg-white/[0.022] px-2 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-white/24">
              Canvas
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <InspectorField label="X Position">
              <InspectorInput
                type="number"
                min={0}
                value={selectedBlock.x}
                onChange={(e) => onUpdatePosition("x", e.target.value)}
              />
            </InspectorField>

            <InspectorField label="Y Position">
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
          <InspectorField label="Label">
            <InspectorInput
              value={selectedBlock.label || ""}
              onChange={(e) => onUpdateLabel(e.target.value)}
              placeholder="Layer label"
            />
          </InspectorField>

          <InspectorField label="Type">
            <div className="flex items-center gap-2 rounded-2xl border border-white/8 bg-black/16 px-3 py-2.5 text-sm text-white/56 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
              <Type size={14} className="text-violet-200/60" />
              {selectedBlock.type}
            </div>
          </InspectorField>
        </div>

        {(selectedBlock.type === "video" ||
          selectedBlock.type === "pdf" ||
          selectedBlock.type === "image") && (
          <InspectorField label="Source URL">
            <InspectorInput
              value={selectedBlock.src || ""}
              onChange={(e) => onUpdateSrc(e.target.value)}
              placeholder="https://..."
            />
          </InspectorField>
        )}

        {selectedBlock.type === "text" && (
          <InspectorField label="Text">
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