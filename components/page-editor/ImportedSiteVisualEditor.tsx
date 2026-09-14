"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Copy, Layers, Move, Trash2 } from "lucide-react"
import { createCustomCodeSource } from "@/lib/page-editor/customCode"

type SelectedInfo = {
  key: number
  tag: string
  label: string
  text: string
  href: string
  src: string
  color: string
  backgroundColor: string
  fontSize: string
  width: string
  height: string
  padding: string
  margin: string
  borderRadius: string
  textAlign: string
}

type DragState = {
  element: HTMLElement
  startX: number
  startY: number
  baseX: number
  baseY: number
  moved: boolean
}

const FIELD_CLASS = "mt-1.5 w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs text-white outline-none focus:border-violet-300/40"

function readTranslate(element: HTMLElement) {
  const match = element.style.translate.match(/^(-?\d+(?:\.\d+)?)px\s+(-?\d+(?:\.\d+)?)px$/)
  return { x: Number(match?.[1] || 0), y: Number(match?.[2] || 0) }
}

function canEditText(element: HTMLElement) {
  return !element.querySelector("*") && Boolean(element.textContent?.trim())
}

function elementLabel(element: HTMLElement) {
  const id = element.id ? `#${element.id}` : ""
  const className = typeof element.className === "string" && element.className.trim()
    ? `.${element.className.trim().split(/\s+/).slice(0, 2).join(".")}`
    : ""
  return `${element.tagName.toLowerCase()}${id}${className}`
}

function inspectElement(element: HTMLElement, key: number): SelectedInfo {
  const styles = element.ownerDocument.defaultView?.getComputedStyle(element)
  return {
    key,
    tag: element.tagName.toLowerCase(),
    label: elementLabel(element),
    text: canEditText(element) ? element.textContent || "" : "",
    href: element.tagName.toLowerCase() === "a" ? element.getAttribute("href") || "" : "",
    src: element.tagName.toLowerCase() === "img" ? element.getAttribute("src") || "" : "",
    color: styles?.color || "",
    backgroundColor: styles?.backgroundColor || "",
    fontSize: styles?.fontSize || "",
    width: element.style.width || "",
    height: element.style.height || "",
    padding: element.style.padding || "",
    margin: element.style.margin || "",
    borderRadius: element.style.borderRadius || "",
    textAlign: element.style.textAlign || "",
  }
}

