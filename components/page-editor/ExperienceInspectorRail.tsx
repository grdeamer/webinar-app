"use client"

import type { Dispatch, DragEvent, SetStateAction } from "react"
import type { AgendaDisplayMode } from "@/components/page-editor/experience-studio/AgendaInspector"
import type { RegistrationInspectorField } from "@/components/page-editor/experience-studio/RegistrationFieldsCard"
import type { RegistrationPreviewState } from "@/components/page-editor/experience-studio/RegistrationPreviewStateCard"
import type { RegistrationVariant } from "@/components/page-editor/experience-studio/RegistrationVariantCard"
import type { SessionsDisplayMode } from "@/components/page-editor/experience-studio/SessionsInspector"
import SystemComponentInspector from "@/components/page-editor/experience-studio/SystemComponentInspector"
import {
  SECTION_TEMPLATE_OPTIONS,
  getDefaultSectionConfig,
  getSectionRegistryItem,
} from "@/lib/page-editor/sectionRegistry"
import { SYSTEM_COMPONENTS } from "@/lib/page-editor/systemComponentRegistry"
import type {
  EventTheme,
  EventPageSection,
  ExperienceNode,
  SectionBlock,
  SectionConfig,
  SectionType,
  SystemComponentKey,
} from "@/lib/page-editor/sectionTypes"
import AgendaInspectorPanel from "./AgendaInspectorPanel"
import RegistrationInspectorPanel from "./RegistrationInspectorPanel"
import SectionPanelHeader from "./SectionPanelHeader"
import SessionsInspectorPanel from "./SessionsInspectorPanel"
import SpeakerCardsInspector from "./SpeakerCardsInspector"

type EditorElement = {
  id: string
  element_type?: string
  content: string
  x: number
  y: number
  width?: number | null
  height?: number | null
  z_index?: number
  visible?: boolean
  locked?: boolean
  props?: Record<string, unknown>
}

type EditorExperienceNode = ExperienceNode & {
  sourceType: "section" | "element"
}

type AddableElementType = "text" | "image" | "pdf" | "video" | "button" | "spacer"
type RightRailTab = "inspect" | "layers" | "insert" | "page"
type RegistrationFieldTemplate = "jobTitle" | "phone" | "dietaryNeeds"
type RegistrationCopyKey =
  | "title"
  | "body"
  | "ctaLabel"
  | "confirmationTitle"
  | "confirmationBody"
type SelectedBlockPropsPatch =
  | Partial<Extract<SectionBlock, { type: "rich_text" }>["props"]>
  | Partial<Extract<SectionBlock, { type: "system_component" }>["props"]>

interface ExperienceInspectorRailProps {
  addElement: (elementType: AddableElementType) => void
  addElementOpen: boolean
  addRegistrationFieldFromTemplate: (template: RegistrationFieldTemplate) => void
  addSectionTemplate: (key: SectionType, title: string) => void
  addSystemBlockToSelectedSection: (componentKey: SystemComponentKey) => void
  bringLayerForward: (node: EditorExperienceNode) => void
  bringSelectedElementForward: () => void
  canBringForward: boolean
  canDeleteElement: boolean
  canDeleteSection: boolean
  canDuplicateElement: boolean
  canDuplicateSection: boolean
  canMoveDown: boolean
  canMoveUp: boolean
  canSendBackward: boolean
  canvasScale: number
  deleteSelectedBlock: () => void
  deleteSelectedElement: () => void
  deleteSelectedSection: () => void
  draggingLayerNodeId: string | null
  draggingSectionId: string | null
  dragOverLayerNodeId: string | null
  dragOverSectionId: string | null
  duplicateSelectedElement: () => void
  duplicateSelectedSection: () => void
  editorDetailsOpen: boolean
  eventTheme: EventTheme
  getSelectedRegistrationFields: () => RegistrationInspectorField[]
  handleLayerDragEnd: () => void
  handleLayerDragOver: (
    event: DragEvent<HTMLButtonElement>,
    node: EditorExperienceNode
  ) => void
  handleLayerDragStart: (node: EditorExperienceNode) => void
  handleLayerDrop: (
    event: DragEvent<HTMLButtonElement>,
    node: EditorExperienceNode
  ) => void
  handleSectionDragEnd: () => void
  handleSectionDragOver: (event: DragEvent<HTMLElement>, sectionId: string) => void
  handleSectionDragStart: (sectionId: string) => void
  handleSectionDrop: (event: DragEvent<HTMLElement>, sectionId: string) => void
  hoveredExperienceNodeId: string | null
  isEditing: boolean
  isEmbedded: boolean
  isMobilePreview: boolean
  moveRegistrationFieldInSelectedBlock: (
    fieldId: string,
    direction: "up" | "down"
  ) => void
  moveSelectedBlock: (direction: "up" | "down") => void
  moveSelectedSection: (direction: "up" | "down") => void
  orderedExperienceNodes: EditorExperienceNode[]
  removeRegistrationField: (fieldId: string) => void
  resetRegistrationFields: () => void
  rightRailTab: RightRailTab
  saveCurrentTemplate: () => Promise<void>
  saveLayout: (isAutoSave?: boolean) => Promise<void>
  saveMessage: string | null
  sections: EventPageSection[]
  sectionsListOpen: boolean
  sectionTemplatesOpen: boolean
  selectBlock: (sectionId: string, blockId: string) => void
  selectedBlock: SectionBlock | null
  selectedElement: EditorElement | null
  selectedExperienceNode: EditorExperienceNode | undefined
  selectedIds: string[]
  selectedSection: EventPageSection | null
  selectExperienceNode: (node: EditorExperienceNode) => void
  selectSectionFromList: (section: EventPageSection) => void
  sendLayerBackward: (node: EditorExperienceNode) => void
  sendSelectedElementBackward: () => void
  setAddElementOpen: Dispatch<SetStateAction<boolean>>
  setEditorDetailsOpen: Dispatch<SetStateAction<boolean>>
  setHoveredExperienceNodeId: Dispatch<SetStateAction<string | null>>
  setRightRailTab: Dispatch<SetStateAction<RightRailTab>>
  setSectionsListOpen: Dispatch<SetStateAction<boolean>>
  setSectionTemplatesOpen: Dispatch<SetStateAction<boolean>>
  toggleLayerLock: (node: EditorExperienceNode) => void
  toggleLayerVisibility: (node: EditorExperienceNode) => void
  updateElement: (id: string, patch: Partial<EditorElement>) => void
  updateElementProps: (id: string, patch: Record<string, unknown>) => void
  updateEventTheme: (nextTheme: Partial<EventTheme>) => void
  updateRegistrationBlockCopyProp: (
    key: RegistrationCopyKey,
    value: string
  ) => void
  updateRegistrationField: (
    fieldId: string,
    nextFieldProps: Record<string, unknown>
  ) => void
  updateSectionConfig: (id: string, patch: Partial<SectionConfig>) => void
  updateSelectedBlockProps: (nextProps: SelectedBlockPropsPatch) => void
  uploadSelectedImage: (file: File) => Promise<void>
  uploadSelectedPdf: (file: File) => Promise<void>
  uploadSelectedPoster: (file: File) => Promise<void>
  uploadSelectedVideo: (file: File) => Promise<void>
}

const EXPERIENCE_EDITOR_RAIL_CLASS =
  "shrink-0 border-l border-white/[0.075] bg-[linear-gradient(180deg,rgba(6,10,18,0.965),rgba(2,4,9,0.992))] shadow-[inset_1px_0_0_rgba(255,255,255,0.026)] backdrop-blur-xl"

const EXPERIENCE_EDITOR_RAIL_HEADER_CLASS =
  "rounded-[18px] border border-white/[0.075] bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.12),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.040),rgba(255,255,255,0.014))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.032)]"

const EXPERIENCE_EDITOR_RAIL_CARD_CLASS =
  "rounded-[18px] border border-white/[0.075] bg-[linear-gradient(180deg,rgba(255,255,255,0.034),rgba(255,255,255,0.012))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.024)]"

const EXPERIENCE_EDITOR_SAVE_TEMPLATE_BUTTON_CLASS =
  "mt-6 w-full rounded-[16px] border border-indigo-200/16 bg-indigo-500/18 px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-indigo-50/86 shadow-[0_0_24px_rgba(99,102,241,0.10)] transition hover:bg-indigo-500/26"

