"use client"

import { useEffect, useRef, useState } from "react"
import {
  ArrowLeft,
  CheckCircle2,
  File,
  Folder,
  FolderOpen,
  Loader2,
  RefreshCw,
  UploadCloud,
  X,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type RemoteEntry = {
  name: string
  type: "file" | "directory"
  size: number
  modified_at: string | null
}

type UploadItem = {
  name: string
  status: "uploading" | "complete" | "failed"
  message: string
}

const maxFileSize = 50 * 1024 * 1024

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function joinPath(parent: string, name: string) {
  return parent ? `${parent}/${name}` : name
}

export default function RemoteFileBrowser({ eventId, destinationId }: { eventId: string; destinationId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [path, setPath] = useState("")
  const [files, setFiles] = useState<RemoteEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const fileInput = useRef<HTMLInputElement>(null)

  async function loadFiles(nextPath = path) {
    if (!destinationId) return
    setLoading(true)
    setError(null)
    try {
      const query = new URLSearchParams({ destination_id: destinationId, path: nextPath })
      const response = await fetch(`/api/admin/events/${eventId}/publishing/files?${query}`, { cache: "no-store" })
      const payload = await response.json().catch((): null => null)
      if (!response.ok) throw new Error(payload?.error || "Could not load remote files")
      setPath(nextPath)
      setFiles(payload.files || [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load remote files")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setIsOpen(false)
    setPath("")
    setFiles([])
    setUploads([])
    setError(null)
  }, [destinationId])

  async function discardStagedUpload(stagingPath: string) {
    await fetch(`/api/admin/events/${eventId}/publishing/upload/prepare`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ destination_id: destinationId, staging_path: stagingPath }),
    }).catch((): void => undefined)
  }

  async function commitUpload(file: globalThis.File, stagingPath: string, overwrite: boolean) {
    return fetch(`/api/admin/events/${eventId}/publishing/upload/commit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        destination_id: destinationId,
        staging_path: stagingPath,
        path,
        file_name: file.name,
        overwrite,
      }),
    })
  }

  async function uploadFile(file: globalThis.File) {
    setUploads((current) => [{ name: file.name, status: "uploading", message: "Uploading…" }, ...current.filter((item) => item.name !== file.name)])

    if (file.size < 1 || file.size > maxFileSize) {
      setUploads((current) => current.map((item) => item.name === file.name ? { ...item, status: "failed", message: "Files must be between 1 byte and 50 MB" } : item))
      return
    }

    let stagingPath = ""
    try {
      const prepareResponse = await fetch(`/api/admin/events/${eventId}/publishing/upload/prepare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination_id: destinationId, file_name: file.name, size_bytes: file.size }),
      })
      const prepared = await prepareResponse.json().catch((): null => null)
      if (!prepareResponse.ok || !prepared?.path || !prepared?.token) {
        throw new Error(prepared?.error || "Could not prepare upload")
      }
      stagingPath = prepared.path

      const supabase = createClient()
      const { error: stagingError } = await supabase.storage
        .from("upload")
        .uploadToSignedUrl(stagingPath, prepared.token, file, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        })
      if (stagingError) throw stagingError

      let commitResponse = await commitUpload(file, stagingPath, false)
      let result = await commitResponse.json().catch((): null => null)
      if (commitResponse.status === 409 && result?.conflict) {
        const replace = window.confirm(`${file.name} already exists in this folder. Replace it? A backup will be kept by Jupiter.`)
        if (!replace) {
          await discardStagedUpload(stagingPath)
          setUploads((current) => current.filter((item) => item.name !== file.name))
          return
        }
        commitResponse = await commitUpload(file, stagingPath, true)
        result = await commitResponse.json().catch((): null => null)
      }
      if (!commitResponse.ok) throw new Error(result?.error || "Could not upload file")

      setUploads((current) => current.map((item) => item.name === file.name ? { ...item, status: "complete", message: result.replaced ? "Replaced safely" : "Uploaded" } : item))
      await loadFiles(path)
    } catch (uploadError) {
      if (stagingPath) await discardStagedUpload(stagingPath)
      setUploads((current) => current.map((item) => item.name === file.name ? { ...item, status: "failed", message: uploadError instanceof Error ? uploadError.message : "Upload failed" } : item))
    }
  }

  async function uploadFiles(selectedFiles: FileList | globalThis.File[]) {
    for (const file of Array.from(selectedFiles)) await uploadFile(file)
  }

  function openBrowser() {
    setIsOpen(true)
    void loadFiles("")
  }

  return (
    <section className="rounded-[26px] border border-white/[.08] bg-white/[.035] p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <FolderOpen className="text-violet-200" size={20} />
          <div>
            <h2 className="font-semibold">Remote files</h2>
            <p className="text-xs text-white/40">Browse this destination and drag files in to upload them.</p>
          </div>
        </div>
        <button type="button" disabled={!destinationId} onClick={isOpen ? () => setIsOpen(false) : openBrowser} className="rounded-xl border border-white/10 bg-white/[.05] px-4 py-2.5 text-sm font-semibold hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35">
          {isOpen ? "Close files" : "Open files"}
        </button>
      </div>

      {!destinationId ? <div className="mt-5 rounded-2xl border border-dashed border-white/10 bg-black/15 px-5 py-8 text-center text-sm text-white/40">Save and select an FTP or FTPS destination to browse its files.</div> : null}

      {isOpen ? (
        <div className="mt-5 overflow-hidden rounded-2xl border border-white/[.09] bg-black/20">
          <div className="flex flex-wrap items-center gap-2 border-b border-white/[.07] px-4 py-3">
            <button type="button" disabled={!path || loading} onClick={() => void loadFiles(path.split("/").slice(0, -1).join("/"))} aria-label="Go to parent folder" className="rounded-lg border border-white/10 p-2 text-white/65 hover:bg-white/10 disabled:opacity-30"><ArrowLeft size={16} /></button>
            <div className="min-w-0 flex-1 truncate text-sm text-white/65"><span className="text-white/35">Remote folder /</span>{path}</div>
            <button type="button" disabled={loading} onClick={() => void loadFiles(path)} aria-label="Refresh remote files" className="rounded-lg border border-white/10 p-2 text-white/65 hover:bg-white/10 disabled:opacity-40"><RefreshCw className={loading ? "animate-spin" : ""} size={16} /></button>
          </div>

          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            onDragEnter={(event) => { event.preventDefault(); setDragging(true) }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false) }}
            onDrop={(event) => { event.preventDefault(); setDragging(false); void uploadFiles(event.dataTransfer.files) }}
            className={`m-4 flex w-[calc(100%-2rem)] flex-col items-center justify-center rounded-xl border border-dashed px-5 py-7 text-center transition ${dragging ? "border-violet-300/70 bg-violet-500/15" : "border-white/15 bg-white/[.025] hover:bg-white/[.05]"}`}
          >
            <UploadCloud className="text-violet-200" size={24} />
            <span className="mt-2 text-sm font-semibold">Drop files into this folder</span>
            <span className="mt-1 text-xs text-white/40">or click to choose files · up to 50 MB each</span>
          </button>
          <input ref={fileInput} type="file" multiple className="hidden" onChange={(event) => { if (event.target.files) void uploadFiles(event.target.files); event.target.value = "" }} />

          {uploads.length > 0 ? (
            <div className="mx-4 mb-4 space-y-2">
              {uploads.map((item) => (
                <div key={item.name} className="flex items-center gap-3 rounded-xl border border-white/[.07] bg-white/[.025] px-3 py-2 text-xs">
                  {item.status === "uploading" ? <Loader2 className="animate-spin text-violet-200" size={15} /> : item.status === "complete" ? <CheckCircle2 className="text-emerald-300" size={15} /> : <X className="text-red-300" size={15} />}
                  <span className="min-w-0 flex-1 truncate font-semibold text-white/75">{item.name}</span>
                  <span className={item.status === "failed" ? "text-red-200" : "text-white/40"}>{item.message}</span>
                </div>
              ))}
            </div>
          ) : null}

          {error ? <div className="m-4 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div> : null}
          {loading && files.length === 0 ? <div className="flex items-center justify-center gap-2 px-4 py-12 text-sm text-white/45"><Loader2 className="animate-spin" size={16} />Loading remote files…</div> : null}
          {!loading && !error && files.length === 0 ? <div className="px-4 py-12 text-center text-sm text-white/40">This folder is empty. Drop a file above to add it.</div> : null}
          {files.length > 0 ? (
            <div className="divide-y divide-white/[.06] border-t border-white/[.07]">
              {files.map((entry) => entry.type === "directory" ? (
                <button key={entry.name} type="button" onClick={() => void loadFiles(joinPath(path, entry.name))} className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 text-left hover:bg-white/[.05]">
                  <Folder className="text-violet-200" size={18} />
                  <span className="truncate text-sm font-semibold text-white/80">{entry.name}</span>
                  <span className="text-xs text-white/35">Folder</span>
                </button>
              ) : (
                <div key={entry.name} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3">
                  <File className="text-sky-200/75" size={18} />
                  <div className="min-w-0"><div className="truncate text-sm text-white/75">{entry.name}</div>{entry.modified_at ? <div className="mt-0.5 text-[11px] text-white/30">{new Date(entry.modified_at).toLocaleString()}</div> : null}</div>
                  <span className="text-xs text-white/35">{formatBytes(entry.size)}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
