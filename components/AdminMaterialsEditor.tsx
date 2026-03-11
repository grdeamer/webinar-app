"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

export type MaterialKind = "pdf" | "pptx" | "docx" | "zip" | "link"

export type Material = {
  label: string
  url: string // can be https://... or storage:bucket/path
  kind?: MaterialKind
}

function isProbablyUrlOrStorageRef(v: string) {
  const s = (v || "").trim()
  return s.startsWith("http://") || s.startsWith("https://") || s.startsWith("storage:")
}

const KIND_OPTIONS: MaterialKind[] = ["pdf", "pptx", "docx", "zip", "link"]

function guessKindFromFilename(name: string): MaterialKind {
  const lower = (name || "").toLowerCase()
  if (lower.endsWith(".pdf")) return "pdf"
  if (lower.endsWith(".ppt") || lower.endsWith(".pptx")) return "pptx"
  if (lower.endsWith(".doc") || lower.endsWith(".docx")) return "docx"
  if (lower.endsWith(".zip")) return "zip"
  return "link"
}

function makeLocalId(m: Material, idx: number) {
  return `${idx}-${m.label}-${m.url}`.slice(0, 120)
}

function DragHandle() {
  return (
    <span
      className="inline-flex select-none items-center justify-center rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-white/60 hover:bg-white/10"
      title="Drag to reorder"
      aria-hidden
    >
      ≡
    </span>
  )
}

