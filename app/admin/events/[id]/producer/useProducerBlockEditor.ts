import { useCallback } from "react"
import type { PreviewBlock } from "./useProducerBlocks"

export default function useProducerBlockEditor({
  selectedBlockId,
  setPreviewBlocks,
}: {
  selectedBlockId: string | null
  setPreviewBlocks: React.Dispatch<React.SetStateAction<PreviewBlock[]>>
}) {
  const updateTextContent = useCallback((value: string) => {
    if (!selectedBlockId) return

    setPreviewBlocks((prev) =>
      prev.map((block) =>
        block.id === selectedBlockId && block.type === "text"
          ? { ...block, content: value }
          : block
      )
    )
  }, [selectedBlockId, setPreviewBlocks])

  const updateLabel = useCallback((value: string) => {
    if (!selectedBlockId) return

    setPreviewBlocks((prev) =>
      prev.map((block) =>
        block.id === selectedBlockId ? { ...block, label: value } : block
      )
    )
  }, [selectedBlockId, setPreviewBlocks])

  const toggleHidden = useCallback(() => {
    if (!selectedBlockId) return

    setPreviewBlocks((prev) =>
      prev.map((block) =>
        block.id === selectedBlockId
          ? { ...block, hidden: !block.hidden }
          : block
      )
    )
  }, [selectedBlockId, setPreviewBlocks])

  return {
    updateTextContent,
    updateLabel,
    toggleHidden,
  }
}