const EXPERIENCE_EDITOR_SAVE_BUTTON_CLASS =
  "mt-4 w-full rounded-[16px] border border-emerald-200/16 bg-emerald-500/18 px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-emerald-50/86 shadow-[0_0_24px_rgba(16,185,129,0.10)] transition hover:bg-emerald-500/26"

const FONT_FAMILY_OPTIONS = [
  { label: "Inter", value: "Inter, sans-serif" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Helvetica", value: "Helvetica, Arial, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
  { label: "Verdana", value: "Verdana, sans-serif" },
  { label: "Trebuchet MS", value: "'Trebuchet MS', sans-serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
  { label: "Monospace", value: "monospace" },
]

function toTitleCase(value: string) {
  return value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function getSafeSectionRegistryItem(type: string) {
  try {
    const item = getSectionRegistryItem(type as SectionType)
    if (item) return item
  } catch {}

  return {
    type: "content" as SectionType,
    label: toTitleCase(type || "content"),
    description: "Legacy or unknown section type",
    defaultConfig: getDefaultSectionConfig("content"),
    fields: [],
  }
}

function getSafeSectionLabel(type: string) {
  return getSafeSectionRegistryItem(type).label
}

function getSystemComponentLabel(componentKey: SystemComponentKey) {
  return (
    SYSTEM_COMPONENTS.find((component) => component.key === componentKey)?.label ??
    toTitleCase(componentKey)
  )
}

function getLayerLabel(node: EditorExperienceNode) {
  return String(
    node.props?.adminLabel ??
      node.props?.elementType ??
      node.props?.sectionType ??
      node.nodeType
  )
}

function getLayerTypeAccentClass(node: EditorExperienceNode) {
  if (node.nodeType === "section") {
    return "border-violet-300/25 bg-violet-400/12 text-violet-50/70"
  }

  if (node.nodeType === "media") {
    return "border-cyan-300/25 bg-cyan-400/12 text-cyan-50/70"
  }

  if (node.nodeType === "graphic") {
    return "border-amber-300/25 bg-amber-400/12 text-amber-50/70"
  }

  return "border-white/10 bg-white/[0.04] text-white/52"
}

function getLayerDotClass(node: EditorExperienceNode) {
  if (node.nodeType === "section") return "bg-violet-300"
  if (node.nodeType === "media") return "bg-cyan-300"
  if (node.nodeType === "graphic") return "bg-amber-300"
  return "bg-white/40"
}

function getLayerThumbnailStyle(node: EditorExperienceNode) {
  const backgroundColor =
    typeof node.props?.backgroundColor === "string" && node.props.backgroundColor.trim().length > 0
      ? node.props.backgroundColor
      : node.nodeType === "section"
        ? "rgba(167,139,250,0.16)"
        : node.nodeType === "media"
          ? "rgba(34,211,238,0.14)"
          : node.nodeType === "graphic"
            ? "rgba(251,191,36,0.14)"
            : "rgba(255,255,255,0.06)"

  return { backgroundColor }
}

function renderLayerThumbnail(node: EditorExperienceNode) {
  const elementType = String(node.props?.elementType ?? "")
  const label = getLayerLabel(node)

  if (elementType === "image" && typeof node.props?.src === "string" && node.props.src.length > 0) {
    return (
      <img
        src={node.props.src}
        alt={label}
        className="h-full w-full object-cover"
        draggable={false}
      />
    )
  }

  if (elementType === "video") {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black text-[10px] font-black text-white/60">
        ▶
      </div>
    )
  }

  if (elementType === "pdf") {
    return (
      <div className="flex h-full w-full items-center justify-center bg-red-950/80 text-[9px] font-black uppercase tracking-[0.12em] text-red-50/70">
        PDF
      </div>
    )
  }

  if (elementType === "button") {
    return (
      <div className="mx-1 flex h-4 items-center justify-center rounded-full bg-white/18 text-[7px] font-black uppercase tracking-[0.12em] text-white/60">
        CTA
      </div>
    )
  }

  if (elementType === "spacer") {
    return <div className="mx-2 h-1 rounded-full bg-white/30" />
  }

  if (elementType === "text") {
    return (
      <div className="flex h-full w-full items-center justify-center text-[13px] font-black text-white/56">
        T
      </div>
    )
  }

  if (node.nodeType === "section") {
    return (
      <div className="flex h-full w-full items-center justify-center text-[10px] font-black uppercase tracking-[0.12em] text-violet-50/56">
        SEC
      </div>
    )
  }

  return (
    <div className="flex h-full w-full items-center justify-center text-[10px] font-black text-white/42">
      •
    </div>
  )
}

export default function ExperienceInspectorRail(props: ExperienceInspectorRailProps) {
  const {
    addElement,
    addElementOpen,
    addRegistrationFieldFromTemplate,
    addSectionTemplate,
    addSystemBlockToSelectedSection,
    bringLayerForward,
    bringSelectedElementForward,
    canBringForward,
    canDeleteElement,
    canDeleteSection,
    canDuplicateElement,
    canDuplicateSection,
    canMoveDown,
    canMoveUp,
    canSendBackward,
    canvasScale,
    deleteSelectedBlock,
    deleteSelectedElement,
    deleteSelectedSection,
    draggingLayerNodeId,
    draggingSectionId,
    dragOverLayerNodeId,
    dragOverSectionId,
    duplicateSelectedElement,
    duplicateSelectedSection,
    editorDetailsOpen,
    eventTheme,
    getSelectedRegistrationFields,
    handleLayerDragEnd,
    handleLayerDragOver,
    handleLayerDragStart,
    handleLayerDrop,
    handleSectionDragEnd,
    handleSectionDragOver,
    handleSectionDragStart,
    handleSectionDrop,
    hoveredExperienceNodeId,
    isEditing,
    isEmbedded,
    isMobilePreview,
    moveRegistrationFieldInSelectedBlock,
    moveSelectedBlock,
    moveSelectedSection,
    orderedExperienceNodes,
    removeRegistrationField,
    resetRegistrationFields,
    rightRailTab,
    saveCurrentTemplate,
    saveLayout,
    saveMessage,
    sections,
    sectionsListOpen,
    sectionTemplatesOpen,
    selectBlock,
    selectedBlock,
    selectedElement,
    selectedExperienceNode,
    selectedIds,
    selectedSection,
    selectExperienceNode,
    selectSectionFromList,
    sendLayerBackward,
    sendSelectedElementBackward,
    setAddElementOpen,
    setEditorDetailsOpen,
    setHoveredExperienceNodeId,
    setRightRailTab,
    setSectionsListOpen,
    setSectionTemplatesOpen,
    toggleLayerLock,
    toggleLayerVisibility,
    updateElement,
    updateElementProps,
    updateEventTheme,
    updateRegistrationBlockCopyProp,
    updateRegistrationField,
    updateSectionConfig,
    updateSelectedBlockProps,
    uploadSelectedImage,
    uploadSelectedPdf,
    uploadSelectedPoster,
    uploadSelectedVideo,
  } = props

  const registryItem = selectedSection
    ? getSafeSectionRegistryItem(selectedSection.type)
    : null
  const experienceNodeCount = orderedExperienceNodes.length
  const elementLayerCount = orderedExperienceNodes.filter(
    (node) => node.sourceType === "element"
  ).length

  return (
<aside
  className={`${EXPERIENCE_EDITOR_RAIL_CLASS} ${
    isEmbedded
      ? "w-[300px] opacity-100 overflow-visible"
      : `transition-[width,opacity] duration-300 ${
          isEditing ? "w-[340px] opacity-100" : "w-0 opacity-0"
        } ${!isEditing ? "pointer-events-none overflow-hidden" : "overflow-visible"}`
  }`}
>
  <div className={`h-full ${isEmbedded ? "w-[320px] p-4" : "w-[380px] p-6"}`}>
            <div className={EXPERIENCE_EDITOR_RAIL_HEADER_CLASS}>
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-100/48">Experience Composer</div>

<h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-white">
  {rightRailTab === "inspect"
    ? selectedElement
      ? "Element Settings"
      : selectedSection
        ? "Section Settings"
        : "Inspector"
    : rightRailTab === "layers"
      ? "Scene Layers"
      : rightRailTab === "insert"
        ? "Insert"
        : "Page Settings"}
</h3>

<div className="mt-2 text-sm leading-6 text-white/52">
  {rightRailTab === "inspect"
    ? selectedElement
      ? "Editing element"
      : selectedSection
        ? "Editing section"
        : "Select something to edit"
    : rightRailTab === "layers"
      ? "Composition stack, visibility, locks, and z-order."
      : rightRailTab === "insert"
        ? "Add sections, components, and canvas elements."
        : "Global theme and experience settings."}
</div>

<div className="mt-4 grid grid-cols-4 gap-1 rounded-2xl border border-white/[0.08] bg-black/24 p-1">
  {([
    ["inspect", "Inspect"],
    ["layers", "Layers"],
    ["insert", "Insert"],
    ["page", "Page"],
  ] as const).map(([tab, label]) => (
    <button
      key={tab}
      type="button"
      onClick={() => setRightRailTab(tab)}
      className={`rounded-xl px-2 py-2 text-[10px] font-black uppercase tracking-[0.14em] transition ${
        rightRailTab === tab
          ? "bg-white text-black"
          : "text-white/42 hover:bg-white/[0.06] hover:text-white/72"
      }`}
    >
      {label}
    </button>
  ))}
</div>

              <div className="mt-4 inline-flex rounded-full border border-white/[0.07] bg-black/22 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/42">
                Preview · {isMobilePreview ? "Mobile" : "Desktop"} · {Math.round(canvasScale * 100)}%
              </div>

<div className="mt-3 rounded-2xl border border-white/[0.07] bg-black/22 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/36">
  {experienceNodeCount} nodes · {sections.length} sections · {elementLayerCount} layers
</div>
              </div>

              <div className="mt-3 space-y-3">
                  <div className="rounded-2xl border border-violet-200/10 bg-violet-500/10 px-3 py-2 text-[11px] font-semibold text-violet-50/70">
                    {selectedExperienceNode
                      ? `Selected node · ${selectedExperienceNode.nodeType}`
                      : "No node selected"}
                  </div>

                  <div className="rounded-[24px] border border-white/[0.07] bg-black/22 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/34">
                          Scene Layers
                        </div>

                        <div className="mt-1 text-xs text-white/42">
                          Visual stack · drag element rows to reorder
                        </div>
                      </div>

                      <div className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/36">
                        {experienceNodeCount}
                      </div>
                    </div>

                    <div className="mt-3 max-h-[220px] space-y-2 overflow-auto pr-1">
                      {orderedExperienceNodes.map((node) => {
                       const isSelected = node.id === selectedExperienceNode?.id
                        const isHovered = node.id === hoveredExperienceNodeId
                        const isLayerDragging = draggingLayerNodeId === node.id
                        const isLayerDragOver = dragOverLayerNodeId === node.id
                        const canDragLayer = node.sourceType === "element" && !node.locked
                        return (
                          <button
                          onMouseEnter={() => setHoveredExperienceNodeId(node.id)}
                          onMouseLeave={() => setHoveredExperienceNodeId(null)}
                            key={node.id}
                            type="button"
                            draggable={canDragLayer}
onDragStart={(e) => {
  if (!canDragLayer) return
  e.dataTransfer.effectAllowed = "move"
  e.dataTransfer.setData("text/plain", node.id)
  handleLayerDragStart(node)
}}
onDragOver={(e) => handleLayerDragOver(e, node)}
onDrop={(e) => handleLayerDrop(e, node)}
onDragEnd={handleLayerDragEnd}
                            onClick={() => selectExperienceNode(node)}
                            className={`group flex w-full items-center justify-between rounded-2xl border px-3 py-3.5 text-left transition ${
                              isSelected
  ? "border-sky-400/50 bg-sky-400/12 shadow-[0_0_0_1px_rgba(56,189,248,0.25)]"
  : isHovered
    ? "border-violet-300/45 bg-violet-400/10 shadow-[0_0_0_1px_rgba(196,181,253,0.18)]"
    : "border-white/[0.06] bg-white/[0.03] hover:border-white/12 hover:bg-white/[0.05]"
                            }`}
                          >
                            <div className="flex min-w-0 flex-1 items-center gap-3">
  <div
    className={`relative flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/8 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] ${getLayerTypeAccentClass(node)}`}
    style={getLayerThumbnailStyle(node)}
  >
    {renderLayerThumbnail(node)}

    {node.visible === false && (
      <div className="absolute inset-0 flex items-center justify-center bg-black/62 text-[10px] font-black text-white/60">
        ×
      </div>
    )}

    {node.locked && (
      <div className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full border border-amber-200/25 bg-amber-500/20 text-[8px] font-black text-amber-50/70">
        L
      </div>
    )}
  </div>

  <div className="min-w-0 flex-1">
    <div className="flex items-center gap-2">
      {node.sourceType === "element" && (
        <span
          className={`text-sm font-black leading-none transition ${
            node.locked
              ? "text-amber-200/28"
              : "text-white/14 group-hover:text-white/28"
          }`}
          title={node.locked ? "Locked layers cannot be dragged" : "Drag to reorder"}
        >
          {node.locked ? "◆" : "⋮⋮"}
        </span>
      )}

      <div className={`h-2 w-2 shrink-0 rounded-full ${getLayerDotClass(node)}`} />

      <div className="truncate text-sm font-semibold text-white/84">
        {getLayerLabel(node)}
      </div>
    </div>

    <div className="mt-1 flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/24">
                                <span>{node.nodeType}</span>
                                <span className="h-1 w-1 rounded-full bg-white/20" />
                                <span>Z-{node.zIndex ?? 0}</span>

                                {node.sourceType === "element" && (
                                  <>
                                    <span className="h-1 w-1 rounded-full bg-white/20" />

                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        bringLayerForward(node)
                                      }}
                                      className="pointer-events-auto rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[9px] text-white/55 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                                    >
                                      +
                                    </button>

                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        sendLayerBackward(node)
                                      }}
                                      className="pointer-events-auto rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[9px] text-white/55 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                                    >
                                      −
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                            </div>

                                                        <div className="ml-3 flex items-center gap-2">
                              <button
                                type="button"
                                title={node.visible === false ? "Hidden" : "Visible"}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleLayerVisibility(node)
                                }}
                                className={`flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-black transition ${
                                  node.visible === false
                                    ? "border-red-300/20 bg-red-500/10 text-red-100/45 hover:bg-red-500/20"
                                    : "border-emerald-300/20 bg-emerald-500/10 text-emerald-100/55 hover:bg-emerald-500/20"
                                }`}
                              >
                                {node.visible === false ? "×" : "●"}
                              </button>

                              <button
                                type="button"
                                title={node.locked ? "Locked" : "Unlocked"}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleLayerLock(node)
                                }}
                                className={`flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-black transition ${
                                  node.locked
                                    ? "border-amber-300/20 bg-amber-500/10 text-amber-100/55 hover:bg-amber-500/20"
                                    : "border-white/10 bg-black/20 text-white/30 hover:bg-white/[0.06] hover:text-white/50"
                                }`}
                              >
                                {node.locked ? "L" : "U"}
                              </button>
                                  </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
            </div>

            <button
              onClick={() => void saveCurrentTemplate()}
              className={EXPERIENCE_EDITOR_SAVE_TEMPLATE_BUTTON_CLASS}
            >
              Save Template
            </button>

            <button
              onClick={() => void saveLayout(false)}
              className={EXPERIENCE_EDITOR_SAVE_BUTTON_CLASS}
            >
              Save
            </button>

            {saveMessage && <div className={`mt-4 ${EXPERIENCE_EDITOR_RAIL_CARD_CLASS}`}>{saveMessage}</div>}

            <div className={`mt-4 ${EXPERIENCE_EDITOR_RAIL_CARD_CLASS}`}>
              <SectionPanelHeader
                title={
                  selectedElement
                    ? "Selected Element"
                    : selectedSection
                    ? selectedSection.config.adminLabel || getSafeSectionLabel(selectedSection.type)
                    : "Editor"
                }
                open={editorDetailsOpen}
                onToggle={() => setEditorDetailsOpen((v: boolean) => !v)}
              />

              {editorDetailsOpen && (
                <div className="mt-4">
                  {!selectedElement && !selectedSection && (
  <div className="space-y-4">
    <div className="rounded-[20px] border border-white/[0.075] bg-black/22 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">
      <div className="text-xs uppercase tracking-[0.18em] text-white/40">
        Event Theme
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <div className="mb-2 text-xs text-white/50">Page Background</div>
          <input
            type="color"
            value={eventTheme.pageBackgroundColor}
            onChange={(e) =>
              updateEventTheme({
                pageBackgroundColor: e.target.value,
              })
            }
            className="h-12 w-full rounded-xl border border-white/10 bg-slate-950 p-2"
          />
        </div>

        <div>
          <div className="mb-2 text-xs text-white/50">Panel Background</div>
          <input
            type="color"
            value={eventTheme.panelBackgroundColor}
            onChange={(e) =>
              updateEventTheme({
                panelBackgroundColor: e.target.value,
              })
            }
            className="h-12 w-full rounded-xl border border-white/10 bg-slate-950 p-2"
          />
        </div>

        <div>
          <div className="mb-2 text-xs text-white/50">Text Color</div>
          <input
            type="color"
            value={eventTheme.textColor}
            onChange={(e) =>
              updateEventTheme({
                textColor: e.target.value,
              })
            }
            className="h-12 w-full rounded-xl border border-white/10 bg-slate-950 p-2"
          />
        </div>

        <div>
          <div className="mb-2 text-xs text-white/50">Gradient A</div>
          <input
            type="color"
            value={eventTheme.gradientColorA}
            onChange={(e) =>
              updateEventTheme({
                gradientColorA: e.target.value,
              })
            }
            className="h-12 w-full rounded-xl border border-white/10 bg-slate-950 p-2"
          />
        </div>

        <div>
          <div className="mb-2 text-xs text-white/50">Gradient B</div>
          <input
            type="color"
            value={eventTheme.gradientColorB}
            onChange={(e) =>
              updateEventTheme({
                gradientColorB: e.target.value,
              })
            }
            className="h-12 w-full rounded-xl border border-white/10 bg-slate-950 p-2"
          />
        </div>
      </div>
    </div>
  </div>
)}
                  <div className="text-xs text-white/45">
                    {selectedElement
                      ? `${selectedElement.element_type ?? "text"} element`
                      : selectedSection
                      ? `${getSafeSectionLabel(selectedSection.type)} section`
                      : "Select a section or canvas element"}
                  </div>
{selectedElement ? (
  <div className="rounded-[20px] border border-white/[0.075] bg-black/22 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">
    <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">
      Element Telemetry
    </div>

    <div className="mt-4 grid grid-cols-2 gap-3">
      <div className="rounded-[16px] border border-white/[0.07] bg-white/[0.026] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.020)]">
        <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
          Position
        </div>

        <div className="mt-2 text-sm font-semibold text-white">
          {selectedElement.x}px / {selectedElement.y}px
        </div>
      </div>

      <div className="rounded-[16px] border border-white/[0.07] bg-white/[0.026] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.020)]">
        <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
          Dimensions
        </div>

        <div className="mt-2 text-sm font-semibold text-white">
          {(selectedElement.width ?? 0)} × {(selectedElement.height ?? 0)}
        </div>
      </div>

      <div className="rounded-[16px] border border-white/[0.07] bg-white/[0.026] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.020)]">
        <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
          Layer
        </div>

        <div className="mt-2 text-sm font-semibold text-white">
          Z-{selectedElement.z_index ?? 1}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
          Type
        </div>

        <div className="mt-2 text-sm font-semibold capitalize text-white">
          {selectedElement.element_type ?? "text"}
        </div>
      </div>
    </div>
  </div>
) : null}
                  {selectedElement ? (
                    <div className="mt-4 space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={duplicateSelectedElement}
                          disabled={!canDuplicateElement || selectedIds.length > 1}
                          className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                            canDuplicateElement && selectedIds.length <= 1
                              ? "bg-blue-600 text-white hover:bg-blue-500"
                              : "cursor-not-allowed bg-white/10 text-white/35"
                          }`}
                        >
                          Duplicate
                        </button>

                        <button
                          onClick={deleteSelectedElement}
                          disabled={!canDeleteElement}
                          className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                            canDeleteElement
                              ? "bg-red-600 text-white hover:bg-red-500"
                              : "cursor-not-allowed bg-white/10 text-white/35"
                          }`}
                        >
                          {selectedIds.length > 1 ? `Delete (${selectedIds.length})` : "Delete"}
                        </button>
                      </div>

                      {selectedIds.length > 1 && (
                        <div className="text-xs text-white/45">
                          Multiple elements selected. Delete will remove all selected items.
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={sendSelectedElementBackward}
                          disabled={!canSendBackward}
                          className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                            canSendBackward
                              ? "bg-white text-slate-950 hover:bg-white/90"
                              : "cursor-not-allowed bg-white/10 text-white/35"
                          }`}
                        >
                          Send Back
                        </button>

                        <button
                          onClick={bringSelectedElementForward}
                          disabled={!canBringForward}
                          className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                            canBringForward
                              ? "bg-white text-slate-950 hover:bg-white/90"
                              : "cursor-not-allowed bg-white/10 text-white/35"
                          }`}
                        >
                          Bring Front
                        </button>
                      </div>

                      <label className="flex items-center gap-2 text-sm text-white/80">
                        <input
                          type="checkbox"
                          checked={Boolean(selectedElement.props?.hideOnMobile)}
                          onChange={(e) =>
                            updateElementProps(selectedElement.id, {
                              hideOnMobile: e.target.checked,
                            })
                          }
                        />
                        Hide on Mobile
                      </label>

                      <div>
                        <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                          Element Type
                        </div>
                        <input
                          value={selectedElement.element_type ?? "text"}
                          readOnly
                          className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-sm text-white/70"
                        />
                      </div>

                      {selectedElement.element_type !== "spacer" && (
                        <div>
                          <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                            Content
                          </div>

                          {selectedElement.element_type === "text" ||
                          selectedElement.element_type === "pdf" ||
                          selectedElement.element_type === "button" ? (
                            <textarea
                              value={selectedElement.content}
                              onChange={(e) =>
                                updateElement(selectedElement.id, {
                                  content: e.target.value,
                                })
                              }
                              className="min-h-[100px] w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"
                            />
                          ) : (
                            <input
                              value={selectedElement.content}
                              onChange={(e) =>
                                updateElement(selectedElement.id, {
                                  content: e.target.value,
                                })
                              }
                              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"
                            />
                          )}
                        </div>
                      )}

                      {selectedElement.element_type === "image" && (
                        <div className="mt-4 space-y-4">
                          <div>
                            <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                              Image Fit
                            </div>

                            <select
                              value={String(selectedElement.props?.imageFit ?? "cover")}
                              onChange={(e) =>
                                updateElementProps(selectedElement.id, {
                                  imageFit: e.target.value,
                                })
                              }
                              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"
                            >
                              <option value="cover">Cover (crop to fill)</option>
                              <option value="contain">Contain (show full image)</option>
                            </select>
                          </div>

                          <div>
                            <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                              Image Position
                            </div>

                            <select
                              value={String(selectedElement.props?.imagePosition ?? "center")}
                              onChange={(e) =>
                                updateElementProps(selectedElement.id, {
                                  imagePosition: e.target.value,
                                })
                              }
                              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"
                            >
                              <option value="center">Center</option>
                              <option value="top">Top</option>
                              <option value="bottom">Bottom</option>
                              <option value="left">Left</option>
                              <option value="right">Right</option>
                            </select>
                          </div>

                          <div>
                            <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                              Upload Image
                            </div>

                            <input
                              type="file"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0]
                                if (!file) return
                                await uploadSelectedImage(file)
                              }}
                              className="w-full text-sm text-white"
                            />

                            <div className="mt-2 break-all text-xs text-white/50">
                              {String(selectedElement.props?.src ?? "")}
                            </div>
                          </div>
                        </div>
                      )}

                      {selectedElement.element_type === "pdf" && (
                        <div className="mt-4">
                          <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                            Upload PDF
                          </div>

                          <input
                            type="file"
                            accept="application/pdf"
                            onChange={async (e) => {
                              const file = e.target.files?.[0]
                              if (!file) return
                              await uploadSelectedPdf(file)
                            }}
                            className="w-full text-sm text-white"
                          />

                          <div className="mt-2 break-all text-xs text-white/50">
                            {String(selectedElement.props?.url ?? "")}
                          </div>
                        </div>
                      )}

                      {selectedElement.element_type === "video" && (
                        <div className="mt-4 space-y-4">
                          <div>
                            <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                              Video Source
                            </div>

                            <select
                              value={
                                Boolean(selectedElement.props?.useGeneralSession)
                                  ? "general"
                                  : "custom"
                              }
                              onChange={(e) =>
                                updateElementProps(selectedElement.id, {
                                  useGeneralSession: e.target.value === "general",
                                })
                              }
                              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"
                            >
                              <option value="custom">Custom URL</option>
                              <option value="general">General Session</option>
                            </select>
                          </div>

                          <div>
                            <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                              Video Type
                            </div>

                            <select
                              value={String(selectedElement.props?.sourceType ?? "mp4")}
                              onChange={(e) =>
                                updateElementProps(selectedElement.id, {
                                  sourceType: e.target.value,
                                })
                              }
                              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"
                            >
                              <option value="mp4">MP4</option>
                              <option value="hls">HLS (.m3u8)</option>
                            </select>
                          </div>

                          <div>
                            <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                              Video URL
                            </div>
                            <input
                              value={String(selectedElement.props?.url ?? "")}
                              onChange={(e) =>
                                updateElementProps(selectedElement.id, {
                                  url: e.target.value,
                                })
                              }
                              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"
                            />
                          </div>

                          <div>
                            <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                              Upload Video
                            </div>

                            <input
                              type="file"
                              accept="video/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0]
                                if (!file) return
                                await uploadSelectedVideo(file)
                              }}
                              className="w-full text-sm text-white"
                            />
                          </div>

                          {Boolean(selectedElement.props?.useGeneralSession) && (
                            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
                              This block will use your platform’s General Session video source.
                            </div>
                          )}

                          <label className="flex items-center gap-2 text-sm text-white/80">
                            <input
                              type="checkbox"
                              checked={Boolean(selectedElement.props?.controls ?? true)}
                              onChange={(e) =>
                                updateElementProps(selectedElement.id, {
                                  controls: e.target.checked,
                                })
                              }
                            />
                            Show controls
                          </label>

                          <label className="flex items-center gap-2 text-sm text-white/80">
                            <input
                              type="checkbox"
                              checked={Boolean(selectedElement.props?.autoplay ?? false)}
                              onChange={(e) =>
                                updateElementProps(selectedElement.id, {
                                  autoplay: e.target.checked,
                                })
                              }
                            />
                            Autoplay
                          </label>

                          <label className="flex items-center gap-2 text-sm text-white/80">
                            <input
                              type="checkbox"
                              checked={Boolean(selectedElement.props?.loop ?? false)}
                              onChange={(e) =>
                                updateElementProps(selectedElement.id, {
                                  loop: e.target.checked,
                                })
                              }
                            />
                            Loop video
                          </label>

                          <label className="flex items-center gap-2 text-sm text-white/80">
                            <input
                              type="checkbox"
                              checked={Boolean(selectedElement.props?.isLive ?? false)}
                              onChange={(e) =>
                                updateElementProps(selectedElement.id, {
                                  isLive: e.target.checked,
                                })
                              }
                            />
                            Mark as LIVE
                          </label>

                          <label className="flex items-center gap-2 text-sm text-white/80">
                            <input
                              type="checkbox"
                              checked={Boolean(selectedElement.props?.showPosterOnCard ?? true)}
                              onChange={(e) =>
                                updateElementProps(selectedElement.id, {
                                  showPosterOnCard: e.target.checked,
                                })
                              }
                            />
                            Show poster on card
                          </label>

                          <label className="flex items-center gap-2 text-sm text-white/80">
                            <input
                              type="checkbox"
                              checked={Boolean(selectedElement.props?.playOnHover ?? true)}
                              onChange={(e) =>
                                updateElementProps(selectedElement.id, {
                                  playOnHover: e.target.checked,
                                })
                              }
                            />
                            Play preview on hover (live mode)
                          </label>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                                Trim Start (sec)
                              </div>
                              <input
                                type="number"
                                min="0"
                                step="0.1"
                                value={Number(selectedElement.props?.trimStart ?? 0)}
                                onChange={(e) =>
                                  updateElementProps(selectedElement.id, {
                                    trimStart: Number(e.target.value || 0),
                                  })
                                }
                                className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"
                              />
                            </div>

                            <div>
                              <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                                Trim End (sec)
                              </div>
                              <input
                                type="number"
                                min="0"
                                step="0.1"
                                value={Number(selectedElement.props?.trimEnd ?? 0)}
                                onChange={(e) =>
                                  updateElementProps(selectedElement.id, {
                                    trimEnd: Number(e.target.value || 0),
                                  })
                                }
                                className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"
                              />
                            </div>
                          </div>

                          <div>
                            <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                              Poster Image
                            </div>

                            <input
                              type="file"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0]
                                if (!file) return
                                await uploadSelectedPoster(file)
                              }}
                              className="w-full text-sm text-white"
                            />

                            <div className="mt-2 break-all text-xs text-white/50">
                              {String(selectedElement.props?.posterUrl ?? "")}
                            </div>
                          </div>

                          <div className="mt-2 break-all text-xs text-white/50">
                            {String(selectedElement.props?.url ?? "")}
                          </div>
                        </div>
                      )}

                      {selectedElement.element_type === "text" && (
                        <>
                          <div>
                            <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                              Font Family
                            </div>
                            <select
                              value={String(selectedElement.props?.fontFamily ?? "Georgia, serif")}
                              onChange={(e) =>
                                updateElementProps(selectedElement.id, {
                                  fontFamily: e.target.value,
                                })
                              }
                              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"
                            >
                              {FONT_FAMILY_OPTIONS.map((font) => (
                                <option key={font.value} value={font.value}>
                                  {font.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                                Font Size
                              </div>
                              <input
                                type="number"
                                value={Number(selectedElement.props?.fontSize ?? 22)}
                                onChange={(e) =>
                                  updateElementProps(selectedElement.id, {
                                    fontSize: Number(e.target.value || 22),
                                  })
                                }
                                className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"
                              />
                            </div>

                            <div>
                              <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                                Font Weight
                              </div>
                              <input
                                type="number"
                                value={Number(selectedElement.props?.fontWeight ?? 700)}
                                onChange={(e) =>
                                  updateElementProps(selectedElement.id, {
                                    fontWeight: Number(e.target.value || 700),
                                  })
                                }
                                className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                                Text Color
                              </div>
                              <input
                                type="color"
                                value={String(selectedElement.props?.textColor ?? "#ffffff")}
                                onChange={(e) =>
                                  updateElementProps(selectedElement.id, {
                                    textColor: e.target.value,
                                  })
                                }
                                className="h-12 w-full rounded-xl border border-white/10 bg-slate-950 p-2"
                              />
                            </div>

                            <div>
                              <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                                Background Color
                              </div>
                              <input
                                type="color"
                                value={String(selectedElement.props?.backgroundColor ?? "#2563eb")}
                                onChange={(e) =>
                                  updateElementProps(selectedElement.id, {
                                    backgroundColor: e.target.value,
                                  })
                                }
                                className="h-12 w-full rounded-xl border border-white/10 bg-slate-950 p-2"
                              />
                            </div>
                          </div>

                          <div>
                            <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                              Background Opacity
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.05"
                              value={Number(selectedElement.props?.backgroundOpacity ?? 0.9)}
                              onChange={(e) =>
                                updateElementProps(selectedElement.id, {
                                  backgroundOpacity: Number(e.target.value),
                                })
                              }
                              className="w-full"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  ) : selectedSection ? (
                
                    <div className="mt-4 space-y-4">
                      {selectedSection.type !== "hero" && (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              onClick={() => moveSelectedSection("up")}
                              disabled={!canMoveUp}
                              className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                                canMoveUp
                                  ? "bg-white text-slate-950 hover:bg-white/90"
                                  : "cursor-not-allowed bg-white/10 text-white/35"
                              }`}
                            >
                              Move Up
                            </button>

                            <button
                              onClick={() => moveSelectedSection("down")}
                              disabled={!canMoveDown}
                              className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                                canMoveDown
                                  ? "bg-white text-slate-950 hover:bg-white/90"
                                  : "cursor-not-allowed bg-white/10 text-white/35"
                              }`}
                            >
                              Move Down
                            </button>
                          </div>

                          <button
                            onClick={duplicateSelectedSection}
                            disabled={!canDuplicateSection}
                            className={`w-full rounded-xl px-4 py-2 text-sm font-semibold ${
                              canDuplicateSection
                                ? "bg-blue-600 text-white hover:bg-blue-500"
                                : "cursor-not-allowed bg-white/10 text-white/35"
                            }`}
                          >
                            Duplicate Section
                          </button>

                          <button
                            onClick={deleteSelectedSection}
                            disabled={!canDeleteSection}
                            className={`w-full rounded-xl px-4 py-2 text-sm font-semibold ${
                              canDeleteSection
                                ? "bg-red-600 text-white hover:bg-red-500"
                                : "cursor-not-allowed bg-white/10 text-white/35"
                            }`}
                          >
                            Delete Section
                          </button>
                        </>
                      )}

{selectedSection.config.themeMode === "custom" &&
  (selectedSection.config.sectionBackgroundColor ||
    selectedSection.config.sectionBorderColor ||
    selectedSection.config.sectionTextColor ||
    selectedSection.config.sectionGradientColorA ||
    selectedSection.config.sectionGradientColorB) && (
    <button
      type="button"
      onClick={() =>
        updateSectionConfig(selectedSection.id, {
          sectionBackgroundColor: "",
          sectionBorderColor: "",
          sectionTextColor: "",
          sectionGradientColorA: "",
          sectionGradientColorB: "",
          sectionGradientAngle: "",
        })
      }
      className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-white hover:bg-white/5"
    >
      Reset Section Colors
    </button>
  )}

                      {registryItem?.fields.map((field: any) => {
                        const value = (selectedSection.config as any)?.[field.key]
                        const fillType =
                          (selectedSection.config.sectionBackgroundFillType as string) || "solid"
                            const themeMode = (selectedSection.config.themeMode as string) || "inherit"
                                                    if (
                          themeMode !== "custom" &&
                          (
                            field.key === "sectionBackgroundColor" ||
                            field.key === "sectionBorderColor" ||
                            field.key === "sectionTextColor" ||
                            field.key === "sectionGradientColorA" ||
                            field.key === "sectionGradientColorB" ||
                            field.key === "sectionGradientAngle"
                          )
                        ) {
                          return null
                        }

                        if (field.key === "sectionBackgroundFillType") {
                          return (
                            <div key={field.key}>
                              <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                                {field.label}
                              </div>
                              <select
                                value={String(value ?? "solid")}
                                onChange={(e) =>
                                  updateSectionConfig(selectedSection.id, {
                                    [field.key]: e.target.value,
                                  })
                                }
                                className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"
                              >
                                {field.options?.map((opt: any) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )
                        }

                        if (field.key === "sectionBackgroundColor") {
                          if (fillType !== "solid") return null

                          const colorValue =
                            typeof value === "string" && value.trim().startsWith("#")
                              ? value
                              : "#0f172a"

                          return (
                            <div key={field.key}>
                              <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                                {field.label}
                              </div>

                              <div className="flex items-center gap-3">
                                <input
                                  type="color"
                                  value={colorValue}
                                  onChange={(e) =>
                                    updateSectionConfig(selectedSection.id, {
                                      [field.key]: e.target.value,
                                    })
                                  }
                                  className="h-12 w-16 rounded-xl border border-white/10 bg-slate-950 p-2"
                                />

                                <input
                                  value={String(value ?? "")}
                                  onChange={(e) =>
                                    updateSectionConfig(selectedSection.id, {
                                      [field.key]: e.target.value,
                                    })
                                  }
                                  placeholder={field.placeholder}
                                  className="flex-1 rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"
                                />
                              </div>
                            </div>
                          )
                        }

                        if (field.key === "sectionBorderColor" || field.key === "sectionTextColor") {
                          const colorValue =
                            typeof value === "string" && value.trim().startsWith("#")
                              ? value
                              : "#ffffff"

                          return (
                            <div key={field.key}>
                              <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                                {field.label}
                              </div>

                              <div className="flex items-center gap-3">
                                <input
                                  type="color"
                                  value={colorValue}
                                  onChange={(e) =>
                                    updateSectionConfig(selectedSection.id, {
                                      [field.key]: e.target.value,
                                    })
                                  }
                                  className="h-12 w-16 rounded-xl border border-white/10 bg-slate-950 p-2"
                                />

                                <input
                                  value={String(value ?? "")}
                                  onChange={(e) =>
                                    updateSectionConfig(selectedSection.id, {
                                      [field.key]: e.target.value,
                                    })
                                  }
                                  placeholder={field.placeholder}
                                  className="flex-1 rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"
                                />
                              </div>
                            </div>
                          )
                        }

                        if (
                          field.key === "sectionGradientColorA" ||
                          field.key === "sectionGradientColorB"
                        ) {
                          if (fillType === "solid") return null

                          const fallbackColor =
                            field.key === "sectionGradientColorA" ? "#0f172a" : "#1d4ed8"

                          const colorValue =
                            typeof value === "string" && value.trim().startsWith("#")
                              ? value
                              : fallbackColor

                          return (
                            <div key={field.key}>
                              <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                                {field.label}
                              </div>

                              <div className="flex items-center gap-3">
                                <input
                                  type="color"
                                  value={colorValue}
                                  onChange={(e) =>
                                    updateSectionConfig(selectedSection.id, {
                                      [field.key]: e.target.value,
                                    })
                                  }
                                  className="h-12 w-16 rounded-xl border border-white/10 bg-slate-950 p-2"
                                />

                                <input
                                  value={String(value ?? "")}
                                  onChange={(e) =>
                                    updateSectionConfig(selectedSection.id, {
                                      [field.key]: e.target.value,
                                    })
                                  }
                                  placeholder={field.placeholder}
                                  className="flex-1 rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"
                                />
                              </div>
                            </div>
                          )
                        }

                        if (field.key === "sectionGradientAngle") {
                          if (fillType !== "linear-gradient") return null

                          return (
                            <div key={field.key}>
                              <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                                {field.label}
                              </div>
                              <input
                                value={String(value ?? "")}
                                onChange={(e) =>
                                  updateSectionConfig(selectedSection.id, {
                                    [field.key]: e.target.value,
                                  })
                                }
                                placeholder={field.placeholder}
                                className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"
                              />
                            </div>
                          )
                        }

                        if (field.type === "checkbox") {
                          return (
                            <label
                              key={field.key}
                              className="flex items-center gap-2 text-sm text-white/80"
                            >
                              <input
                                type="checkbox"
                                checked={Boolean(value)}
                                onChange={(e) =>
                                  updateSectionConfig(selectedSection.id, {
                                    [field.key]: e.target.checked,
                                  })
                                }
                              />
                              {field.label}
                            </label>
                          )
                        }

                        if (field.type === "textarea") {
                          return (
                            <div key={field.key}>
                              <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                                {field.label}
                              </div>
                              <textarea
                                value={String(value ?? "")}
                                onChange={(e) =>
                                  updateSectionConfig(selectedSection.id, {
                                    [field.key]: e.target.value,
                                  })
                                }
                                placeholder={field.placeholder}
                                className="min-h-[120px] w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"
                              />
                            </div>
                          )
                        }

                        if (field.type === "select") {
                          return (
                            <div key={field.key}>
                              <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                                {field.label}
                              </div>
                              <select
                                value={String(value ?? "")}
                                onChange={(e) =>
                                  updateSectionConfig(selectedSection.id, {
                                    [field.key]: e.target.value,
                                  })
                                }
                                className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"
                              >
                                {field.options?.map((opt: any) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )
                        }

                        return (
                          <div key={field.key}>
                            <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                              {field.label}
                            </div>
                            <input
                              value={String(value ?? "")}
                              onChange={(e) =>
                                updateSectionConfig(selectedSection.id, {
                                  [field.key]: e.target.value,
                                })
                              }
                              placeholder={field.placeholder}
                              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"
                            />
                          </div>
                        )
                      })}

                      <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs uppercase tracking-[0.18em] text-white/40">
                          Blocks In This Section
                        </div>

                        <div className="mt-3 space-y-2">
                          {(selectedSection.blocks ?? []).length > 0 ? (
                            (selectedSection.blocks ?? []).map((block: SectionBlock, index: number) => {
                              const isActive = selectedBlock?.id === block.id
                              const label =
                                block.type === "system_component"
                                  ? getSystemComponentLabel(block.props.componentKey)
                                  : block.props.title || `Rich Text ${index + 1}`

                              return (
                                <button
                                  key={block.id}
                                  type="button"
                                  onClick={() => selectBlock(selectedSection.id, block.id)}
                                  className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                                    isActive
                                      ? "border-sky-400 bg-sky-400/10 text-white"
                                      : "border-white/10 bg-slate-950 text-white/80 hover:bg-white/5"
                                  }`}
                                >
                                  <div className="text-sm font-semibold">{label}</div>
                                  <div className="mt-1 text-xs text-white/45">
                                    {block.type === "system_component" ? "System component" : "Rich text"}
                                  </div>
                                </button>
                              )
                            })
                          ) : (
                            <div className="rounded-xl border border-dashed border-white/10 px-3 py-3 text-sm text-white/45">
                              This section has no blocks yet.
                            </div>
                          )}
                        </div>
                      </div>

                      {selectedSection.type !== "hero" && (
                        <div className="mt-6 rounded-2xl border border-sky-400/20 bg-sky-400/5 p-4">
                          <div className="text-xs uppercase tracking-[0.18em] text-sky-200/70">
                            Add System Component
                          </div>

                          <div className="mt-3 grid grid-cols-1 gap-2">
                            {SYSTEM_COMPONENTS.map((comp) => (
                              <button
                                key={comp.key}
                                type="button"
                                onClick={() => addSystemBlockToSelectedSection(comp.key)}
                                className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-left text-sm text-white hover:bg-white/5"
                              >
                                {comp.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedBlock ? (
                        <div className="mt-6 space-y-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4">
                          <div>
                            <div className="text-xs uppercase tracking-[0.18em] text-emerald-200/70">
                              Selected Block
                            </div>
                            <div className="mt-1 text-sm text-white/70">
                              {selectedBlock.type === "system_component"
                                ? getSystemComponentLabel(selectedBlock.props.componentKey)
                                : "Rich text block"}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => moveSelectedBlock("up")}
                              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-white/90"
                            >
                              Move Up
                            </button>

                            <button
                              type="button"
                              onClick={() => moveSelectedBlock("down")}
                              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-white/90"
                            >
                              Move Down
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={deleteSelectedBlock}
                            className="w-full rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
                          >
                            Delete Block
                          </button>

                          {selectedBlock.type === "system_component" && (
                            <>
                              <div>
                                <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                                  Component
                                </div>
                                <select
                                  value={selectedBlock.props.componentKey}
                                  onChange={(e) =>
                                    updateSelectedBlockProps({
                                      componentKey: e.target.value as SystemComponentKey,
                                    })
                                  }
                                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"
                                >
                                  {SYSTEM_COMPONENTS.map((comp) => (
                                    <option key={comp.key} value={comp.key}>
                                      {comp.label}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                                  Title
                                </div>
                                <input
                                  value={String(selectedBlock.props.title ?? "")}
                                  onChange={(e) =>
                                    updateSelectedBlockProps({
                                      title: e.target.value,
                                    })
                                  }
                                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"
                                />
                              </div>

                              <div>
                                <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                                  Body
                                </div>
                                <textarea
                                  value={String(selectedBlock.props.body ?? "")}
                                  onChange={(e) =>
                                    updateSelectedBlockProps({
                                      body: e.target.value,
                                    })
                                  }
                                  className="min-h-[120px] w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"
                                />
                              </div>

                              <div>
                                <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                                  Container Style
                                </div>
                                <select
                                  value={String(selectedBlock.props.containerStyle ?? "panel")}
                                  onChange={(e) =>
                                    updateSelectedBlockProps({
                                      containerStyle: e.target.value as "none" | "subtle" | "panel",
                                    })
                                  }
                                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"
                                >
                                  <option value="none">None</option>
                                  <option value="subtle">Subtle</option>
                                  <option value="panel">Panel</option>
                                </select>
                              </div>
                              {selectedBlock.props.componentKey === "registration_form" ? (
  <RegistrationInspectorPanel
    componentKey={selectedBlock.props.componentKey}
    title={
      typeof selectedBlock.props.title === "string"
        ? selectedBlock.props.title
        : undefined
    }
    body={
      typeof selectedBlock.props.body === "string"
        ? selectedBlock.props.body
        : undefined
    }
    previewState={
      (((selectedBlock.props as any).previewRegistrationState ??
        "open") as RegistrationPreviewState)
    }
    variant={
      (((selectedBlock.props as any).variant ??
        "editorial") as RegistrationVariant)
    }
    copyValues={{
      title:
        typeof selectedBlock.props.title === "string"
          ? selectedBlock.props.title
          : "",
      body:
        typeof selectedBlock.props.body === "string"
          ? selectedBlock.props.body
          : "",
      ctaLabel:
        typeof (selectedBlock.props as any).ctaLabel === "string"
          ? (selectedBlock.props as any).ctaLabel
          : "",
      confirmationTitle:
        typeof (selectedBlock.props as any).confirmationTitle === "string"
          ? (selectedBlock.props as any).confirmationTitle
          : "",
      confirmationBody:
        typeof (selectedBlock.props as any).confirmationBody === "string"
          ? (selectedBlock.props as any).confirmationBody
          : "",
    }}
    fields={getSelectedRegistrationFields() as RegistrationInspectorField[]}
    onChangePreviewState={(value) =>
      updateSelectedBlockProps({
        previewRegistrationState: value,
      } as any)
    }
    onChangeVariant={(value) =>
      updateSelectedBlockProps({
        variant: value,
      })
    }
    onChangeCopy={updateRegistrationBlockCopyProp}
  onResetFields={resetRegistrationFields}
    onMoveField={moveRegistrationFieldInSelectedBlock}
    onUpdateField={(fieldId, patch) =>
      updateRegistrationField(fieldId, patch)
    }
    onAddFieldTemplate={addRegistrationFieldFromTemplate}
    onRemoveField={removeRegistrationField}
  />
) : null}
{selectedBlock.props.componentKey === "agenda" ? (
  <AgendaInspectorPanel
    componentKey={selectedBlock.props.componentKey}
    title={
      typeof selectedBlock.props.title === "string"
        ? selectedBlock.props.title
        : undefined
    }
    body={
      typeof selectedBlock.props.body === "string"
        ? selectedBlock.props.body
        : undefined
    }
    displayMode={
      (((selectedBlock.props as any).displayMode ??
        "list") as AgendaDisplayMode)
    }
    showTime={
      typeof (selectedBlock.props as any).showTime === "boolean"
        ? (selectedBlock.props as any).showTime
        : true
    }
    showDescriptions={
      typeof (selectedBlock.props as any).showDescriptions === "boolean"
        ? (selectedBlock.props as any).showDescriptions
        : true
    }
    groupByDay={
      typeof (selectedBlock.props as any).groupByDay === "boolean"
        ? (selectedBlock.props as any).groupByDay
        : true
    }
    emptyStateText={
      typeof (selectedBlock.props as any).emptyStateText === "string"
        ? (selectedBlock.props as any).emptyStateText
        : "No agenda items are available yet."
    }
    onChange={(patch) =>
      updateSelectedBlockProps(patch as any)
    }
  />
) : null}
{selectedBlock.props.componentKey === "sessions_list" ? (
  <SessionsInspectorPanel
    componentKey={selectedBlock.props.componentKey}
    title={
      typeof selectedBlock.props.title === "string"
        ? selectedBlock.props.title
        : undefined
    }
    body={
      typeof selectedBlock.props.body === "string"
        ? selectedBlock.props.body
        : undefined
    }
    displayMode={
      (((selectedBlock.props as any).displayMode ??
        "cards") as SessionsDisplayMode)
    }
    showTime={
      typeof (selectedBlock.props as any).showTime === "boolean"
        ? (selectedBlock.props as any).showTime
        : true
    }
    showDescriptions={
      typeof (selectedBlock.props as any).showDescriptions === "boolean"
        ? (selectedBlock.props as any).showDescriptions
        : true
    }
    showPresenter={
      typeof (selectedBlock.props as any).showPresenter === "boolean"
        ? (selectedBlock.props as any).showPresenter
        : true
    }
    showJoinAction={
      typeof (selectedBlock.props as any).showJoinAction === "boolean"
        ? (selectedBlock.props as any).showJoinAction
        : true
    }
    emptyStateText={
      typeof (selectedBlock.props as any).emptyStateText === "string"
        ? (selectedBlock.props as any).emptyStateText
        : "No sessions are available yet."
    }
    onChange={(patch) =>
      updateSelectedBlockProps(patch as any)
    }
  />
) : null}
{selectedBlock.props.componentKey === "speaker_cards" ? (
  <SystemComponentInspector
    componentKey={selectedBlock.props.componentKey}
    title={
      typeof selectedBlock.props.title === "string"
        ? selectedBlock.props.title
        : undefined
    }
    body={
      typeof selectedBlock.props.body === "string"
        ? selectedBlock.props.body
        : undefined
    }
  >
    <SpeakerCardsInspector
      title={
        typeof selectedBlock.props.title === "string"
          ? selectedBlock.props.title
          : "Featured Speakers"
      }
      description={
        typeof selectedBlock.props.body === "string"
          ? selectedBlock.props.body
          : "Meet the voices guiding this experience."
      }
      displayMode={
        (((selectedBlock.props as any).displayMode ??
          "grid") as "grid" | "list" | "spotlight")
      }
      showRole={
        typeof (selectedBlock.props as any).showRole === "boolean"
          ? (selectedBlock.props as any).showRole
          : true
      }
      showCompany={
        typeof (selectedBlock.props as any).showCompany === "boolean"
          ? (selectedBlock.props as any).showCompany
          : true
      }
      showBio={
        typeof (selectedBlock.props as any).showBio === "boolean"
          ? (selectedBlock.props as any).showBio
          : true
      }
      onChange={(patch) =>
        updateSelectedBlockProps(patch as any)
      }
    />
  </SystemComponentInspector>
) : null}
                            </>
                          )}

                          {selectedBlock.type === "rich_text" && (
                            <>
                              <div>
                                <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                                  Title
                                </div>
                                <input
                                  value={String(selectedBlock.props.title ?? "")}
                                  onChange={(e) =>
                                    updateSelectedBlockProps({
                                      title: e.target.value,
                                    })
                                  }
                                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"
                                />
                              </div>

                              <div>
                                <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                                  Body
                                </div>
                                <textarea
                                  value={String(selectedBlock.props.body ?? "")}
                                  onChange={(e) =>
                                    updateSelectedBlockProps({
                                      body: e.target.value,
                                    })
                                  }
                                  className="min-h-[120px] w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"
                                />
                              </div>

                              <div>
                                <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                                  Alignment
                                </div>
                                <select
                                  value={String(selectedBlock.props.align ?? "left")}
                                  onChange={(e) =>
                                    updateSelectedBlockProps({
                                      align: e.target.value as "left" | "center",
                                    })
                                  }
                                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"
                                >
                                  <option value="left">Left</option>
                                  <option value="center">Center</option>
                                </select>
                              </div>
                            </>
                          )}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="mt-3 text-sm text-white/55">
                      Click a section in the list or an element on the canvas to edit it.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
              <SectionPanelHeader
                title="Section Templates"
                open={sectionTemplatesOpen}
                onToggle={() => setSectionTemplatesOpen((v: boolean) => !v)}
              />

              {sectionTemplatesOpen && (
                <div className="mt-3 grid grid-cols-1 gap-3">
{SECTION_TEMPLATE_OPTIONS.map((preset) => {
  const isRegistrationTemplate = preset.title === "Registration Form"

  return (
    <button
      key={`${preset.key}-${preset.title}`}
      onClick={() => addSectionTemplate(preset.key, preset.title)}
      className={`rounded-xl border px-4 py-3 text-left transition ${
        isRegistrationTemplate
          ? "border-sky-300/22 bg-sky-400/10 hover:bg-sky-400/16"
          : "border-white/10 bg-black/20 hover:bg-white/5"
      }`}
    >
      <div className="text-sm font-semibold text-white">{preset.title}</div>
      <div className="mt-1 text-xs text-white/50">{preset.body}</div>
    </button>
  )
})}
                </div>
              )}
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
              <SectionPanelHeader
                title="Add Element"
                open={addElementOpen}
                onToggle={() => setAddElementOpen((v: boolean) => !v)}
              />

              {addElementOpen && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => addElement("text")}
                    className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-white hover:bg-white/5"
                  >
                    Text
                  </button>

                  <button
                    onClick={() => addElement("image")}
                    className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-white hover:bg-white/5"
                  >
                    Image
                  </button>

                  <button
                    onClick={() => addElement("pdf")}
                    className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-white hover:bg-white/5"
                  >
                    PDF
                  </button>

                  <button
                    onClick={() => addElement("video")}
                    className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-white hover:bg-white/5"
                  >
                    Video
                  </button>

                  <button
                    onClick={() => addElement("button")}
                    className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-white hover:bg-white/5"
                  >
                    Button
                  </button>

                  <button
                    onClick={() => addElement("spacer")}
                    className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-white hover:bg-white/5"
                  >
                    Spacer
                  </button>
                </div>
              )}
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
              <SectionPanelHeader
                title="Sections"
                open={sectionsListOpen}
                onToggle={() => setSectionsListOpen((v: boolean) => !v)}
              />

              {sectionsListOpen && (
                <>
                  <div className="mt-3 space-y-2">
{sections.map((section, index) => {
  const isActive = selectedSection?.id === section.id
  const isDragging = draggingSectionId === section.id
  const isDragOver = dragOverSectionId === section.id
  const isHero = section.type === "hero"
  const label = section.config.adminLabel || getSafeSectionLabel(section.type)

  const hasBackgroundColor =
    typeof section.config.sectionBackgroundColor === "string" &&
    section.config.sectionBackgroundColor.trim().length > 0

  const hasBorderColor =
    typeof section.config.sectionBorderColor === "string" &&
    section.config.sectionBorderColor.trim().length > 0

  const hasTextColor =
    typeof section.config.sectionTextColor === "string" &&
    section.config.sectionTextColor.trim().length > 0

  return (
    <div
      key={`${section.type}-${section.id}-${index}`}
      draggable={!isHero}
      onDragStart={(e) => {
        if (isHero) return
        e.dataTransfer.effectAllowed = "move"
        e.dataTransfer.setData("text/plain", section.id)
        handleSectionDragStart(section.id)
      }}
      onDragOver={(e) => handleSectionDragOver(e, section.id)}
      onDrop={(e) => handleSectionDrop(e, section.id)}
      onDragEnd={handleSectionDragEnd}
      onClick={() => selectSectionFromList(section)}
      onDoubleClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        selectSectionFromList(section)
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          selectSectionFromList(section)
        }
      }}
      className={`group relative flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left transition ${
        isActive
          ? "border-sky-400 bg-sky-400/10 text-white"
          : "border-white/10 bg-black/20 text-white/80 hover:bg-white/5"
      } ${isDragging ? "scale-[0.98] opacity-50" : ""} ${
        isDragOver ? "ring-2 ring-emerald-400 ring-inset" : ""
      } ${!isHero ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}
    >
      {isDragOver && !isDragging ? (
        <div className="pointer-events-none absolute inset-x-2 top-0 h-0.5 rounded-full bg-emerald-400" />
      ) : null}

      <div className="flex min-w-0 items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-sm font-semibold transition ${
            !isHero
              ? isActive
                ? "border-sky-300/40 bg-sky-300/10 text-sky-100"
                : "border-white/10 bg-white/5 text-white/50 group-hover:border-white/20 group-hover:text-white/80"
              : "border-white/10 bg-white/5 text-white/35"
          }`}
          title={isHero ? "Pinned hero section" : "Drag to reorder"}
        >
          {!isHero ? "⋮⋮" : "•"}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="truncate text-sm font-medium">{label}</div>

            {(hasBackgroundColor || hasBorderColor || hasTextColor) && (
              <div className="flex items-center gap-1.5">
                {hasBackgroundColor ? (
                  <span
                    className="h-3 w-3 rounded-full border border-white/20"
                    style={{ backgroundColor: section.config.sectionBackgroundColor }}
                    title="Custom background color"
                  />
                ) : null}

                {hasBorderColor ? (
                  <span
                    className="h-3 w-3 rounded-full border border-white/20"
                    style={{ backgroundColor: section.config.sectionBorderColor }}
                    title="Custom border color"
                  />
                ) : null}

                {hasTextColor ? (
                  <span
                    className="h-3 w-3 rounded-full border border-white/20"
                    style={{ backgroundColor: section.config.sectionTextColor }}
                    title="Custom text color"
                  />
                ) : null}
              </div>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/45">
            <span>{getSafeSectionLabel(section.type)}</span>
            {!isHero ? (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-white/55">
                Drag to reorder
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="ml-3 flex shrink-0 flex-col items-end gap-1">
        <div
          className={`text-[10px] uppercase tracking-[0.18em] ${
            section.config.visible === false
              ? "text-red-300/80"
              : "text-emerald-300/80"
          }`}
        >
          {section.config.visible === false ? "Hidden" : "Visible"}
        </div>

        {section.config.hideOnMobile ? (
          <div className="text-[10px] uppercase tracking-[0.18em] text-amber-300/80">
            No Mobile
          </div>
        ) : null}

        {isHero ? (
          <div className="text-[10px] uppercase tracking-[0.18em] text-sky-300/70">
            Pinned
          </div>
        ) : null}
      </div>
    </div>
  )
})}
                  </div>

                  <div className="mt-3 text-xs text-white/35">
                    Drag content sections to reorder. Hero stays pinned to the top.
                  </div>
                </>
              )}
            </div>
      </aside>
  )
}