export default function ImportedSiteVisualEditor({
  html,
  css,
  onChange,
}: {
  html: string
  css: string
  onChange: (html: string) => void
}) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const selectedRef = useRef<HTMLElement | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)
  const selectionCounter = useRef(0)
  const [selected, setSelected] = useState<SelectedInfo | null>(null)

  useEffect(() => () => cleanupRef.current?.(), [])

  const selectElement = useCallback((element: HTMLElement | null) => {
    selectedRef.current?.removeAttribute("data-jupiter-editor-selected")
    selectedRef.current = element
    if (!element) {
      setSelected(null)
      return
    }
    element.setAttribute("data-jupiter-editor-selected", "true")
    selectionCounter.current += 1
    setSelected(inspectElement(element, selectionCounter.current))
  }, [])

  const commitDocument = useCallback(() => {
    const doc = frameRef.current?.contentDocument
    if (!doc) return
    doc.querySelectorAll<HTMLElement>("[data-jupiter-editor-selected]").forEach((element) => element.removeAttribute("data-jupiter-editor-selected"))
    doc.querySelectorAll<HTMLElement>("[contenteditable]").forEach((element) => element.removeAttribute("contenteditable"))
    const nextHtml = doc.body.innerHTML.trim()
    selectedRef.current = null
    setSelected(null)
    onChange(nextHtml)
  }, [onChange])

  const connectFrame = useCallback(() => {
    cleanupRef.current?.()
    const frame = frameRef.current
    const doc = frame?.contentDocument
    if (!frame || !doc?.body || !doc.defaultView) return

    const editorStyle = doc.createElement("style")
    editorStyle.id = "jupiter-import-editor-style"
    editorStyle.textContent = `
      .event-gate { display: none !important; }
      body *:hover { outline: 1px dashed rgba(56,189,248,.35); outline-offset: 2px; }
      [data-jupiter-editor-selected="true"] { outline: 2px solid #38bdf8 !important; outline-offset: 3px !important; cursor: move !important; }
      [data-jupiter-editor-selected="true"]::selection { background: rgba(56,189,248,.28); }
      [contenteditable="true"] { cursor: text !important; outline-color: #a78bfa !important; }
    `
    doc.head.append(editorStyle)

    const abort = new AbortController()
    const options = { signal: abort.signal }

    doc.addEventListener("click", (event) => {
      const target = event.target instanceof doc.defaultView!.HTMLElement ? event.target : null
      if (!target || target === doc.body || target === doc.documentElement) return
      event.preventDefault()
      event.stopPropagation()
      selectElement(target)
    }, options)

    doc.addEventListener("dblclick", (event) => {
      const target = event.target instanceof doc.defaultView!.HTMLElement ? event.target : null
      if (!target || !canEditText(target)) return
      event.preventDefault()
      event.stopPropagation()
      selectElement(target)
      target.contentEditable = "true"
      target.focus()
      doc.getSelection()?.selectAllChildren(target)
    }, options)

    doc.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return
      const target = event.target instanceof doc.defaultView!.HTMLElement ? event.target : null
      if (!target || target === doc.body || target === doc.documentElement || target.isContentEditable) return
      const translate = readTranslate(target)
      selectElement(target)
      dragRef.current = { element: target, startX: event.clientX, startY: event.clientY, baseX: translate.x, baseY: translate.y, moved: false }
      target.setPointerCapture?.(event.pointerId)
    }, options)

    doc.addEventListener("pointermove", (event) => {
      const drag = dragRef.current
      if (!drag) return
      const dx = event.clientX - drag.startX
      const dy = event.clientY - drag.startY
      if (!drag.moved && Math.hypot(dx, dy) < 3) return
      drag.moved = true
      event.preventDefault()
      drag.element.style.translate = `${Math.round(drag.baseX + dx)}px ${Math.round(drag.baseY + dy)}px`
    }, options)

    doc.addEventListener("pointerup", (event) => {
      const drag = dragRef.current
      if (!drag) return
      drag.element.releasePointerCapture?.(event.pointerId)
      dragRef.current = null
      if (drag.moved) commitDocument()
    }, options)

    doc.addEventListener("focusout", (event) => {
      const target = event.target instanceof doc.defaultView!.HTMLElement ? event.target : null
      if (!target?.isContentEditable) return
      target.contentEditable = "false"
      commitDocument()
    }, options)

    doc.addEventListener("keydown", (event) => {
      const target = selectedRef.current
      if (!target || target.isContentEditable) return
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault()
        target.remove()
        commitDocument()
      }
      if (event.key === "Escape") selectElement(null)
    }, options)

    cleanupRef.current = () => {
      abort.abort()
      editorStyle.remove()
    }
  }, [commitDocument, selectElement])

  function updateSelected(mutator: (element: HTMLElement) => void) {
    const element = selectedRef.current
    if (!element) return
    mutator(element)
    commitDocument()
  }

  function styleField(label: string, property: string, value: string) {
    return (
      <label className="block text-[11px] font-semibold text-white/55">
        {label}
        <input
          key={`${selected?.key}-${String(property)}`}
          defaultValue={value}
          className={FIELD_CLASS}
          onBlur={(event) => updateSelected((element) => { element.style.setProperty(property, event.target.value) })}
        />
      </label>
    )
  }

  return (
    <div className="grid min-h-[760px] gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
      <section className="overflow-hidden rounded-[24px] border border-white/10 bg-white">
        <div className="flex items-center justify-between border-b border-white/10 bg-[#080b14] px-4 py-3 text-xs text-white/55">
          <span>Click to select · double-click text to edit · drag to position</span>
          <span className="inline-flex items-center gap-1.5 text-emerald-200/70"><Move size={13} />Visual editing</span>
        </div>
        <iframe
          ref={frameRef}
          title="Imported site visual editor"
          srcDoc={createCustomCodeSource(html, css)}
          sandbox="allow-same-origin"
          onLoad={connectFrame}
          className="block h-[720px] w-full border-0 bg-white"
        />
      </section>

      <aside className="overflow-y-auto rounded-[24px] border border-white/10 bg-[#080b14] p-4">
        <div className="flex items-center gap-2 text-sm font-semibold"><Layers size={16} className="text-violet-300" />Inspector</div>
        {!selected ? (
          <p className="mt-4 text-sm leading-6 text-white/40">Select anything inside the page to edit its content, link, dimensions, spacing, and appearance.</p>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="truncate rounded-lg bg-white/[.05] px-3 py-2 font-mono text-[11px] text-sky-200/75">{selected.label}</div>
            {selected.text ? <label className="block text-[11px] font-semibold text-white/55">Text<textarea key={`${selected.key}-text`} defaultValue={selected.text} className={`${FIELD_CLASS} min-h-20 resize-y`} onBlur={(event) => updateSelected((element) => { element.textContent = event.target.value })} /></label> : null}
            {selected.tag === "a" ? <label className="block text-[11px] font-semibold text-white/55">Link<input key={`${selected.key}-href`} defaultValue={selected.href} className={FIELD_CLASS} onBlur={(event) => updateSelected((element) => element.setAttribute("href", event.target.value))} /></label> : null}
            {selected.tag === "img" ? <label className="block text-[11px] font-semibold text-white/55">Image URL<input key={`${selected.key}-src`} defaultValue={selected.src} className={FIELD_CLASS} onBlur={(event) => updateSelected((element) => element.setAttribute("src", event.target.value))} /></label> : null}
            {styleField("Text color", "color", selected.color)}
            {styleField("Background", "background-color", selected.backgroundColor)}
            {styleField("Font size", "font-size", selected.fontSize)}
            <div className="grid grid-cols-2 gap-2">{styleField("Width", "width", selected.width)}{styleField("Height", "height", selected.height)}</div>
            <div className="grid grid-cols-2 gap-2">{styleField("Padding", "padding", selected.padding)}{styleField("Margin", "margin", selected.margin)}</div>
            <div className="grid grid-cols-2 gap-2">{styleField("Corner radius", "border-radius", selected.borderRadius)}{styleField("Alignment", "text-align", selected.textAlign)}</div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button type="button" onClick={() => updateSelected((element) => element.after(element.cloneNode(true)))} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-white/65 hover:bg-white/[.06]"><Copy size={13} />Duplicate</button>
              <button type="button" onClick={() => updateSelected((element) => element.remove())} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-300/15 px-3 py-2 text-xs font-semibold text-red-200/70 hover:bg-red-400/10"><Trash2 size={13} />Delete</button>
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}
