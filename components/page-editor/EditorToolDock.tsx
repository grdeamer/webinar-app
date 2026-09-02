"use client"

import {
  Brush01,
  Image01,
  LayersThree01,
  Stars02,
  Type01,
  UploadCloud01,
} from "@untitledui/icons"
import { AppWindow } from "lucide-react"
import type { ReactNode } from "react"

export type EditorToolPanel = "design" | "elements" | "text" | "media" | "brand" | "apps"

const TOOLS: Array<{
  id: EditorToolPanel
  label: string
  icon: ReactNode
}> = [
  { id: "design", label: "Design", icon: <Brush01 /> },
  { id: "elements", label: "Elements", icon: <LayersThree01 /> },
  { id: "text", label: "Text", icon: <Type01 /> },
  { id: "media", label: "Media", icon: <Image01 /> },
  { id: "brand", label: "Brand", icon: <Stars02 /> },
  { id: "apps", label: "Apps", icon: <AppWindow /> },
]

export default function EditorToolDock({
  activePanel,
  onChangePanel,
}: {
  activePanel: EditorToolPanel
  onChangePanel: (panel: EditorToolPanel) => void
}) {
  return (
    <nav
      aria-label="Editor tools"
      className="flex w-[74px] shrink-0 flex-col items-center gap-1 border-r border-white/[0.07] bg-[#080b13] px-2 py-3"
    >
      {TOOLS.map((tool) => {
        const active = activePanel === tool.id
        return (
          <button
            key={tool.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChangePanel(tool.id)}
            className={`group flex min-h-[62px] w-full flex-col items-center justify-center gap-1.5 rounded-xl text-[10px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/70 ${
              active
                ? "bg-violet-500/18 text-violet-100 shadow-[inset_2px_0_0_#8b5cf6]"
                : "text-white/44 hover:bg-white/[0.055] hover:text-white/82"
            }`}
          >
            <span className={`h-[18px] w-[18px] ${active ? "text-violet-300" : "text-white/46 group-hover:text-white/76"}`}>
              {tool.icon}
            </span>
            <span>{tool.label}</span>
          </button>
        )
      })}
      <div className="mt-auto flex w-full flex-col items-center gap-1 border-t border-white/[0.07] pt-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-300/15 bg-emerald-400/10 text-emerald-200">
          <UploadCloud01 className="h-4 w-4" />
        </div>
        <span className="text-[9px] font-semibold text-white/35">Saved</span>
      </div>
    </nav>
  )
}
