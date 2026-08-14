import { useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { PreviewBlock } from "./useProducerBlocks"

export type UploadedProducerAsset = {
  id: string
  url: string
  label: string
  path: string
}

function createUploadedBlock({
  url,
  label,
  type,
}: {
  url: string
  label: string
  type: "pdf" | "video" | "image"
}): PreviewBlock {
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
      src: url,
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
      src: url,
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
    src: url,
    hidden: false,
  }
}

export default function useProducerUploads({
  eventId,
  setPreviewBlocks,
}: {
  eventId: string
  setPreviewBlocks: React.Dispatch<React.SetStateAction<PreviewBlock[]>>
}) {
  const uploadAsset = useCallback(async (
    file: File,
    type: "pdf" | "video" | "image"
  ): Promise<UploadedProducerAsset> => {
    const prepareRes = await fetch(`/api/admin/events/${eventId}/live/assets/prepare`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        mimeType: file.type,
        byteSize: file.size,
      }),
    })
    const prepared = await prepareRes.json().catch((): null => null)
    if (!prepareRes.ok) throw new Error(prepared?.error || "Asset upload could not start")

    const supabase = createClient()
    const { error: uploadError } = await supabase.storage
      .from(prepared.bucket)
      .uploadToSignedUrl(prepared.path, prepared.token, file, {
        contentType: file.type,
      })
    if (uploadError) throw new Error(uploadError.message)

    const label = file.name.replace(/\.[^/.]+$/, "") || "Live asset"
    const commitRes = await fetch(`/api/admin/events/${eventId}/live/assets/commit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: prepared.path,
        label,
        mimeType: file.type,
        byteSize: file.size,
        assetType: type,
      }),
    })
    const committed = await commitRes.json().catch((): null => null)
    if (!commitRes.ok) throw new Error(committed?.error || "Asset upload could not be saved")

    return {
      id: String(committed.asset.id),
      url: String(committed.asset.public_url),
      label,
      path: String(committed.asset.storage_path),
    }
  }, [eventId])

  const addUploadedBlock = useCallback(
    async (file: File, type: "pdf" | "video" | "image") => {
      const asset = await uploadAsset(file, type)
      setPreviewBlocks((prev) => {
        const nextZIndex = Math.max(...prev.map((block) => block.zIndex), 0) + 1
        return [
          ...prev,
          {
            ...createUploadedBlock({ url: asset.url, label: asset.label, type }),
            zIndex: nextZIndex,
          },
        ]
      })
      return asset
    },
    [setPreviewBlocks, uploadAsset]
  )

  const handlePdfUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      const asset = await addUploadedBlock(file, "pdf")
      event.target.value = ""
      return asset
    },
    [addUploadedBlock]
  )

  const handleVideoUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      await addUploadedBlock(file, "video")
      event.target.value = ""
    },
    [addUploadedBlock]
  )

  const handleImageUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      await addUploadedBlock(file, "image")
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
