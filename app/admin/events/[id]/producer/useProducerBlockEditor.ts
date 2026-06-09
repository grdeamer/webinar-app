import { useCallback } from "react"
import type { PreviewBlock } from "./useProducerBlocks"

export default function useProducerBlockEditor({
  selectedBlockId,
  setPreviewBlocks,
}: {
  selectedBlockId: string | null
  setPreviewBlocks: React.Dispatch<React.SetStateAction<PreviewBlock[]>>
}) {
  const updateTextContent = useCallback(
    (value: string) => {
      if (!selectedBlockId) return

      setPreviewBlocks((prev) =>
        prev.map((block) =>
          block.id === selectedBlockId && block.type === "text"
            ? { ...block, content: value }
            : block
        )
      )
    },
    [selectedBlockId, setPreviewBlocks]
  )

  const updateLabel = useCallback(
    (value: string) => {
      if (!selectedBlockId) return

      setPreviewBlocks((prev) =>
        prev.map((block) =>
          block.id === selectedBlockId ? { ...block, label: value } : block
        )
      )
    },
    [selectedBlockId, setPreviewBlocks]
  )

  const updateSrc = useCallback(
    (value: string) => {
      if (!selectedBlockId) return

      setPreviewBlocks((prev) =>
        prev.map((block) =>
          block.id === selectedBlockId ? { ...block, src: value } : block
        )
      )
    },
    [selectedBlockId, setPreviewBlocks]
  )

  const updateSize = useCallback(
    (field: "width" | "height", value: string) => {
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
    },
    [selectedBlockId, setPreviewBlocks]
  )

  const updateOpacity = useCallback(
    (value: string) => {
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
    },
    [selectedBlockId, setPreviewBlocks]
  )

  const updateScale = useCallback(
    (value: string) => {
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
    },
    [selectedBlockId, setPreviewBlocks]
  )

  const updateRotation = useCallback(
    (value: string) => {
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
    },
    [selectedBlockId, setPreviewBlocks]
  )

  const updateBlendMode = useCallback(
    (value: string) => {
      if (!selectedBlockId) return

      setPreviewBlocks((prev) =>
        prev.map((block) =>
          block.id === selectedBlockId
            ? {
                ...block,
                blendMode: value as React.CSSProperties["mixBlendMode"],
              }
            : block
        )
      )
    },
    [selectedBlockId, setPreviewBlocks]
  )

  const updateGroupId = useCallback(
    (value: string) => {
      if (!selectedBlockId) return

      setPreviewBlocks((prev) =>
        prev.map((block) =>
          block.id === selectedBlockId
            ? {
                ...block,
                groupId: value.trim() || null,
              }
            : block
        )
      )
    },
    [selectedBlockId, setPreviewBlocks]
  )

  const updateTimelineStart = useCallback(
    (value: string) => {
      if (!selectedBlockId) return

      const numericValue = Number(value)
      if (!Number.isFinite(numericValue)) return

      setPreviewBlocks((prev) =>
        prev.map((block) =>
          block.id === selectedBlockId
            ? {
                ...block,
                timelineStartMs: Math.max(0, numericValue),
              }
            : block
        )
      )
    },
    [selectedBlockId, setPreviewBlocks]
  )

  const updateTimelineDuration = useCallback(
    (value: string) => {
      if (!selectedBlockId) return

      const numericValue = Number(value)
      if (!Number.isFinite(numericValue)) return

      setPreviewBlocks((prev) =>
        prev.map((block) =>
          block.id === selectedBlockId
            ? {
                ...block,
                timelineDurationMs: Math.max(100, numericValue),
              }
            : block
        )
      )
    },
    [selectedBlockId, setPreviewBlocks]
  )

  const updatePosition = useCallback(
    (field: "x" | "y", value: string) => {
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
    },
    [selectedBlockId, setPreviewBlocks]
  )

  const toggleHidden = useCallback(
    () => {
      if (!selectedBlockId) return

      setPreviewBlocks((prev) =>
        prev.map((block) =>
          block.id === selectedBlockId ? { ...block, hidden: !block.hidden } : block
        )
      )
    },
    [selectedBlockId, setPreviewBlocks]
  )

  const toggleLocked = useCallback(
    () => {
      if (!selectedBlockId) return

      setPreviewBlocks((prev) =>
        prev.map((block) =>
          block.id === selectedBlockId ? { ...block, locked: !block.locked } : block
        )
      )
    },
    [selectedBlockId, setPreviewBlocks]
  )

  return {
    updateTextContent,
    updateLabel,
    updateSrc,
    updateSize,
    updateOpacity,
    updateScale,
    updateRotation,
    updateBlendMode,
    updateGroupId,
    updateTimelineStart,
    updateTimelineDuration,
    updatePosition,
    toggleHidden,
    toggleLocked,
  }
}