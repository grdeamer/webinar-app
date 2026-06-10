"use client"

import { useCallback } from "react"
import {
  PRODUCER_BLOCK_CANVAS_HEIGHT,
  PRODUCER_BLOCK_CANVAS_WIDTH,
  type PreviewBlock,
} from "./useProducerBlocks"

const SNAP_THRESHOLD = 10

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
  setSnapGuideX: (value: number | null) => void
  setSnapGuideY: (value: number | null) => void
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
  setSnapGuideX,
  setSnapGuideY,
}: Params) {
  const startDraggingBlock = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, blockId: string) => {
      const rect = e.currentTarget.parentElement?.getBoundingClientRect() || null
      if (!rect) return

      const block = previewBlocks.find((b) => b.id === blockId)
      if (!block) return

      setPreviewCanvasRect(rect)
      setDraggingBlockId(blockId)
      setSelectedBlockId(blockId)
      setSnapGuideX(null)
      setSnapGuideY(null)

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
      setSelectedBlockId,
      setSnapGuideX,
      setSnapGuideY,
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
      setSnapGuideX(null)
      setSnapGuideY(null)
    },
    [
      setPreviewCanvasRect,
      setResizingBlockId,
      setSelectedBlockId,
      setSnapGuideX,
      setSnapGuideY,
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
    },
    [
      previewCanvasRect,
      resizingBlockId,
      draggingBlockId,
      dragOffset,
      setPreviewBlocks,
      setSnapGuideX,
      setSnapGuideY,
    ]
  )

  const stopDraggingBlock = useCallback(() => {
    setDraggingBlockId(null)
    setResizingBlockId(null)
    setSnapGuideX(null)
    setSnapGuideY(null)
  }, [
    setDraggingBlockId,
    setResizingBlockId,
    setSnapGuideX,
    setSnapGuideY,
  ])

  return {
    startDraggingBlock,
    startResizingBlock,
    onPreviewCanvasMouseMove,
    stopDraggingBlock,
  }
}