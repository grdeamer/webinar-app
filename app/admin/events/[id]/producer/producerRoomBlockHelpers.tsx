import type { CSSProperties, JSX } from "react"
import type { PreviewBlock } from "./useProducerBlocks"

type CameraSlotAccentTone = {
  rgb: string
  border: string
  glow: string
  badge: string
}

function getCameraSlotAccentTone(accentId?: string | null): CameraSlotAccentTone {
  switch (accentId) {
    case "violet":
      return {
        rgb: "168,85,247",
        border: "border-violet-300/34",
        glow: "shadow-[0_0_42px_rgba(168,85,247,0.24)]",
        badge: "bg-violet-400/[0.10] text-violet-100/62 border-violet-200/16",
      }

    case "cyan":
      return {
        rgb: "34,211,238",
        border: "border-cyan-300/34",
        glow: "shadow-[0_0_42px_rgba(34,211,238,0.22)]",
        badge: "bg-cyan-400/[0.10] text-cyan-100/62 border-cyan-200/16",
      }

    case "green":
      return {
        rgb: "16,185,129",
        border: "border-emerald-300/34",
        glow: "shadow-[0_0_42px_rgba(16,185,129,0.22)]",
        badge: "bg-emerald-400/[0.10] text-emerald-100/62 border-emerald-200/16",
      }

    case "amber":
      return {
        rgb: "251,191,36",
        border: "border-amber-300/34",
        glow: "shadow-[0_0_42px_rgba(251,191,36,0.22)]",
        badge: "bg-amber-400/[0.10] text-amber-100/62 border-amber-200/16",
      }

    case "rose":
      return {
        rgb: "244,63,94",
        border: "border-rose-300/34",
        glow: "shadow-[0_0_42px_rgba(244,63,94,0.22)]",
        badge: "bg-rose-400/[0.10] text-rose-100/62 border-rose-200/16",
      }

    default:
      return {
        rgb: "125,211,252",
        border: "border-sky-300/26",
        glow: "shadow-[0_0_38px_rgba(125,211,252,0.18)]",
        badge: "bg-sky-400/[0.08] text-sky-100/52 border-sky-200/14",
      }
  }
}

function getCameraSlotInitials(label: string): string {
  const cleanedLabel = label.trim()

  if (!cleanedLabel) return "CS"

  const parts = cleanedLabel
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }

  return parts.map((part) => part[0]).join("").toUpperCase()
}

export type SharedBlockStyleOptions = {
  x: number
  y: number
  width: number
  height: number
  zIndex?: number
  opacity?: number
  scale?: number
  rotation?: number
  blur?: number
  glow?: number
  glowColor?: string
  borderRadius?: number
  shadowIntensity?: number
  shadowColor?: string
  animationType?: string
  animationProgress?: number
  blendMode?: CSSProperties["mixBlendMode"]
}

function hexToRgb(hex: string, fallback: [number, number, number]): [number, number, number] {
  const normalizedHex = hex.trim().replace("#", "")

  if (!/^[0-9a-fA-F]{6}$/.test(normalizedHex)) {
    return fallback
  }

  return [
    Number.parseInt(normalizedHex.slice(0, 2), 16),
    Number.parseInt(normalizedHex.slice(2, 4), 16),
    Number.parseInt(normalizedHex.slice(4, 6), 16),
  ]
}

