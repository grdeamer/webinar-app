"use client"

import type { ReactNode } from "react"
import {
  Blend,
  Clock3,
  Eye,
  EyeOff,
  Layers3,
  Lock,
  Move,
  Network,
  Play,
  RotateCw,
  ScanLine,
  Sparkles,
  Sun,
  Type,
  Unlock,
  ZoomIn,
} from "lucide-react"

import type { PreviewBlock } from "./useProducerBlocks"

type SelectedBlockInspectorProps = {
  selectedBlock: PreviewBlock | null
  onToggleHidden: () => void
  onToggleLocked: () => void
  onUpdateOpacity: (value: string) => void
  onUpdateScale: (value: string) => void
  onUpdateRotation: (value: string) => void
  onUpdateBlur: (value: string) => void
  onUpdateGlow: (value: string) => void
  onUpdateGlowColor: (value: string) => void
  onUpdateBorderRadius: (value: string) => void
  onUpdateShadowIntensity: (value: string) => void
  onUpdateShadowColor: (value: string) => void
  onUpdateLabel: (value: string) => void
  onUpdateBlendMode: (value: string) => void
  onUpdateGroupId: (value: string) => void
  onUpdateTimelineStart: (value: string) => void
  onUpdateTimelineDuration: (value: string) => void
  onUpdateAnimationType: (value: string) => void
  onUpdateAnimationProgress: (value: string) => void
  onUpdatePosition: (field: "x" | "y", value: string) => void
  onUpdateSize: (field: "width" | "height", value: string) => void
  onUpdateSrc: (value: string) => void
  onUpdateTextContent: (value: string) => void
}

