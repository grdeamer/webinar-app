"use client"

import { useRef, useState } from "react"
import type { RichTextRun } from "@/lib/page-editor/richText"

function readRuns(root: HTMLElement): RichTextRun[] {
  const runs: RichTextRun[] = []
  const visit = (node: Node, inherited: Omit<RichTextRun, "text"> = {}) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? ""
      if (text) runs.push({ text, ...inherited })
      return
    }
    if (!(node instanceof HTMLElement)) return
    const tag = node.tagName.toLowerCase()
    const style = node.style
    const next = {
      ...inherited,
      bold: inherited.bold || tag === "b" || tag === "strong" || Number(style.fontWeight) >= 600,
      italic: inherited.italic || tag === "i" || tag === "em" || style.fontStyle === "italic",
      underline: inherited.underline || tag === "u" || style.textDecoration.includes("underline"),
      strike: inherited.strike || tag === "s" || tag === "strike" || style.textDecoration.includes("line-through"),
      color: style.color || inherited.color,
    }
    Array.from(node.childNodes).forEach((child) => visit(child, next))
    if ((tag === "div" || tag === "p" || tag === "br") && node !== root) runs.push({ text: "\n", ...next })
  }
  Array.from(root.childNodes).forEach((child) => visit(child))
  return runs.filter((run, index) => run.text !== "\n" || index < runs.length - 1)
}

export default function RichTextInlineEditor({ content, runs, onCommit, onCancel }: { content: string; runs: RichTextRun[]; onCommit: (text: string, runs: RichTextRun[]) => void; onCancel: () => void }) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [color, setColor] = useState("#ffffff")
  const command = (name: string, value?: string) => { editorRef.current?.focus(); document.execCommand(name, false, value) }
  return <div className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-violet-300/40 bg-white text-black shadow-xl" onPointerDown={(event) => event.stopPropagation()}>
    <div className="flex shrink-0 items-center gap-1 border-b border-black/10 bg-slate-100 p-1">
      <button type="button" aria-label="Bold selection" onMouseDown={(event) => event.preventDefault()} onClick={() => command("bold")} className="h-7 w-7 rounded font-bold hover:bg-black/10">B</button>
      <button type="button" aria-label="Italic selection" onMouseDown={(event) => event.preventDefault()} onClick={() => command("italic")} className="h-7 w-7 rounded italic hover:bg-black/10">I</button>
      <button type="button" aria-label="Underline selection" onMouseDown={(event) => event.preventDefault()} onClick={() => command("underline")} className="h-7 w-7 rounded underline hover:bg-black/10">U</button>
      <button type="button" aria-label="Strikethrough selection" onMouseDown={(event) => event.preventDefault()} onClick={() => command("strikeThrough")} className="h-7 w-7 rounded line-through hover:bg-black/10">S</button>
      <input aria-label="Selection color" type="color" value={color} onChange={(event) => { setColor(event.target.value); command("foreColor", event.target.value) }} className="h-7 w-8" />
      <span className="ml-auto text-[9px] text-black/45">Select text, then format · ⌘↵ saves</span>
    </div>
    <div
      ref={editorRef}
      data-inline-editor="true"
      contentEditable
      suppressContentEditableWarning
      autoFocus
      onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") { event.preventDefault(); const next = readRuns(event.currentTarget); onCommit(next.map((run) => run.text).join(""), next) } else if (event.key === "Escape") onCancel() }}
      onBlur={(event) => { if (event.currentTarget.parentElement?.contains(event.relatedTarget as Node)) return; const next = readRuns(event.currentTarget); onCommit(next.map((run) => run.text).join(""), next) }}
      className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap px-3 py-2 text-sm outline-none"
    >
      {runs.length ? runs.map((run, index) => <span key={index} style={{ fontWeight: run.bold ? 700 : undefined, fontStyle: run.italic ? "italic" : undefined, textDecoration: [run.underline ? "underline" : "", run.strike ? "line-through" : ""].filter(Boolean).join(" ") || undefined, color: run.color }}>{run.text}</span>) : content}
    </div>
  </div>
}