function rgbaFromHex(
  hex: string | undefined,
  opacity: number,
  fallback: [number, number, number],
): string {
  const [red, green, blue] = hexToRgb(hex ?? "", fallback)

  return `rgba(${red},${green},${blue},${opacity})`
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
  blur,
  glow,
  glowColor,
  borderRadius,
  shadowIntensity,
  shadowColor,
  animationType,
  animationProgress,
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
  const resolvedBlur = blur ?? 0
  const resolvedGlow = glow ?? 0
  const resolvedBorderRadius = borderRadius ?? 18
  const resolvedShadowIntensity = shadowIntensity ?? 0.35
  const baseShadowOpacity = Math.max(0, Math.min(0.45, resolvedShadowIntensity * 0.34))
  const glowOpacity = Math.max(0, Math.min(0.42, resolvedGlow * 0.34))
  const resolvedShadowColor = rgbaFromHex(shadowColor, baseShadowOpacity, [0, 0, 0])
  const resolvedGlowColor = rgbaFromHex(glowColor, glowOpacity, [125, 211, 252])

  const resolvedAnimationProgress = animationProgress ?? 1
  const resolvedAnimationType = animationType ?? "none"

  const cinematicEase = 1 - Math.pow(1 - resolvedAnimationProgress, 3)

  const driftOffset = (1 - cinematicEase) * 18
  const pushOffset = (1 - cinematicEase) * 120

  const animatedOpacity =
    resolvedAnimationType === "fade" ? cinematicEase * (opacity ?? 1) : opacity ?? 1

  const animationTranslateX =
    resolvedAnimationType === "push-left"
      ? -pushOffset
      : resolvedAnimationType === "push-right"
        ? pushOffset
        : 0

  const animationTranslateY =
    resolvedAnimationType === "push-up"
      ? -pushOffset
      : resolvedAnimationType === "push-down"
        ? pushOffset
        : resolvedAnimationType === "drift"
          ? driftOffset
          : 0

  return {
    position: "absolute",
    left: x,
    top: y,
    width,
    height,
    zIndex: 40 + (zIndex ?? 0),
    opacity: animatedOpacity,
    transform: `translate3d(${animationTranslateX}px, ${animationTranslateY}px, 0) scale(${scale ?? 1}) rotate(${rotation ?? 0}deg)`,
    transformOrigin: "center center",
    mixBlendMode: resolvedBlendMode,
    isolation: "isolate",
    willChange: "transform, opacity, filter",
    filter:
      [
        resolvedBlur > 0 ? `blur(${resolvedBlur}px)` : null,
        resolvedBlendMode === "overlay"
          ? "contrast(1.06) saturate(1.08)"
          : resolvedBlendMode === "soft-light"
            ? "brightness(1.02) saturate(1.04)"
            : resolvedBlendMode === "hard-light"
              ? "contrast(1.12) saturate(1.12)"
              : resolvedBlendMode === "screen"
                ? "brightness(1.08)"
                : null,
      ]
        .filter(Boolean)
        .join(" ") || undefined,
    borderRadius: resolvedBorderRadius,
    boxShadow:
      [
        resolvedShadowIntensity > 0 ? `0 18px 48px ${resolvedShadowColor}` : null,
        resolvedGlow > 0
          ? `0 0 ${Math.round(28 + resolvedGlow * 52)}px ${resolvedGlowColor}`
          : null,
        isBrightBlendMode ? "0 0 34px rgba(255,255,255,0.06)" : null,
      ]
        .filter(Boolean)
        .join(", ") || undefined,
    backfaceVisibility: "hidden",
    perspective: 1000,
  }
}

