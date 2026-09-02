"use client"

import { useRef, useState } from "react"

type AssetItem = {
  id: string
  url: string
  name: string
  type: string
}

type Props = {
  onUpload: (file: File) => Promise<{ url: string; name: string; type: string } | null>
  onInsertAsset: (asset: AssetItem) => void
}

export default function AssetLibraryCard({ onUpload, onInsertAsset }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [assets, setAssets] = useState<AssetItem[]>([])
  const [uploading, setUploading] = useState(false)

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const uploaded = await onUpload(file)
      if (uploaded) {
        const asset: AssetItem = {
          id: `asset-${Date.now()}`,
          url: uploaded.url,
          name: uploaded.name,
          type: uploaded.type,
        }
        setAssets((prev) => [asset, ...prev])
        onInsertAsset(asset)
      }
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Asset Library</h3>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-[10px] font-bold text-white/72 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {assets.map((asset) => (
          <button
            key={asset.id}
            type="button"
            onClick={() => onInsertAsset(asset)}
            className="group relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-black/20 hover:border-white/25"
          >
            {asset.type.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={asset.url}
                alt={asset.name}
                className="h-full w-full object-cover opacity-80 transition group-hover:opacity-100"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-white/50">
                {asset.type.split("/")[1]?.toUpperCase() ?? "File"}
              </div>
            )}
            <span className="absolute bottom-0 left-0 right-0 truncate bg-black/70 px-1.5 py-0.5 text-[9px] text-white/80">
              {asset.name}
            </span>
          </button>
        ))}
      </div>

      {assets.length === 0 && (
        <div className="mt-3 rounded-xl border border-dashed border-white/10 bg-black/10 p-4 text-center text-xs text-white/40">
          Upload images, videos, or PDFs to use on the canvas.
        </div>
      )}
    </div>
  )
}
