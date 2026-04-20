"use client"

import { useMemo, useState, type ChangeEvent, type MouseEvent } from "react"

export type PreviewBlock = {
  id: string
  type: "pdf" | "video" | "image" | "text"
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  opacity?: number
  label?: string | null
  src?: string | null
  content?: string | null
  hidden?: boolean
}

export default function useProducerBlocks() {
  const [previewBlocks, setPreviewBlocks] = useState<PreviewBlock[]>([])
  const [programBlocks, setProgramBlocks] = useState<PreviewBlock[]>([])

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null)
  const [resizingBlockId, setResizingBlockId] = useState<string | null>(null)

  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [previewCanvasRect, setPreviewCanvasRect] = useState<DOMRect | null>(null)

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
        content: "Preview text block",
        label: "Text",
        hidden: false,
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
        label: "Video",
        src: "https://www.w3schools.com/html/mov_bbb.mp4",
        hidden: false,
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
        label: "PDF",
        src: "https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf",
        hidden: false,
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
        label: "Logo",
        src: "https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg",
        hidden: false,
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
        label: file.name.replace(/\.[^/.]+$/, "") || "Uploaded PDF",
        src,
        hidden: false,
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
        label: file.name.replace(/\.[^/.]+$/, "") || "Uploaded Video",
        src,
        hidden: false,
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
        label: file.name.replace(/\.[^/.]+$/, "") || "Uploaded Image",
        src,
        hidden: false,
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
    if (!block) return

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

    const nextX = e.clientX - previewCanvasRect.left - dragOffset.x
    const nextY = e.clientY - previewCanvasRect.top - dragOffset.y

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
  }

  function stopDraggingBlock() {
    setDraggingBlockId(null)
    setResizingBlockId(null)
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

    selectedBlock,

    addTestTextBlock,
    addTestVideoBlock,
    addTestPdfBlock,
    addTestImageBlock,

    handlePdfUpload,
    handleVideoUpload,
    handleImageUpload,

    deleteSelectedBlock,
    duplicateSelectedBlock,
    bringSelectedBlockToFront,

    updateSelectedTextBlockContent,
    updateSelectedBlockSize,
    updateSelectedBlockOpacity,
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