function renderBlockContent(
  block: PreviewBlock,
  renderCameraSlotContent?: (block: PreviewBlock) => JSX.Element | null,
): JSX.Element | null {
  if (block.type === "text") {
    return <div className="p-2 text-sm">{block.content}</div>
  }

  if (block.type === "camera-slot") {
    const placeholderEmoji = block.placeholderEmoji || "👤"
    const placeholderLabel = block.placeholderLabel || block.label || "Camera Slot"
    const placeholderSubLabel = block.placeholderSubLabel || "Assign presenter or attendee"
    const placeholderInitials = getCameraSlotInitials(placeholderLabel)
    const hasAssignedParticipant = Boolean(block.assignedParticipantId)
    const isBranded = block.placeholderStyle === "branded"
    const accentTone = getCameraSlotAccentTone(block.assignedParticipantAccent)

    const cameraSlotContent = renderCameraSlotContent?.(block)

    if (cameraSlotContent) {
      return (
        <div className="pointer-events-none relative h-full w-full overflow-hidden bg-black">
          {cameraSlotContent}
          <div
            className={`pointer-events-none absolute inset-x-0 bottom-0 border-t bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.58))] px-3 pb-2 pt-8 ${accentTone.border}`}
            style={{
              boxShadow: `0 -10px 34px rgba(${accentTone.rgb}, 0.14)`,
            }}
          >
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-[10px] font-black uppercase tracking-[0.12em] text-white/78">
                  {placeholderLabel}
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.12em] text-emerald-100/58">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300/80 shadow-[0_0_8px_rgba(110,231,183,0.44)]" />
                  Live Camera Source
                </div>
              </div>

              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] border bg-black/34 text-[9px] font-black tracking-[0.08em] text-white/72 backdrop-blur-md ${accentTone.border}`}
                style={{
                  boxShadow: `0 0 18px rgba(${accentTone.rgb}, 0.18)`,
                }}
              >
                {placeholderInitials}
              </div>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div
        className={`pointer-events-none relative flex h-full w-full items-center justify-center overflow-hidden border backdrop-blur-[34px] ${accentTone.border} ${accentTone.glow} ${
          isBranded
            ? "bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_38%),linear-gradient(135deg,rgba(8,15,28,0.96),rgba(2,6,18,1))]"
            : "bg-[linear-gradient(135deg,rgba(8,15,28,0.98),rgba(2,6,18,1))]"
        }`}
      >
        <div className="absolute inset-0 bg-black/72 backdrop-blur-[38px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(125,211,252,0.14),transparent_42%)] opacity-55" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.04),transparent_30%,rgba(125,211,252,0.045))] opacity-35" />
        <div
          className={`absolute inset-[10px] rounded-[inherit] border bg-black/28 ${accentTone.border}`}
          style={{
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04), inset 0 0 34px rgba(0,0,0,0.34), 0 0 30px rgba(${accentTone.rgb}, 0.12)`,
          }}
        />

        <div className="relative z-10 flex flex-col items-center justify-center px-5 text-center">
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-[22px] border bg-white/[0.048] backdrop-blur-md ${accentTone.border}`}
            style={{
              boxShadow: `0 18px 38px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.08), 0 0 34px rgba(${accentTone.rgb}, 0.18)`,
            }}
          >
            {hasAssignedParticipant ? (
              <span className="text-[18px] font-black tracking-[0.08em] text-white/78">
                {placeholderInitials}
              </span>
            ) : (
              <span className="text-3xl">{placeholderEmoji}</span>
            )}
          </div>

          <div className="mt-3 max-w-full truncate text-[12px] font-black uppercase tracking-[0.14em] text-white/78">
            {placeholderLabel}
          </div>

          <div className="mt-1 max-w-full truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-100/42">
            {hasAssignedParticipant ? "Camera offline / fallback active" : placeholderSubLabel}
          </div>
        </div>

        <div
          className={`absolute bottom-3 left-3 rounded-full border px-2 py-1 text-[7px] font-black uppercase tracking-[0.12em] opacity-90 backdrop-blur-md ${accentTone.badge}`}
        >
          {hasAssignedParticipant ? "Identity Held" : "Fallback Ready"}
        </div>
      </div>
    )
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
    renderCameraSlotContent?: (block: PreviewBlock) => JSX.Element | null
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
        onDoubleClick={
          opts?.selectable
            ? (e) => {
                e.stopPropagation()
                setSelectedBlockId(block.id)
              }
            : undefined
        }
        onMouseDown={
          opts?.selectable
            ? (e) => {
                e.stopPropagation()
                setSelectedBlockId(block.id)
              }
            : undefined
        }
        className={`absolute overflow-hidden transition-[transform,opacity,filter,box-shadow,border-radius] duration-300 ease-out ${
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
          blur: block.blur,
          glow: block.glow,
          glowColor: block.glowColor,
          borderRadius: block.borderRadius,
          shadowIntensity: block.shadowIntensity,
          shadowColor: block.shadowColor,
          animationType: block.animationType,
          animationProgress: block.animationProgress,
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
            className={`flex items-center justify-between border-b border-white/10 bg-black/40 px-2 py-1 text-[11px] font-semibold text-white/70 ${
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
                  {block.animationType && block.animationType !== "none"
                    ? `${block.animationType} · ${Math.round(block.timelineDurationMs / 100) / 10}s`
                    : `Timeline · ${Math.round(block.timelineDurationMs / 100) / 10}s`}
                </span>
              ) : null}

              <span className="truncate">
                {block.type === "camera-slot"
                  ? block.placeholderLabel || block.label || "Camera Slot"
                  : block.label || block.type}
              </span>
            </div>
            <span className="text-white/35">{opts?.selectable ? "Drag" : "Live"}</span>
          </div>
        ) : null}

        <div
          onMouseDown={
            opts?.selectable
              ? (e) => {
                  e.stopPropagation()
                  setSelectedBlockId(block.id)
                }
              : undefined
          }
          onDoubleClick={
            opts?.selectable
              ? (e) => {
                  e.stopPropagation()
                  setSelectedBlockId(block.id)
                }
              : undefined
          }
          className={
            opts?.showChrome
              ? "h-[calc(100%-28px)] overflow-hidden"
              : "h-full w-full overflow-hidden"
          }
          style={{
            borderRadius: opts?.showChrome
              ? `0 0 ${block.borderRadius ?? 18}px ${block.borderRadius ?? 18}px`
              : block.borderRadius ?? 18,
            background:
              block.blendMode && block.blendMode !== "normal"
                ? "rgba(255,255,255,0.015)"
                : undefined,
          }}
        >
          {renderBlockContent(block, opts?.renderCameraSlotContent)}
        </div>

        {opts?.selectable && opts?.showChrome && !block.locked ? (
          <div
            onMouseDown={(e) => {
              e.stopPropagation()
              setSelectedBlockId(block.id)
              startResizingBlock(e, block.id)
            }}
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