import { useCallback } from "react"
import type { PreviewBlock } from "./useProducerBlocks"

function createUploadedBlock({
  file,
  type,
}: {
  file: File
  type: "pdf" | "video" | "image"
}): PreviewBlock {
  const src = URL.createObjectURL(file)
  const label = file.name.replace(/\.[^/.]+$/, "")

  if (type === "pdf") {
    return {
      id: crypto.randomUUID(),
      type,
      x: 120,
      y: 90,
      width: 420,
      height: 260,
      zIndex: 1,
      opacity: 1,
      label: label || "Uploaded PDF",
      src,
      hidden: false,
    }
  }

  if (type === "video") {
    return {
      id: crypto.randomUUID(),
      type,
      x: 100,
      y: 100,
      width: 420,
      height: 236,
      zIndex: 1,
      opacity: 1,
      label: label || "Uploaded Video",
      src,
      hidden: false,
    }
  }

  return {
    id: crypto.randomUUID(),
    type,
    x: 100,
    y: 100,
    width: 260,
    height: 140,
    zIndex: 1,
    opacity: 1,
    label: label || "Uploaded Image",
    src,
    hidden: false,
  }
}

export default function useProducerUploads({
  setPreviewBlocks,
}: {
  setPreviewBlocks: React.Dispatch<React.SetStateAction<PreviewBlock[]>>
}) {
  const addUploadedBlock = useCallback(
    (file: File, type: "pdf" | "video" | "image") => {
      setPreviewBlocks((prev) => {
        const nextZIndex = Math.max(...prev.map((block) => block.zIndex), 0) + 1
        return [
          ...prev,
          {
            ...createUploadedBlock({ file, type }),
            zIndex: nextZIndex,
          },
        ]
      })
    },
    [setPreviewBlocks]
  )

  const handlePdfUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      addUploadedBlock(file, "pdf")
      event.target.value = ""
    },
    [addUploadedBlock]
  )

  const handleVideoUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      addUploadedBlock(file, "video")
      event.target.value = ""
    },
    [addUploadedBlock]
  )

  const handleImageUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      addUploadedBlock(file, "image")
      event.target.value = ""
    },
    [addUploadedBlock]
  )

  return {
    handlePdfUpload,
    handleVideoUpload,
    handleImageUpload,
  }
}