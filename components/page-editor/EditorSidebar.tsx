"use client"

import type { ReactNode } from "react"

type ExperienceStudioInspectorTab = "inspect" | "layers" | "insert" | "page"

type Props = {
  isEditing: boolean
  isEmbedded: boolean
  isMobilePreview: boolean
  canvasScale: number
  nodeCount: number
  sectionCount: number
  layerCount: number
  selectedKind: "element" | "section" | "none"
  rightRailTab: ExperienceStudioInspectorTab
  onChangeTab: (tab: ExperienceStudioInspectorTab) => void
  children: ReactNode
}

const TAB_OPTIONS: Array<{
  value: ExperienceStudioInspectorTab
  label: string
}> = [
  { value: "inspect", label: "Inspect" },
  { value: "layers", label: "Layers" },
  { value: "insert", label: "Insert" },
  { value: "page", label: "Page" },
]

function getInspectorTitle({
  rightRailTab,
  selectedKind,
}: Pick<Props, "rightRailTab" | "selectedKind">) {
  if (rightRailTab === "layers") return "Scene Layers"
  if (rightRailTab === "insert") return "Insert"
  if (rightRailTab === "page") return "Page Settings"
  if (selectedKind === "element") return "Element Settings"
  if (selectedKind === "section") return "Section Settings"
  return "Inspector"
}

function getInspectorDescription({
  rightRailTab,
  selectedKind,
}: Pick<Props, "rightRailTab" | "selectedKind">) {
  if (rightRailTab === "layers") {
    return "Composition stack, visibility, locks, and z-order."
  }

  if (rightRailTab === "insert") {
    return "Add sections, components, and canvas elements."
  }

  if (rightRailTab === "page") {
    return "Global theme and experience settings."
  }

  if (selectedKind === "element") return "Editing element"
  if (selectedKind === "section") return "Editing section"
  return "Select something to edit"
}

export default function EditorSidebar({
  isEditing,
  isEmbedded,
  isMobilePreview,
  canvasScale,
  nodeCount,
  sectionCount,
  layerCount,
  selectedKind,
  rightRailTab,
  onChangeTab,
  children,
}: Props) {
  return (
    <aside
      className={`relative shrink-0 border-l border-white/[0.07] bg-[#080b14]/95 backdrop-blur-2xl ${
        isEmbedded
          ? "w-[320px] opacity-100"
          : `transition-[width,opacity] duration-300 ${
              isEditing ? "w-[380px] opacity-100" : "pointer-events-none w-0 overflow-hidden opacity-0"
            }`
      }`}
    >
      <div className={`h-full ${isEmbedded ? "w-[320px] p-4" : "w-[380px] p-6"}`}>
        <div className="rounded-[24px] border border-white/[0.07] bg-white/[0.025] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-100/48">
            Experience Studio
          </div>

          <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-white">
            {getInspectorTitle({ rightRailTab, selectedKind })}
          </h3>

          <div className="mt-2 text-sm leading-6 text-white/52">
            {getInspectorDescription({ rightRailTab, selectedKind })}
          </div>

          <div className="mt-4 grid grid-cols-4 gap-1 rounded-2xl border border-white/[0.08] bg-black/24 p-1">
            {TAB_OPTIONS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => onChangeTab(tab.value)}
                className={`rounded-xl px-2 py-2 text-[10px] font-black uppercase tracking-[0.14em] transition ${
                  rightRailTab === tab.value
                    ? "bg-white text-black"
                    : "text-white/42 hover:bg-white/[0.06] hover:text-white/72"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <div className="inline-flex rounded-full border border-white/[0.07] bg-black/22 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/42">
              Preview · {isMobilePreview ? "Mobile" : "Desktop"} · {Math.round(canvasScale * 100)}%
            </div>

            <div className="inline-flex rounded-full border border-white/[0.07] bg-black/22 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/36">
              {nodeCount} nodes · {sectionCount} sections · {layerCount} layers
            </div>
          </div>
        </div>

        <div className="mt-4 min-h-0">{children}</div>
      </div>
    </aside>
  )
}