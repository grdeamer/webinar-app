"use client"

import { useRef } from "react"

export type CanvasAction = {
  label: string
  onClick: () => void
  disabled?: boolean
}

export default function CanvasSelectionToolbar({ label, actions, onReplaceImage }: {
  label: string
  actions: CanvasAction[]
  onReplaceImage?: (file: File) => void
}) {
  const imageInput = useRef<HTMLInputElement>(null)
  return <div role="group" aria-label="Canvas selection actions" className="sticky top-2 z-50 mx-auto mb-3 flex w-fit max-w-full flex-wrap items-center gap-1 rounded-xl border border-slate-700 bg-[#151a2b] px-2 py-1.5 text-white shadow-lg">
    <span className="max-w-48 truncate px-2 text-xs font-semibold text-slate-300">{label}</span>
    {actions.map((action) => <button key={action.label} type="button" onClick={action.onClick} disabled={action.disabled} className="min-h-8 rounded-md px-2 text-xs font-semibold hover:bg-white/10 disabled:opacity-35">{action.label}</button>)}
    {onReplaceImage && <>
      <input ref={imageInput} className="hidden" type="file" accept="image/*" onChange={(event) => {
        const file = event.target.files?.[0]
        if (file) onReplaceImage(file)
        event.target.value = ""
      }} />
      <button type="button" onClick={() => imageInput.current?.click()} className="min-h-8 rounded-md px-2 text-xs font-semibold hover:bg-white/10">Replace image</button>
    </>}
  </div>
}
