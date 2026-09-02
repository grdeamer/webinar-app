"use client"

import type { EventPageElement } from "@/lib/page-editor/sectionTypes"

const FONT_OPTIONS = [
  { label: "Inter", value: "Inter, sans-serif" },
  { label: "Instrument Sans", value: "Instrument Sans, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Space Grotesk", value: "Space Grotesk, sans-serif" },
]

const buttonClass =
  "flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-bold text-white/62 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/70"

export default function TextContextToolbar({
  element,
  onUpdate,
  onDuplicate,
  onToggleLock,
  onDelete,
}: {
  element: EventPageElement
  onUpdate: (props: Record<string, unknown>) => void
  onDuplicate: () => void
  onToggleLock: () => void
  onDelete: () => void
}) {
  const props = element.props ?? {}
  const weight = Number(props.fontWeight ?? 500)
  const italic = props.fontStyle === "italic"
  const underlined = props.textDecoration === "underline"
  const alignment = String(props.textAlign ?? "left")

  return (
    <div
      role="toolbar"
      aria-label="Text formatting"
      className="sticky top-3 z-40 mx-auto mb-3 flex w-fit max-w-[calc(100%-1rem)] items-center gap-1 overflow-x-auto rounded-xl border border-white/12 bg-[#111621]/96 p-1.5 shadow-[0_18px_55px_rgba(0,0,0,0.46)] backdrop-blur-xl"
    >
      <select
        aria-label="Font family"
        value={String(props.fontFamily ?? "Inter, sans-serif")}
        onChange={(event) => onUpdate({ fontFamily: event.target.value })}
        className="h-8 w-36 rounded-lg border border-white/8 bg-black/20 px-2 text-xs font-semibold text-white/78 outline-none"
      >
        {FONT_OPTIONS.map((font) => (
          <option key={font.value} value={font.value}>{font.label}</option>
        ))}
      </select>
      <input
        aria-label="Font size"
        type="number"
        min="6"
        max="320"
        value={Number(props.fontSize ?? 22)}
        onChange={(event) => onUpdate({ fontSize: Number(event.target.value || 22) })}
        className="h-8 w-16 rounded-lg border border-white/8 bg-black/20 px-2 text-xs font-semibold tabular-nums text-white/78 outline-none"
      />
      <span className="mx-1 h-5 w-px bg-white/10" />
      <button type="button" aria-label="Bold" aria-pressed={weight >= 700} onClick={() => onUpdate({ fontWeight: weight >= 700 ? 500 : 700 })} className={`${buttonClass} ${weight >= 700 ? "bg-violet-500/24 text-violet-100" : ""}`}>B</button>
      <button type="button" aria-label="Italic" aria-pressed={italic} onClick={() => onUpdate({ fontStyle: italic ? "normal" : "italic" })} className={`${buttonClass} italic ${italic ? "bg-violet-500/24 text-violet-100" : ""}`}>I</button>
      <button type="button" aria-label="Underline" aria-pressed={underlined} onClick={() => onUpdate({ textDecoration: underlined ? "none" : "underline" })} className={`${buttonClass} underline ${underlined ? "bg-violet-500/24 text-violet-100" : ""}`}>U</button>
      <span className="mx-1 h-5 w-px bg-white/10" />
      {(["left", "center", "right"] as const).map((value) => (
        <button key={value} type="button" aria-label={`Align ${value}`} aria-pressed={alignment === value} onClick={() => onUpdate({ textAlign: value })} className={`${buttonClass} ${alignment === value ? "bg-white/10 text-white" : ""}`}>{value === "left" ? "≡" : value === "center" ? "≣" : "≡"}</button>
      ))}
      <label className="ml-1 flex h-8 items-center gap-2 rounded-lg px-2 text-[10px] font-semibold text-white/48 hover:bg-white/8">
        <span>Color</span>
        <input aria-label="Text color" type="color" value={String(props.textColor ?? "#ffffff")} onChange={(event) => onUpdate({ textColor: event.target.value })} className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent p-0" />
      </label>
      <select aria-label="Text effect" value={String(props.textEffect ?? "none")} onChange={(event) => onUpdate({ textEffect: event.target.value })} className="h-8 rounded-lg border border-white/8 bg-black/20 px-2 text-[10px] font-semibold text-white/65 outline-none"><option value="none">No effect</option><option value="shadow">Shadow</option><option value="glow">Glow</option><option value="outline">Outline</option></select>
      <details className="relative"><summary aria-label="More text actions" className={`${buttonClass} cursor-pointer list-none`}>•••</summary><div className="absolute right-0 top-10 z-50 grid w-36 gap-1 rounded-xl border border-white/10 bg-[#111621] p-1.5 shadow-2xl"><button type="button" className={buttonClass} onClick={onDuplicate}>Duplicate</button><button type="button" className={buttonClass} onClick={onToggleLock}>{element.locked ? "Unlock" : "Lock"}</button></div></details>
      <button type="button" aria-label="Delete text element" title="Delete" onClick={onDelete} className={`${buttonClass} text-red-200/70 hover:bg-red-400/15 hover:text-red-100`}>⌫</button>
    </div>
  )
}