function SectionCard({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-[20px] border border-white/7 bg-[linear-gradient(180deg,rgba(255,255,255,0.026),rgba(255,255,255,0.010))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] ${className}`}
    >
      {children}
    </div>
  )
}

function SectionHeader({
  icon,
  title,
  badge,
}: {
  icon: ReactNode
  title: string
  badge?: string
}) {
  return (
    <div className="mb-3 flex min-w-0 items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.13em] text-white/34">
        <span className="shrink-0">{icon}</span>
        <span className="truncate">{title}</span>
      </div>

      {badge ? (
        <div className="shrink-0 rounded-full border border-white/8 bg-white/[0.026] px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.08em] text-white/30">
          {badge}
        </div>
      ) : null}
    </div>
  )
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
      <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/30">
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
      className="w-full rounded-2xl border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.014))] px-3 py-2.5 text-sm text-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] outline-none transition focus:border-violet-300/20 focus:bg-violet-400/[0.045]"
    />
  )
}

function InspectorSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="w-full rounded-2xl border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.016))] px-3 py-2 text-xs text-white/82 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] outline-none transition focus:border-violet-300/20 focus:bg-violet-400/[0.045]"
    />
  )
}

function InspectorSlider({
  label,
  icon,
  value,
  displayValue,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  icon: ReactNode
  value: number
  displayValue: string
  min: number
  max: number
  step: number
  onChange: (value: string) => void
}) {
  return (
    <div className="rounded-[18px] border border-white/6 bg-black/14 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.018)]">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-white/62">
          <span className="text-violet-100/58">{icon}</span>
          {label}
        </div>
        <div className="rounded-xl border border-white/8 bg-white/[0.026] px-2 py-1 text-xs font-semibold tabular-nums text-white/66">
          {displayValue}
        </div>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-2 w-full cursor-pointer accent-violet-300"
      />
    </div>
  )
}

function InspectorColorPicker({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="rounded-[18px] border border-white/6 bg-black/14 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.018)]">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-white/62">
          <span
            className="h-3 w-3 rounded-full border border-white/18 shadow-[0_0_10px_rgba(255,255,255,0.10)]"
            style={{ backgroundColor: value }}
          />
          {label}
        </div>
        <div className="rounded-xl border border-white/8 bg-white/[0.026] px-2 py-1 text-[10px] font-semibold tabular-nums text-white/52">
          {value}
        </div>
      </div>

      <div className="grid grid-cols-[42px_minmax(0,1fr)] items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-10 cursor-pointer rounded-xl border border-white/10 bg-transparent p-1"
        />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 rounded-xl border border-white/8 bg-white/[0.026] px-3 py-2 text-xs font-semibold text-white/72 outline-none transition focus:border-violet-300/20 focus:bg-violet-400/[0.045]"
          placeholder="#7dd3fc"
        />
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
  onUpdateBlur,
  onUpdateGlow,
  onUpdateGlowColor,
  onUpdateBorderRadius,
  onUpdateShadowIntensity,
  onUpdateShadowColor,
  onUpdateLabel,
  onUpdateBlendMode,
  onUpdateGroupId,
  onUpdateTimelineStart,
  onUpdateTimelineDuration,
  onUpdateAnimationType,
  onUpdateAnimationProgress,
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
  const blurValue = selectedBlock.blur ?? 0
  const glowValue = selectedBlock.glow ?? 0
  const glowColorValue = selectedBlock.glowColor ?? "#7dd3fc"
  const borderRadiusValue = selectedBlock.borderRadius ?? 18
  const shadowIntensityValue = selectedBlock.shadowIntensity ?? 0.35
  const shadowColorValue = selectedBlock.shadowColor ?? "#000000"
  const timelineStartValue = selectedBlock.timelineStartMs ?? 0
  const timelineDurationValue = selectedBlock.timelineDurationMs ?? 4000
  const animationTypeValue = selectedBlock.animationType ?? "none"
  const animationProgressValue = selectedBlock.animationProgress ?? 1

  return (
    <div className="mb-5 space-y-3 rounded-[26px] border border-white/8 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.045),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.026),rgba(255,255,255,0.010))] p-3 shadow-[0_18px_54px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.035)]">
      <div className="rounded-[24px] border border-violet-300/10 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.09),transparent_36%),rgba(255,255,255,0.020)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border border-violet-300/14 bg-violet-400/[0.08] text-violet-100/70 shadow-[0_0_22px_rgba(168,85,247,0.08)]">
            <Layers3 size={20} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-100/44">
                Selected Layer
              </div>
              <div className="rounded-full border border-violet-300/10 bg-violet-400/[0.06] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.13em] text-violet-100/48">
                {selectedBlock.type}
              </div>
            </div>

            <div className="mt-1 truncate text-lg font-semibold tracking-tight text-white/84">
              {selectedBlock.label || selectedBlock.type}
            </div>

            <div className="mt-1 text-sm leading-5 text-white/38">
              Layout, transform, and source settings
            </div>
          </div>
        </div>
      </div>

      <SectionCard>
        <SectionHeader icon={<ScanLine size={13} />} title="Visibility" />

        <div className="rounded-[18px] border border-white/6 bg-black/16 px-3 py-3 text-sm text-white/52">
          {selectedBlock.hidden ? "Layer hidden from output" : "Layer visible in output"}
        </div>

        <button
          type="button"
          onClick={onToggleHidden}
          className={`mt-3 flex w-full items-center justify-center gap-2 rounded-[18px] border px-4 py-3 text-sm font-semibold transition-all hover:-translate-y-px ${
            selectedBlock.hidden
              ? "border-emerald-300/22 bg-emerald-400/[0.08] text-emerald-100/76 shadow-[0_0_14px_rgba(52,211,153,0.06)]"
              : "border-amber-300/18 bg-amber-400/[0.06] text-amber-100/68 shadow-[0_0_10px_rgba(251,191,36,0.04)]"
          }`}
        >
          {selectedBlock.hidden ? <Eye size={15} /> : <EyeOff size={15} />}
          {selectedBlock.hidden ? "Show Layer" : "Hide Layer"}
        </button>
      </SectionCard>

      <div className="grid grid-cols-1 gap-3">
        <SectionCard>
          <SectionHeader
            icon={selectedBlock.locked ? <Lock size={13} /> : <Unlock size={13} />}
            title="Layer Lock"
            badge={selectedBlock.locked ? "Lock" : "Open"}
          />

          <div className="text-sm font-semibold leading-5 text-white/68">
            {selectedBlock.locked ? "Protected from canvas edits" : "Editable on canvas"}
          </div>

          <button
            type="button"
            onClick={onToggleLocked}
            className={`mt-3 flex h-9 w-full items-center justify-center rounded-[15px] border text-[10px] font-black uppercase tracking-[0.11em] transition ${
              selectedBlock.locked
                ? "border-amber-300/20 bg-amber-400/[0.08] text-amber-100/70 hover:bg-amber-400/[0.12]"
                : "border-emerald-300/18 bg-emerald-400/[0.07] text-emerald-100/68 hover:bg-emerald-400/[0.12]"
            }`}
          >
            {selectedBlock.locked ? "Unlock" : "Lock"}
          </button>
        </SectionCard>

        <SectionCard>
          <SectionHeader icon={<Blend size={12} />} title="Blend Mode" badge="Blend" />
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
        </SectionCard>
      </div>

      <SectionCard>
        <SectionHeader icon={<Sparkles size={13} />} title="Transform" badge="Visual" />

        <div className="space-y-2">
          <InspectorSlider
            label="Opacity"
            icon={<ScanLine size={14} />}
            value={opacityValue}
            displayValue={`${Math.round(opacityValue * 100)}%`}
            min={0.1}
            max={1}
            step={0.05}
            onChange={onUpdateOpacity}
          />

          <InspectorSlider
            label="Scale"
            icon={<ZoomIn size={14} />}
            value={scaleValue}
            displayValue={`${Math.round(scaleValue * 100)}%`}
            min={0.1}
            max={4}
            step={0.05}
            onChange={onUpdateScale}
          />

          <InspectorSlider
            label="Rotate"
            icon={<RotateCw size={14} />}
            value={rotationValue}
            displayValue={`${rotationValue}°`}
            min={-180}
            max={180}
            step={1}
            onChange={onUpdateRotation}
          />
        </div>
      </SectionCard>

      <SectionCard>
        <SectionHeader icon={<Sun size={13} />} title="Appearance" badge="Style" />

        <div className="space-y-2">
          <InspectorSlider
            label="Blur"
            icon={<Sparkles size={14} />}
            value={blurValue}
            displayValue={`${blurValue}px`}
            min={0}
            max={40}
            step={1}
            onChange={onUpdateBlur}
          />

          <InspectorSlider
            label="Glow"
            icon={<Sun size={14} />}
            value={glowValue}
            displayValue={`${Math.round(glowValue * 100)}%`}
            min={0}
            max={1}
            step={0.05}
            onChange={onUpdateGlow}
          />

          <InspectorColorPicker
            label="Glow Color"
            value={glowColorValue}
            onChange={onUpdateGlowColor}
          />

          <InspectorSlider
            label="Radius"
            icon={<Layers3 size={14} />}
            value={borderRadiusValue}
            displayValue={`${borderRadiusValue}px`}
            min={0}
            max={120}
            step={1}
            onChange={onUpdateBorderRadius}
          />

          <InspectorSlider
            label="Shadow"
            icon={<ScanLine size={14} />}
            value={shadowIntensityValue}
            displayValue={`${Math.round(shadowIntensityValue * 100)}%`}
            min={0}
            max={1}
            step={0.05}
            onChange={onUpdateShadowIntensity}
          />

          <InspectorColorPicker
            label="Shadow Color"
            value={shadowColorValue}
            onChange={onUpdateShadowColor}
          />
        </div>
      </SectionCard>

      <SectionCard>
        <SectionHeader icon={<Play size={13} />} title="Motion" badge="Timeline" />

        <div className="space-y-3">
          <InspectorField label="Animation Type">
            <InspectorSelect
              value={animationTypeValue}
              onChange={(e) => onUpdateAnimationType(e.target.value)}
            >
              <option value="none">None</option>
              <option value="fade">Fade</option>
              <option value="drift">Drift</option>
              <option value="push-left">Push Left</option>
              <option value="push-right">Push Right</option>
              <option value="push-up">Push Up</option>
              <option value="push-down">Push Down</option>
            </InspectorSelect>
          </InspectorField>

          <InspectorSlider
            label="Progress"
            icon={<Clock3 size={14} />}
            value={animationProgressValue}
            displayValue={`${Math.round(animationProgressValue * 100)}%`}
            min={0}
            max={1}
            step={0.05}
            onChange={onUpdateAnimationProgress}
          />

          <div className="grid gap-3 xl:grid-cols-2">
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
      </SectionCard>

      <SectionCard>
        <SectionHeader icon={<Network size={13} />} title="Grouping" badge="Scene Graph" />
        <InspectorField label="Group ID">
          <InspectorInput
            value={selectedBlock.groupId || ""}
            onChange={(e) => onUpdateGroupId(e.target.value)}
            placeholder="Optional group key"
          />
        </InspectorField>
      </SectionCard>

      <SectionCard>
        <SectionHeader icon={<Move size={13} />} title="Layout Controls" badge="Canvas" />
        <div className="grid gap-3 xl:grid-cols-2">
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
      </SectionCard>

      <div className="grid gap-3 xl:grid-cols-2">
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
  )
}