function SortableMaterialRow(props: {
  id: string
  idx: number
  material: Material
  onChange: (patch: Partial<Material>) => void
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: props.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.75 : 1,
  }

  const m = props.material
  const labelBad = m.label.trim().length === 0
  const urlBad = m.url.trim().length === 0 || !isProbablyUrlOrStorageRef(m.url)

  return (
    <div ref={setNodeRef} style={style} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span {...attributes} {...listeners}>
            <DragHandle />
          </span>
          <div className="text-xs text-white/50">Drag to reorder</div>
        </div>

        <button
          type="button"
          onClick={props.onRemove}
          className="rounded-xl bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10 transition"
        >
          Remove
        </button>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-12 md:items-end">
        <div className="md:col-span-4">
          <label className="block text-xs text-white/60">Label</label>
          <input
            value={m.label}
            onChange={(e) => props.onChange({ label: e.target.value })}
            placeholder="Worksheet 1"
            className={[
              "mt-1 w-full rounded-xl border bg-slate-950/60 px-3 py-2 text-sm text-white outline-none",
              labelBad ? "border-red-500/40" : "border-white/10 focus:border-white/20",
            ].join(" ")}
          />
        </div>

        <div className="md:col-span-6">
          <label className="block text-xs text-white/60">URL or storage ref</label>
          <input
            value={m.url}
            onChange={(e) => props.onChange({ url: e.target.value })}
            placeholder="storage:webinar-materials/<path>  or  https://…"
            className={[
              "mt-1 w-full rounded-xl border bg-slate-950/60 px-3 py-2 text-sm text-white outline-none",
              urlBad ? "border-red-500/40" : "border-white/10 focus:border-white/20",
            ].join(" ")}
          />
          <div className="mt-1 text-[11px] text-white/45">
            Uploaded files use <span className="text-white/60">storage:</span> refs.
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs text-white/60">Type</label>
          <select
            value={m.kind ?? "pdf"}
            onChange={(e) => props.onChange({ kind: e.target.value as any })}
            className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
          >
            {KIND_OPTIONS.map((k) => (
              <option key={k} value={k}>
                {k.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {(labelBad || urlBad) && (
        <div className="mt-2 text-xs text-red-300">
          {labelBad ? "Label required. " : ""}
          {urlBad ? "Valid URL required (http/https) or storage:bucket/path." : ""}
        </div>
      )}
    </div>
  )
}

export function AdminMaterialsEditor(props: {
  webinarId: string
  initialAgendaUrl?: string | null
  initialMaterials?: Material[] | null
}) {
  const router = useRouter()

  const [agendaUrl, setAgendaUrl] = React.useState(props.initialAgendaUrl ?? "")
  const [materials, setMaterials] = React.useState<Material[]>(
    Array.isArray(props.initialMaterials) ? props.initialMaterials : []
  )

  const [saving, setSaving] = React.useState(false)
  const [status, setStatus] = React.useState<{ type: "ok" | "err"; msg: string } | null>(null)

  const [uploadingAgenda, setUploadingAgenda] = React.useState(false)
  const [uploadingMaterial, setUploadingMaterial] = React.useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function updateMaterial(idx: number, patch: Partial<Material>) {
    setMaterials((prev) => prev.map((m, i) => (i === idx ? { ...m, ...patch } : m)))
    setStatus(null)
  }

  function addMaterialRow(prefill?: Partial<Material>) {
    setMaterials((prev) => [...prev, { label: "", url: "", kind: "pdf", ...prefill }])
    setStatus(null)
  }

  function removeMaterial(idx: number) {
    setMaterials((prev) => prev.filter((_, i) => i !== idx))
    setStatus(null)
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const ids = materials.map((m, i) => makeLocalId(m, i))
    const oldIndex = ids.indexOf(String(active.id))
    const newIndex = ids.indexOf(String(over.id))
    if (oldIndex === -1 || newIndex === -1) return

    setMaterials((prev) => arrayMove(prev, oldIndex, newIndex))
    setStatus(null)
  }

  const invalidAgenda = agendaUrl.trim().length > 0 && !isProbablyUrlOrStorageRef(agendaUrl)

  const invalidRows = materials
    .map((m, i) => ({
      i,
      labelBad: m.label.trim().length === 0,
      urlBad: m.url.trim().length === 0 || !isProbablyUrlOrStorageRef(m.url),
    }))
    .filter((r) => r.labelBad || r.urlBad)

  async function uploadFile(file: File, kind: "agenda" | "material") {
    const fd = new FormData()
    fd.append("file", file)
    fd.append("kind", kind)

    const res = await fetch(`/api/admin/webinars/${props.webinarId}/upload`, {
      method: "POST",
      body: fd,
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(data?.error || `Upload failed (${res.status})`)
    }

    return data as { storageUrl: string; fileName: string }
  }

  async function onAgendaFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    setUploadingAgenda(true)
    setStatus(null)

    try {
      const out = await uploadFile(file, "agenda")
      setAgendaUrl(out.storageUrl)
      setStatus({ type: "ok", msg: "Agenda uploaded. Click Save to persist." })
    } catch (err: any) {
      setStatus({ type: "err", msg: err?.message ?? "Agenda upload failed" })
    } finally {
      setUploadingAgenda(false)
    }
  }

  async function onMaterialFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    setUploadingMaterial(true)
    setStatus(null)

    try {
      const out = await uploadFile(file, "material")
      const kind = guessKindFromFilename(out.fileName)
      const label = out.fileName.replace(/\.[^.]+$/, "")
      addMaterialRow({ label, url: out.storageUrl, kind })
      setStatus({ type: "ok", msg: "Material uploaded and added. Click Save to persist." })
    } catch (err: any) {
      setStatus({ type: "err", msg: err?.message ?? "Material upload failed" })
    } finally {
      setUploadingMaterial(false)
    }
  }

  async function save() {
    setSaving(true)
    setStatus(null)

    const res = await fetch(`/api/admin/webinars/${props.webinarId}/materials`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        agenda_pdf_url: agendaUrl.trim() ? agendaUrl.trim() : null,
        materials,
      }),
    })

    const data = await res.json().catch(() => ({}))

    try {
      if (!res.ok) throw new Error(data?.error || `Save failed (${res.status})`)

      setStatus({ type: "ok", msg: "Saved! Refreshing…" })
      setTimeout(() => router.refresh(), 700)
    } catch (e: any) {
      setStatus({ type: "err", msg: e?.message ?? "Save failed" })
    } finally {
      setSaving(false)
    }
  }

  const sortableIds = materials.map((m, i) => makeLocalId(m, i))

  return (
    <section className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Agenda & Class Materials</h2>
          <p className="mt-1 text-sm text-white/60">
            Admin actions use your existing admin session cookie.
          </p>
        </div>

        <button
          type="button"
          onClick={save}
          disabled={saving || invalidAgenda || invalidRows.length > 0}
          className={[
            "rounded-xl px-4 py-2 text-sm font-medium transition",
            saving || invalidAgenda || invalidRows.length > 0
              ? "bg-white/5 text-white/40 cursor-not-allowed"
              : "bg-white/10 text-white hover:bg-white/15",
          ].join(" ")}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      {status && (
        <div
          className={[
            "mt-3 rounded-xl border px-4 py-2 text-sm",
            status.type === "ok"
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
              : "border-red-500/20 bg-red-500/10 text-red-200",
          ].join(" ")}
        >
          {status.msg}
        </div>
      )}

      <div className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="block text-sm font-medium text-white/80">Agenda PDF URL</label>

          <label className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15 transition cursor-pointer">
            {uploadingAgenda ? "Uploading…" : "Upload agenda PDF"}
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={onAgendaFilePicked}
              disabled={uploadingAgenda}
            />
          </label>
        </div>

        <input
          value={agendaUrl}
          onChange={(e) => setAgendaUrl(e.target.value)}
          placeholder="storage:webinar-materials/<path>  or  https://…"
          className={[
            "mt-2 w-full rounded-xl border bg-slate-950/60 px-3 py-2 text-sm text-white outline-none",
            invalidAgenda ? "border-red-500/40" : "border-white/10 focus:border-white/20",
          ].join(" ")}
        />
      </div>

      <div className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-white/80">Class materials</div>
            <div className="text-xs text-white/50">Drag to reorder</div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15 transition cursor-pointer">
              {uploadingMaterial ? "Uploading…" : "Upload material"}
              <input
                type="file"
                className="hidden"
                onChange={onMaterialFilePicked}
                disabled={uploadingMaterial}
              />
            </label>

            <button
              type="button"
              onClick={() => addMaterialRow()}
              className="rounded-xl bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15 transition"
            >
              + Add row
            </button>
          </div>
        </div>

        {materials.length === 0 ? (
          <div className="mt-3 rounded-xl border border-white/10 bg-slate-950/40 p-4 text-sm text-white/50">
            No materials yet. Upload a file or click “Add row”.
          </div>
        ) : (
          <div className="mt-3">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {materials.map((m, idx) => (
                    <SortableMaterialRow
                      key={sortableIds[idx]}
                      id={sortableIds[idx]}
                      idx={idx}
                      material={m}
                      onChange={(patch) => updateMaterial(idx, patch)}
                      onRemove={() => removeMaterial(idx)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}
      </div>
    </section>
  )
}