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

  return {
    updateTextContent,
    updateLabel,
    updateSrc,
    updateSize,
    updateOpacity,
    updatePosition,
    toggleHidden,
  }
}