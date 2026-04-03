"use client"

import { getSectionRegistryItem } from "@/lib/page-editor/sectionRegistry"
import type { SectionConfig } from "@/lib/page-editor/sectionTypes"

type EventPageSection = {
  id: string
  type: any
  config: SectionConfig
}

type Props = {
  sections: EventPageSection[]
  sectionsListOpen: boolean
  setSectionsListOpen: React.Dispatch<React.SetStateAction<boolean>>
  selectedSectionId: string | null
  draggingSectionId: string | null
  dragOverSectionId: string | null
  handleSectionDragStart: (sectionId: string) => void
  handleSectionDragOver: (e: React.DragEvent<HTMLButtonElement>, sectionId: string) => void
  handleSectionDrop: (sectionId: string) => void
  handleSectionDragEnd: () => void
  setSelectedSectionId: React.Dispatch<React.SetStateAction<string | null>>
  setSelectedId: React.Dispatch<React.SetStateAction<string | null>>
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>
  setEditingElementId: React.Dispatch<React.SetStateAction<string | null>>
  SectionPanelHeader: React.ComponentType<{
    title: string
    open: boolean
    onToggle: () => void
  }>
}

export default function SectionsListCard({
  sections,
  sectionsListOpen,
  setSectionsListOpen,
  selectedSectionId,
  draggingSectionId,
  dragOverSectionId,
  handleSectionDragStart,
  handleSectionDragOver,
  handleSectionDrop,
  handleSectionDragEnd,
  setSelectedSectionId,
  setSelectedId,
  setSelectedIds,
  setEditingElementId,
  SectionPanelHeader,
}: Props) {
  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
      <SectionPanelHeader
        title="Sections"
        open={sectionsListOpen}
        onToggle={() => setSectionsListOpen((v) => !v)}
      />

      {sectionsListOpen && (
        <>
          <div className="mt-3 space-y-2">
            {sections.map((section) => {
              const isActive = selectedSectionId === section.id
              const isDragging = draggingSectionId === section.id
              const isDragOver = dragOverSectionId === section.id
              const label =
                section.config.adminLabel ||
                getSectionRegistryItem(section.type).label

              return (
                <button
                  key={section.id}
                  draggable={section.type !== "hero"}
                  onDragStart={() => handleSectionDragStart(section.id)}
                  onDragOver={(e) => handleSectionDragOver(e, section.id)}
                  onDrop={() => handleSectionDrop(section.id)}
                  onDragEnd={handleSectionDragEnd}
                  onClick={() => {
                    setSelectedSectionId(section.id)
                    setSelectedId(null)
                    setSelectedIds([])
                    setEditingElementId(null)
                  }}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left transition ${
                    isActive
                      ? "border-sky-400 bg-sky-400/10 text-white"
                      : "border-white/10 bg-black/20 text-white/80 hover:bg-white/5"
                  } ${isDragging ? "opacity-50" : ""} ${
                    isDragOver ? "ring-2 ring-emerald-400 ring-inset" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-white/35">
                      {section.type !== "hero" ? "⋮⋮" : ""}
                    </div>

                    <div>
                      <div className="text-sm font-medium">{label}</div>
                      <div className="mt-1 text-xs text-white/45">
                        {getSectionRegistryItem(section.type).label}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <div
                      className={`text-[10px] uppercase tracking-[0.18em] ${
                        section.config.visible === false
                          ? "text-red-300/80"
                          : "text-emerald-300/80"
                      }`}
                    >
                      {section.config.visible === false ? "Hidden" : "Visible"}
                    </div>

                    {section.config.hideOnMobile && (
                      <div className="text-[10px] uppercase tracking-[0.18em] text-amber-300/80">
                        No Mobile
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          <div className="mt-3 text-xs text-white/35">
            Drag content sections to reorder. Hero stays pinned to the top.
          </div>
        </>
      )}
    </div>
  )
}