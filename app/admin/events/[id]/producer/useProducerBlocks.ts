"use client"

import {
  useMemo,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type MouseEvent,
} from "react"

export const PRODUCER_BLOCK_CANVAS_WIDTH = 640
export const PRODUCER_BLOCK_CANVAS_HEIGHT = 360

const SNAP_THRESHOLD = 10

export type PreviewBlock = {
  id: string
  type: "pdf" | "video" | "image" | "text" | "camera-slot"
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  opacity?: number
  scale?: number
  rotation?: number
  blur?: number
  glow?: number
  glowColor?: string
  borderRadius?: number
  shadowIntensity?: number
  shadowColor?: string
  label?: string | null
  src?: string | null
  content?: string | null
  assignedParticipantId?: string | null
  assignedTrackSid?: string | null
  assignedParticipantAccent?: string | null
  placeholderEmoji?: string | null
  placeholderLabel?: string | null
  placeholderSubLabel?: string | null
  placeholderStyle?: "dark" | "branded" | "avatar" | "logo"
  hidden?: boolean
  locked?: boolean
  groupId?: string | null
  blendMode?: CSSProperties["mixBlendMode"]
  timelineStartMs?: number
  timelineDurationMs?: number
  animationType?: "none" | "fade" | "drift" | "push-left" | "push-right" | "push-up" | "push-down"
  animationProgress?: number
}

function snapValue(value: number, targets: number[], threshold = SNAP_THRESHOLD): number {
  for (const target of targets) {
    if (Math.abs(value - target) <= threshold) {
      return target
    }
  }

  return value
}

function clampBlockToCanvas(
  x: number,
  y: number,
  width: number,
  height: number,
) {
  return {
    x: Math.max(0, Math.min(PRODUCER_BLOCK_CANVAS_WIDTH - width, x)),
    y: Math.max(0, Math.min(PRODUCER_BLOCK_CANVAS_HEIGHT - height, y)),
  }
}

