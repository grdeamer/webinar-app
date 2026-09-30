"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

export default function SaveSharedTemplateDialog({ pageTitle, preview, elementCount, onSave, onClose }: {
  pageTitle: string
  preview: ReactNode
  elementCount: number
  onSave: (name: string) => Promise<void>
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const savingRef = useRef(false)
  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    nameRef.current?.focus()
    return () => dialog?.close()
  }, [])
  async function submit() {
    if (!name.trim() || savingRef.current) return
    savingRef.current = true
    setSaving(true)
    setError(null)
    try { await onSave(name.trim()); onClose() }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save the template. Try again.") }
    finally { savingRef.current = false; setSaving(false) }
  }
  return <dialog ref={dialogRef} aria-labelledby="shared-template-title" aria-describedby="shared-template-description" onCancel={event => { event.preventDefault(); if (!savingRef.current) onClose() }} className="fixed inset-0 m-auto max-h-[90vh] w-[min(920px,calc(100%_-_32px))] overflow-auto rounded-2xl border border-white/10 bg-[#0b0e17] p-6 text-white shadow-2xl backdrop:bg-black/70">
    <form onSubmit={event => { event.preventDefault(); void submit() }}>
      <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-violet-300">Shared library</p><h2 id="shared-template-title" className="mt-2 text-xl font-semibold">Save as shared template</h2></div><button type="button" aria-label="Close template dialog" disabled={saving} onClick={onClose} className="rounded-lg px-3 py-1 text-white/60 hover:bg-white/5 disabled:opacity-40">×</button></div>
      <p id="shared-template-description" className="mt-3 text-sm leading-6 text-white/60">Save {pageTitle} as a reusable page for other events. This includes its layout, components, theme, and content—not the entire event.</p>
      <label className="mt-5 block text-sm">Template name<input ref={nameRef} required maxLength={100} disabled={saving} value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Branded event home" className="mt-2 w-full rounded-lg border border-white/15 bg-black/20 px-3 py-3 outline-none focus:border-violet-400" /></label>
      <div className="mt-5 flex flex-wrap justify-between gap-2 text-xs text-white/45"><span>Page section preview · live components show sample content</span><span>{elementCount} canvas {elementCount === 1 ? "asset" : "assets"} also included</span></div>
      <div className="mt-2 max-h-[240px] overflow-auto rounded-xl border border-white/10"><div inert>{preview}</div></div>
      <p className="mt-4 text-xs leading-5 text-white/50">Available to administrators across events. Applying it creates an independent copy. Live components use the destination event’s data; review copied text, logos, and links.</p>
      {error ? <p role="alert" className="mt-4 text-sm text-red-200">{error}</p> : null}
      <div className="mt-6 flex justify-end gap-3"><button type="button" disabled={saving} onClick={onClose} className="rounded-lg border border-white/10 px-4 py-2 text-sm disabled:opacity-40">Cancel</button><button type="submit" disabled={saving || !name.trim()} className="rounded-lg bg-violet-500 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-40">{saving ? "Saving…" : "Save shared template"}</button></div>
    </form>
  </dialog>
}
