"use client"

import { useCallback } from "react"
import type { PreviewBlock } from "./useProducerBlocks"

type Params = {
  previewBlocks: PreviewBlock[]
  setPreviewBlocks: React.Dispatch<React.SetStateAction<PreviewBlock[]>>
  selectedBlockId: string | null
  setSelectedBlockId: (id: string | null) => void
  draggingBlockId: string | null
  setDraggingBlockId: (id: string | null) => void
  resizingBlockId: string | null
  setResizingBlockId: (id: string | null) => void
  dragOffset: {
    x: number
    y: number
  }
  setDragOffset: React.Dispatch<
    React.SetStateAction<{
      x: number
      y: number
    }>
  >
  previewCanvasRect: DOMRect | null
  setPreviewCanvasRect: (rect: DOMRect | null) => void
}

export default function useProducerCanvasInteractions({
  previewBlocks,
  setPreviewBlocks,
  setSelectedBlockId,
  draggingBlockId,
  setDraggingBlockId,
  resizingBlockId,
  setResizingBlockId,
  dragOffset,
  setDragOffset,
  previewCanvasRect,
  setPreviewCanvasRect,
}: Params) {
  const startDraggingBlock = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, blockId: string) => {
      const rect = e.currentTarget.parentElement?.getBoundingClientRect() || null
      if (!rect) return

      const block = previewBlocks.find((b) => b.id === blockId)
      if (!block) return

      setPreviewCanvasRect(rect)
      setDraggingBlockId(blockId)

      setDragOffset({
        x: e.clientX - rect.left - block.x,
        y: e.clientY - rect.top - block.y,
      })
    },
    [
      previewBlocks,
      setPreviewCanvasRect,
      setDraggingBlockId,
      setDragOffset,
    ]
  )

  const startResizingBlock = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, blockId: string) => {
      e.stopPropagation()

      const rect = e.currentTarget.parentElement?.getBoundingClientRect() || null
      if (!rect) return

      setPreviewCanvasRect(rect)
      setResizingBlockId(blockId)
      setSelectedBlockId(blockId)
    },
    [
      setPreviewCanvasRect,
      setResizingBlockId,
      setSelectedBlockId,
    ]
  )

  const onPreviewCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!previewCanvasRect) return

      if (resizingBlockId) {
        setPreviewBlocks((prev) =>
          prev.map((block) => {
            if (block.id !== resizingBlockId) return block

            const nextWidth =
              e.clientX - previewCanvasRect.left - block.x

            const nextHeight =
              e.clientY - previewCanvasRect.top - block.y

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

      const nextX =
        e.clientX - previewCanvasRect.left - dragOffset.x

      const nextY =
        e.clientY - previewCanvasRect.top - dragOffset.y

      setPreviewBlocks((prev) =>
        prev.map((block) =>
          block.id === draggingBlockId
            ? {
                ...block,
                x: Math.max(0, nextX),
                y: Math.max(0, nextY),
              }
            : block
        )
      )
    },
    [
      previewCanvasRect,
      resizingBlockId,
      draggingBlockId,
      dragOffset,
      setPreviewBlocks,
    ]
  )

  const stopDraggingBlock = useCallback(() => {
    setDraggingBlockId(null)
    setResizingBlockId(null)
  }, [
    setDraggingBlockId,
    setResizingBlockId,
  ])

  return {
    startDraggingBlock,
    startResizingBlock,
    onPreviewCanvasMouseMove,
    stopDraggingBlock,
  }
}