export default function useProducerBlocks() {
  const [previewBlocks, setPreviewBlocks] = useState<PreviewBlock[]>([])
  const [programBlocks, setProgramBlocks] = useState<PreviewBlock[]>([])

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null)
  const [resizingBlockId, setResizingBlockId] = useState<string | null>(null)

  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [previewCanvasRect, setPreviewCanvasRect] = useState<DOMRect | null>(null)

  const [snapGuideX, setSnapGuideX] = useState<number | null>(null)
  const [snapGuideY, setSnapGuideY] = useState<number | null>(null)

  const selectedBlock = useMemo(() => {
    return previewBlocks.find((block) => block.id === selectedBlockId) || null
  }, [previewBlocks, selectedBlockId])

  function addTestTextBlock() {
    setPreviewBlocks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: "text",
        x: 24,
        y: 24,
        width: 220,
        height: 80,
        zIndex: prev.length + 1,
        opacity: 0.7,
        scale: 1,
        rotation: 0,
        blur: 0,
        glow: 0,
        glowColor: "#7dd3fc",
        borderRadius: 18,
        shadowIntensity: 0.35,
        shadowColor: "#000000",
        content: "Preview text block",
        label: "Text",
        hidden: false,
        locked: false,
        groupId: null,
        blendMode: "normal",
        timelineStartMs: 0,
        timelineDurationMs: 4000,
        animationType: "none",
        animationProgress: 1,
      },
    ])
  }

  function addTestVideoBlock() {
    setPreviewBlocks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: "video",
        x: 80,
        y: 120,
        width: 320,
        height: 180,
        zIndex: prev.length + 1,
        opacity: 0.85,
        scale: 1,
        rotation: 0,
        blur: 0,
        glow: 0,
        glowColor: "#7dd3fc",
        borderRadius: 18,
        shadowIntensity: 0.35,
        shadowColor: "#000000",
        label: "Video",
        src: "https://www.w3schools.com/html/mov_bbb.mp4",
        hidden: false,
        locked: false,
        groupId: null,
        blendMode: "normal",
        timelineStartMs: 0,
        timelineDurationMs: 4000,
        animationType: "none",
        animationProgress: 1,
      },
    ])
  }

  function addTestPdfBlock() {
    setPreviewBlocks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: "pdf",
        x: 140,
        y: 80,
        width: 360,
        height: 220,
        zIndex: prev.length + 1,
        opacity: 1,
        scale: 1,
        rotation: 0,
        blur: 0,
        glow: 0,
        glowColor: "#7dd3fc",
        borderRadius: 18,
        shadowIntensity: 0.35,
        shadowColor: "#000000",
        label: "PDF",
        src: "https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf",
        hidden: false,
        locked: false,
        groupId: null,
        blendMode: "normal",
        timelineStartMs: 0,
        timelineDurationMs: 4000,
        animationType: "none",
        animationProgress: 1,
      },
    ])
  }

  function addTestImageBlock() {
    setPreviewBlocks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: "image",
        x: 100,
        y: 100,
        width: 200,
        height: 100,
        zIndex: prev.length + 1,
        opacity: 1,
        scale: 1,
        rotation: 0,
        blur: 0,
        glow: 0,
        glowColor: "#7dd3fc",
        borderRadius: 18,
        shadowIntensity: 0.35,
        shadowColor: "#000000",
        label: "Logo",
        src: "https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg",
        hidden: false,
        locked: false,
        groupId: null,
        blendMode: "normal",
        timelineStartMs: 0,
        timelineDurationMs: 4000,
        animationType: "none",
        animationProgress: 1,
      },
    ])
  }

  function addCameraSlotBlock() {
    setPreviewBlocks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: "camera-slot",
        x: 96,
        y: 64,
        width: 360,
        height: 220,
        zIndex: prev.length + 1,
        opacity: 1,
        scale: 1,
        rotation: 0,
        blur: 0,
        glow: 0,
        glowColor: "#7dd3fc",
        borderRadius: 28,
        shadowIntensity: 0.45,
        shadowColor: "#000000",
        label: "Camera Slot",
        assignedParticipantId: null,
        assignedTrackSid: null,
        placeholderEmoji: "👤",
        placeholderLabel: "Camera Slot",
        placeholderSubLabel: "Assign presenter or attendee",
        placeholderStyle: "branded",
        hidden: false,
        locked: false,
        groupId: null,
        blendMode: "normal",
        timelineStartMs: 0,
        timelineDurationMs: 4000,
        animationType: "none",
        animationProgress: 1,
      },
    ])
  }

  function handlePdfUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const src = URL.createObjectURL(file)

    setPreviewBlocks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: "pdf",
        x: 120,
        y: 90,
        width: 420,
        height: 260,
        zIndex: Math.max(...prev.map((b) => b.zIndex), 0) + 1,
        opacity: 1,
        scale: 1,
        rotation: 0,
        blur: 0,
        glow: 0,
        glowColor: "#7dd3fc",
        borderRadius: 18,
        shadowIntensity: 0.35,
        shadowColor: "#000000",
        label: file.name.replace(/\.[^/.]+$/, "") || "Uploaded PDF",
        src,
        hidden: false,
        locked: false,
        groupId: null,
        blendMode: "normal",
        timelineStartMs: 0,
        timelineDurationMs: 4000,
        animationType: "none",
        animationProgress: 1,
      },
    ])

    e.target.value = ""
  }

  function handleVideoUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const src = URL.createObjectURL(file)

    setPreviewBlocks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: "video",
        x: 100,
        y: 100,
        width: 420,
        height: 236,
        zIndex: Math.max(...prev.map((b) => b.zIndex), 0) + 1,
        opacity: 1,
        scale: 1,
        rotation: 0,
        blur: 0,
        glow: 0,
        glowColor: "#7dd3fc",
        borderRadius: 18,
        shadowIntensity: 0.35,
        shadowColor: "#000000",
        label: file.name.replace(/\.[^/.]+$/, "") || "Uploaded Video",
        src,
        hidden: false,
        locked: false,
        groupId: null,
        blendMode: "normal",
        timelineStartMs: 0,
        timelineDurationMs: 4000,
        animationType: "none",
        animationProgress: 1,
      },
    ])

    e.target.value = ""
  }

  function handleImageUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const src = URL.createObjectURL(file)

    setPreviewBlocks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: "image",
        x: 100,
        y: 100,
        width: 260,
        height: 140,
        zIndex: Math.max(...prev.map((b) => b.zIndex), 0) + 1,
        opacity: 1,
        scale: 1,
        rotation: 0,
        blur: 0,
        glow: 0,
        glowColor: "#7dd3fc",
        borderRadius: 18,
        shadowIntensity: 0.35,
        shadowColor: "#000000",
        label: file.name.replace(/\.[^/.]+$/, "") || "Uploaded Image",
        src,
        hidden: false,
        locked: false,
        groupId: null,
        blendMode: "normal",
        timelineStartMs: 0,
        timelineDurationMs: 4000,
        animationType: "none",
        animationProgress: 1,
      },
    ])

    e.target.value = ""
  }

  function deleteSelectedBlock() {
    if (!selectedBlockId) return

    setPreviewBlocks((prev) =>
      prev.filter((block) => block.id !== selectedBlockId)
    )

    setSelectedBlockId(null)
  }

  function duplicateSelectedBlock() {
    if (!selectedBlockId) return

    setPreviewBlocks((prev) => {
      const source = prev.find((block) => block.id === selectedBlockId)
      if (!source) return prev

      const copy: PreviewBlock = {
        ...source,
        id: crypto.randomUUID(),
        x: source.x + 30,
        y: source.y + 30,
        zIndex: Math.max(...prev.map((b) => b.zIndex), 0) + 1,
        label: source.label ? `${source.label} Copy` : "Copy",
        locked: false,
        blur: source.blur ?? 0,
        glow: source.glow ?? 0,
        glowColor: source.glowColor ?? "#7dd3fc",
        borderRadius: source.borderRadius ?? 18,
        shadowIntensity: source.shadowIntensity ?? 0.35,
        shadowColor: source.shadowColor ?? "#000000",
        assignedParticipantId: source.assignedParticipantId ?? null,
        assignedTrackSid: source.assignedTrackSid ?? null,
        placeholderEmoji: source.placeholderEmoji ?? "👤",
        placeholderLabel: source.placeholderLabel ?? null,
        placeholderSubLabel: source.placeholderSubLabel ?? null,
        placeholderStyle: source.placeholderStyle ?? "branded",
        animationType: source.animationType ?? "none",
        animationProgress: source.animationProgress ?? 1,
      }

      setSelectedBlockId(copy.id)

      return [...prev, copy]
    })
  }

  function bringSelectedBlockToFront() {
    if (!selectedBlockId) return

    setPreviewBlocks((prev) => {
      const maxZ = Math.max(...prev.map((b) => b.zIndex), 0)

      return prev.map((block) =>
        block.id === selectedBlockId
          ? { ...block, zIndex: maxZ + 1 }
          : block
      )
    })
  }

  function updateSelectedTextBlockContent(value: string) {
    if (!selectedBlockId) return

    setPreviewBlocks((prev) =>
      prev.map((block) =>
        block.id === selectedBlockId && block.type === "text"
          ? {
              ...block,
              content: value,
            }
          : block
      )
    )
  }

  function updateSelectedBlockSize(field: "width" | "height", value: string) {
    if (!selectedBlockId) return

    const numericValue = Number(value)
    if (!Number.isFinite(numericValue)) return

    setPreviewBlocks((prev) =>
      prev.map((block) =>
        block.id === selectedBlockId
          ? {
              ...block,
              [field]: Math.max(field === "width" ? 80 : 60, numericValue),
            }
          : block
      )
    )
  }

  function updateSelectedBlockOpacity(value: string) {
    if (!selectedBlockId) return

    const numericValue = Number(value)
    if (!Number.isFinite(numericValue)) return

    setPreviewBlocks((prev) =>
      prev.map((block) =>
        block.id === selectedBlockId
          ? {
              ...block,
              opacity: Math.max(0.1, Math.min(1, numericValue)),
            }
          : block
      )
    )
  }

  function updateSelectedBlockScale(value: string) {
    if (!selectedBlockId) return

    const numericValue = Number(value)
    if (!Number.isFinite(numericValue)) return

    setPreviewBlocks((prev) =>
      prev.map((block) =>
        block.id === selectedBlockId
          ? {
              ...block,
              scale: Math.max(0.1, Math.min(4, numericValue)),
            }
          : block
      )
    )
  }

  function updateSelectedBlockRotation(value: string) {
    if (!selectedBlockId) return

    const numericValue = Number(value)
    if (!Number.isFinite(numericValue)) return

    setPreviewBlocks((prev) =>
      prev.map((block) =>
        block.id === selectedBlockId
          ? {
              ...block,
              rotation: Math.max(-180, Math.min(180, numericValue)),
            }
          : block
      )
    )
  }

  function updateSelectedBlockBlur(value: string) {
    if (!selectedBlockId) return

    const numericValue = Number(value)
    if (!Number.isFinite(numericValue)) return

    setPreviewBlocks((prev) =>
      prev.map((block) =>
        block.id === selectedBlockId
          ? {
              ...block,
              blur: Math.max(0, Math.min(40, numericValue)),
            }
          : block
      )
    )
  }

  function updateSelectedBlockGlow(value: string) {
    if (!selectedBlockId) return

    const numericValue = Number(value)
    if (!Number.isFinite(numericValue)) return

    setPreviewBlocks((prev) =>
      prev.map((block) =>
        block.id === selectedBlockId
          ? {
              ...block,
              glow: Math.max(0, Math.min(1, numericValue)),
            }
          : block
      )
    )
  }

  function updateSelectedBlockGlowColor(value: string) {
    if (!selectedBlockId) return

    setPreviewBlocks((prev) =>
      prev.map((block) =>
        block.id === selectedBlockId
          ? {
              ...block,
              glowColor: value || "#7dd3fc",
            }
          : block
      )
    )
  }

  function updateSelectedBorderRadius(value: string) {
    if (!selectedBlockId) return

    const numericValue = Number(value)
    if (!Number.isFinite(numericValue)) return

    setPreviewBlocks((prev) =>
      prev.map((block) =>
        block.id === selectedBlockId
          ? {
              ...block,
              borderRadius: Math.max(0, Math.min(120, numericValue)),
            }
          : block
      )
    )
  }

  function updateSelectedShadowIntensity(value: string) {
    if (!selectedBlockId) return

    const numericValue = Number(value)
    if (!Number.isFinite(numericValue)) return

    setPreviewBlocks((prev) =>
      prev.map((block) =>
        block.id === selectedBlockId
          ? {
              ...block,
              shadowIntensity: Math.max(0, Math.min(1, numericValue)),
            }
          : block
      )
    )
  }

  function updateSelectedShadowColor(value: string) {
    if (!selectedBlockId) return

    setPreviewBlocks((prev) =>
      prev.map((block) =>
        block.id === selectedBlockId
          ? {
              ...block,
              shadowColor: value || "#000000",
            }
          : block
      )
    )
  }

  function toggleSelectedBlockHidden() {
    if (!selectedBlockId) return

    setPreviewBlocks((prev) =>
      prev.map((block) =>
        block.id === selectedBlockId
          ? {
              ...block,
              hidden: !block.hidden,
            }
          : block
      )
    )
  }

  function updateSelectedBlockPosition(field: "x" | "y", value: string) {
    if (!selectedBlockId) return

    const numericValue = Number(value)
    if (!Number.isFinite(numericValue)) return

    setPreviewBlocks((prev) =>
      prev.map((block) =>
        block.id === selectedBlockId
          ? {
              ...block,
              [field]: Math.max(0, numericValue),
            }
          : block
      )
    )
  }

  function updateSelectedBlockLabel(value: string) {
    if (!selectedBlockId) return

    setPreviewBlocks((prev) =>
      prev.map((block) =>
        block.id === selectedBlockId
          ? {
              ...block,
              label: value,
            }
          : block
      )
    )
  }

  function updateSelectedBlockSrc(value: string) {
    if (!selectedBlockId) return

    setPreviewBlocks((prev) =>
      prev.map((block) =>
        block.id === selectedBlockId
          ? {
              ...block,
              src: value,
            }
          : block
      )
    )
  }

  function startDraggingBlock(e: MouseEvent<HTMLDivElement>, blockId: string) {
    const rect = e.currentTarget.parentElement?.getBoundingClientRect() || null
    if (!rect) return

    const block = previewBlocks.find((b) => b.id === blockId)
    if (!block || block.locked) return

    setPreviewCanvasRect(rect)
    setDraggingBlockId(blockId)
    setDragOffset({
      x: e.clientX - rect.left - block.x,
      y: e.clientY - rect.top - block.y,
    })
  }

  function startResizingBlock(e: MouseEvent<HTMLDivElement>, blockId: string) {
    e.stopPropagation()

    const rect = e.currentTarget.parentElement?.getBoundingClientRect() || null
    if (!rect) return

    setPreviewCanvasRect(rect)

    const block = previewBlocks.find((b) => b.id === blockId)
    if (!block || block.locked) return

    setResizingBlockId(blockId)
    setSelectedBlockId(blockId)
  }

  function onPreviewCanvasMouseMove(e: MouseEvent<HTMLDivElement>) {
    if (!previewCanvasRect) return

    if (resizingBlockId) {
      setPreviewBlocks((prev) =>
        prev.map((block) => {
          if (block.id !== resizingBlockId) return block

          const nextWidth = e.clientX - previewCanvasRect.left - block.x
          const nextHeight = e.clientY - previewCanvasRect.top - block.y

          return {
            ...block,
            width: Math.max(80, nextWidth),
            height: Math.max(60, nextHeight),
          }
        })
      )
      return
    }

    if (!draggingBlockId) return

    setPreviewBlocks((prev) => {
      const activeBlock = prev.find((block) => block.id === draggingBlockId)
      if (!activeBlock) return prev

      const rawX = e.clientX - previewCanvasRect.left - dragOffset.x
      const rawY = e.clientY - previewCanvasRect.top - dragOffset.y

      const blockWidth = activeBlock.width
      const blockHeight = activeBlock.height

      const canvasCenterX = PRODUCER_BLOCK_CANVAS_WIDTH / 2 - blockWidth / 2
      const canvasCenterY = PRODUCER_BLOCK_CANVAS_HEIGHT / 2 - blockHeight / 2

      const snapTargetsX = [
        0,
        canvasCenterX,
        PRODUCER_BLOCK_CANVAS_WIDTH - blockWidth,
      ]

      const snapTargetsY = [
        0,
        canvasCenterY,
        PRODUCER_BLOCK_CANVAS_HEIGHT - blockHeight,
      ]

      prev.forEach((block) => {
        if (block.id === draggingBlockId) return

        snapTargetsX.push(block.x)
        snapTargetsX.push(block.x + block.width / 2 - blockWidth / 2)
        snapTargetsX.push(block.x + block.width - blockWidth)

        snapTargetsY.push(block.y)
        snapTargetsY.push(block.y + block.height / 2 - blockHeight / 2)
        snapTargetsY.push(block.y + block.height - blockHeight)
      })

      const snappedX = snapValue(rawX, snapTargetsX)
      const snappedY = snapValue(rawY, snapTargetsY)

      const didSnapX = snappedX !== rawX
      const didSnapY = snappedY !== rawY

      setSnapGuideX(didSnapX ? snappedX + blockWidth / 2 : null)
      setSnapGuideY(didSnapY ? snappedY + blockHeight / 2 : null)

      const clamped = clampBlockToCanvas(
        snappedX,
        snappedY,
        blockWidth,
        blockHeight,
      )

      return prev.map((block) =>
        block.id === draggingBlockId
          ? {
              ...block,
              x: clamped.x,
              y: clamped.y,
            }
          : block
      )
    })
  }

  function stopDraggingBlock() {
    setDraggingBlockId(null)
    setResizingBlockId(null)
    setSnapGuideX(null)
    setSnapGuideY(null)
  }

return {

  previewBlocks,

  setPreviewBlocks,

    programBlocks,
    setProgramBlocks,

    selectedBlockId,
    setSelectedBlockId,

    draggingBlockId,
    setDraggingBlockId,

    resizingBlockId,
    setResizingBlockId,

    dragOffset,
    setDragOffset,

    previewCanvasRect,
    setPreviewCanvasRect,

  snapGuideX,

  snapGuideY,

  setSnapGuideX,

  setSnapGuideY,

  selectedBlock,

    addTestTextBlock,
    addTestVideoBlock,
    addTestPdfBlock,
    addTestImageBlock,
    addCameraSlotBlock,

    handlePdfUpload,
    handleVideoUpload,
    handleImageUpload,

    deleteSelectedBlock,
    duplicateSelectedBlock,
    bringSelectedBlockToFront,

    updateSelectedTextBlockContent,
    updateSelectedBlockSize,
    updateSelectedBlockOpacity,
    updateSelectedBlockScale,
    updateSelectedBlockRotation,
    updateSelectedBlockBlur,
    updateSelectedBlockGlow,
    updateSelectedBlockGlowColor,
    updateSelectedBorderRadius,
    updateSelectedShadowIntensity,
    updateSelectedShadowColor,
    toggleSelectedBlockHidden,
    updateSelectedBlockPosition,
    updateSelectedBlockLabel,
    updateSelectedBlockSrc,

    startDraggingBlock,
    startResizingBlock,
    onPreviewCanvasMouseMove,
    stopDraggingBlock,
  }
}