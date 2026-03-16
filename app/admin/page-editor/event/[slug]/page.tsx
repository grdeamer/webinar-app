"use client"

import { useParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import EventPageRenderer from "@/components/page-editor/EventPageRenderer"
import {
  SECTION_TEMPLATE_OPTIONS,
  getDefaultSectionConfig,
  getSectionRegistryItem,
} from "@/lib/page-editor/sectionRegistry"
import type {
  SectionConfig,
  SectionType,
} from "@/lib/page-editor/sectionTypes"

export type EditorElement = {
  id: string
  element_type?: string
  content: string
  x: number
  y: number
  width?: number | null
  height?: number | null
  z_index?: number
  props?: Record<string, unknown>
}

export type EventPageSection = {
  id: string
  type: SectionType
  config: SectionConfig
}

type AddableElementType = "text" | "image" | "pdf" | "button" | "spacer"

const GRID_SIZE = 8

function snapToGrid(value: number) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE
}

function createElementId() {
  return `el-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function getDefaultSections(eventInfo: {
  title: string
  description?: string | null
}): EventPageSection[] {
  return [
    {
      id: "hero",
      type: "hero",
      config: {
        ...getDefaultSectionConfig("hero"),
        title: eventInfo.title,
        body: eventInfo.description ?? null,
      },
    },
    {
      id: "content",
      type: "content",
      config: {
        ...getDefaultSectionConfig("content"),
      },
    },
  ]
}

function getFallbackElements(): EditorElement[] {
  return [
    {
      id: "1",
      element_type: "text",
      content: "Sample Text Block",
      x: 96,
      y: 96,
      width: 224,
      height: 56,
      z_index: 1,
      props: { hideOnMobile: false },
    },
  ]
}

function SectionPanelHeader({
  title,
  open,
  onToggle,
}: {
  title: string
  open: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between text-left"
    >
      <span className="text-sm font-semibold">{title}</span>
      <span className="text-xs text-white/45">{open ? "−" : "+"}</span>
    </button>
  )
}

export default function AdminEventPageEditorPreview() {
  const params = useParams()
  const slug = String(params.slug ?? "")

  const eventInfo = {
    title: slug ? slug.replace(/-/g, " ") : "Event Preview",
    description: "Renderer mode is now active inside the Page Editor.",
  }

  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [draggingSectionId, setDraggingSectionId] = useState<string | null>(null)
  const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(null)
  const [editingElementId, setEditingElementId] = useState<string | null>(null)
  const [isMobilePreview, setIsMobilePreview] = useState(false)

  const [sectionTemplatesOpen, setSectionTemplatesOpen] = useState(true)
  const [addElementOpen, setAddElementOpen] = useState(true)
  const [sectionsListOpen, setSectionsListOpen] = useState(true)
  const [editorDetailsOpen, setEditorDetailsOpen] = useState(true)

  const [elements, setElements] = useState<EditorElement[]>([])
  const [sections, setSections] = useState<EventPageSection[]>(getDefaultSections(eventInfo))
  const [templates, setTemplates] = useState<any[]>([])

  const dragRef = useRef<{
    id: string
    offsetX: number
    offsetY: number
  } | null>(null)
  const isDraggingRef = useRef(false)
  const resizeRef = useRef<{
    id: string
    startX: number
    startY: number
    startWidth: number
    startHeight: number
  } | null>(null)

  useEffect(() => {
  async function loadElements() {
    setLoading(true)
    setSaveMessage(null)

    const res = await fetch(`/api/admin/page-editor/event/${slug}/elements`, {
      cache: "no-store",
    })

    const data: any = await res.json().catch((): null => null)

    if (!res.ok) {
      setElements(getFallbackElements())
      setSections(getDefaultSections(eventInfo))
      setLoading(false)
      return
    }

    const rows = Array.isArray(data?.elements) ? data.elements : []
    const loadedSections = Array.isArray(data?.sections) ? data.sections : []

    if (rows.length === 0) {
      setElements(getFallbackElements())
    } else {
      setElements(
        rows.map((el: any) => ({
          id: String(el.id),
          element_type: String(el.element_type ?? "text"),
          content: String(el.content ?? "Untitled Block"),
          x: Number(el.x ?? 0),
          y: Number(el.y ?? 0),
          width: el.width == null ? 224 : Number(el.width),
          height: el.height == null ? 56 : Number(el.height),
          z_index: Number(el.z_index ?? 1),
          props: el.props && typeof el.props === "object" ? el.props : {},
        }))
      )
    }

    if (loadedSections.length > 0) {
      setSections(
        loadedSections.map((section: any) => ({
          id: String(section.id),
          type: String(section.type ?? "content") as SectionType,
          config:
            section.config && typeof section.config === "object"
              ? section.config
              : getDefaultSectionConfig(
                  String(section.type ?? "content") as SectionType
                ),
        }))
      )
    } else {
      setSections(getDefaultSections(eventInfo))
    }

    setLoading(false)
  }

  void loadElements()
}, [slug])

useEffect(() => {
  async function loadTemplates() {
    try {
      const res = await fetch("/api/admin/page-editor/templates")
      const data = await res.json()

      if (data.templates) {
        setTemplates(data.templates)
      }
    } catch {
      console.error("Failed to load templates")
    }
  }

  loadTemplates()
}, [])

  function startDrag(
    e: React.PointerEvent<HTMLDivElement>,
    id: string,
    x: number,
    y: number
  ) {
    if (!isEditing) return
    if (editingElementId === id) return
    if ((e.target as HTMLElement).dataset.resizeHandle === "true") return
    if ((e.target as HTMLElement).dataset.inlineEditor === "true") return

    dragRef.current = {
  id,
  offsetX: e.clientX - x,
  offsetY: e.clientY - y,
}

isDraggingRef.current = true

    setSelectedId(id)
    setSelectedSectionId(null)
  }

  function startResize(
    e: React.PointerEvent<HTMLDivElement>,
    id: string,
    width: number | null | undefined,
    height: number | null | undefined
  ) {
    if (!isEditing) return
    if (editingElementId === id) return
    e.stopPropagation()

    resizeRef.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: width ?? 224,
      startHeight: height ?? 56,
    }

    setSelectedId(id)
    setSelectedSectionId(null)
  }

  function onCanvasMove(e: React.PointerEvent<HTMLDivElement>) {
    if (resizeRef.current) {
      const { id, startX, startY, startWidth, startHeight } = resizeRef.current

      const nextWidth = snapToGrid(Math.max(96, startWidth + (e.clientX - startX)))
      const nextHeight = snapToGrid(Math.max(32, startHeight + (e.clientY - startY)))

      setElements((prev) =>
        prev.map((el) =>
          el.id === id ? { ...el, width: nextWidth, height: nextHeight } : el
        )
      )

      return
    }

    if (!dragRef.current) return

    const { id, offsetX, offsetY } = dragRef.current
    const nextX = snapToGrid(Math.max(0, e.clientX - offsetX))
    const nextY = snapToGrid(Math.max(0, e.clientY - offsetY))

    setElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, x: nextX, y: nextY } : el))
    )
  }

 function stopInteractions() {
  dragRef.current = null
  resizeRef.current = null

  setTimeout(() => {
    isDraggingRef.current = false
  }, 50)
}

  async function saveLayout() {
    setSaveMessage("Saving...")

    const payload = [...elements]
      .sort((a, b) => (a.z_index ?? 0) - (b.z_index ?? 0))
      .map((el, idx) => ({
        element_type: el.element_type ?? "text",
        content: el.content,
        x: snapToGrid(el.x),
        y: snapToGrid(el.y),
        width: el.width == null ? null : snapToGrid(el.width),
        height: el.height == null ? null : snapToGrid(el.height),
        z_index: el.z_index ?? idx + 1,
        props: el.props ?? {},
      }))

    const res = await fetch(`/api/admin/page-editor/event/${slug}/elements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        elements: payload,
        sections,
      }),
    })

    const data: any = await res.json().catch((): null => null)

    if (!res.ok) {
      setSaveMessage(data?.error || "Failed to save")
      return
    }

    setSaveMessage("Saved")
  }

  function updateSectionConfig(id: string, patch: Partial<SectionConfig>) {
    setSections((prev) =>
      prev.map((section) =>
        section.id === id
          ? {
              ...section,
              config: {
                ...section.config,
                ...patch,
              },
            }
          : section
      )
    )
  }

  function updateElement(id: string, patch: Partial<EditorElement>) {
    setElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, ...patch } : el))
    )
  }

  function updateElementProps(id: string, patch: Record<string, unknown>) {
    setElements((prev) =>
      prev.map((el) =>
        el.id === id
          ? {
              ...el,
              props: {
                ...(el.props ?? {}),
                ...patch,
              },
            }
          : el
      )
    )
  }

  function commitInlineElementEdit(id: string, value: string) {
    updateElement(id, { content: value })
    setEditingElementId(null)
  }

  function getNextContentId() {
    const contentCount = sections.filter((section) => section.type !== "hero").length
    return contentCount === 0 ? "content" : `content-${contentCount + 1}`
  }

  function normalizeZIndexes(nextElements: EditorElement[]) {
    const sorted = [...nextElements].sort((a, b) => (a.z_index ?? 0) - (b.z_index ?? 0))
    return sorted.map((el, idx) => ({
      ...el,
      z_index: idx + 1,
    }))
  }

  function bringSelectedElementForward() {
    if (!selectedId) return

    setElements((prev) => {
      const normalized = normalizeZIndexes(prev)
      const index = normalized.findIndex((el) => el.id === selectedId)
      if (index === -1 || index === normalized.length - 1) return prev

      const next = [...normalized]
      const currentZ = next[index].z_index ?? index + 1
      const targetZ = next[index + 1].z_index ?? index + 2

      next[index] = { ...next[index], z_index: targetZ }
      next[index + 1] = { ...next[index + 1], z_index: currentZ }

      return normalizeZIndexes(next)
    })
  }

  function sendSelectedElementBackward() {
    if (!selectedId) return

    setElements((prev) => {
      const normalized = normalizeZIndexes(prev)
      const index = normalized.findIndex((el) => el.id === selectedId)
      if (index <= 0) return prev

      const next = [...normalized]
      const currentZ = next[index].z_index ?? index + 1
      const targetZ = next[index - 1].z_index ?? index

      next[index] = { ...next[index], z_index: targetZ }
      next[index - 1] = { ...next[index - 1], z_index: currentZ }

      return normalizeZIndexes(next)
    })
  }

  function addSectionPreset(type: SectionType) {
    const nextId = type === "hero" ? "hero" : getNextContentId()

    setSections((prev) => [
      ...prev,
      {
        id: nextId,
        type,
        config: getDefaultSectionConfig(type),
      },
    ])

    setSelectedSectionId(nextId)
    setSelectedId(null)
  }

  function addElement(elementType: AddableElementType) {
    const id = createElementId()
    const highestZ = elements.reduce((max, el) => Math.max(max, el.z_index ?? 0), 0)

    let nextElement: EditorElement

    switch (elementType) {
      case "image":
        nextElement = {
          id,
          element_type: "image",
          content: "Image Block",
          x: 96,
          y: 120,
          width: 320,
          height: 184,
          z_index: highestZ + 1,
          props: {
            src: "https://placehold.co/800x450/png",
            alt: "Image block",
            hideOnMobile: false,
          },
        }
        break

      case "pdf":
        nextElement = {
          id,
          element_type: "pdf",
          content: "PDF Resource",
          x: 96,
          y: 120,
          width: 320,
          height: 184,
          z_index: highestZ + 1,
          props: {
            url: "https://example.com/sample.pdf",
            hideOnMobile: false,
          },
        }
        break

      case "button":
        nextElement = {
          id,
          element_type: "button",
          content: "Register Now",
          x: 96,
          y: 120,
          width: 200,
          height: 56,
          z_index: highestZ + 1,
          props: {
            href: "#",
            hideOnMobile: false,
          },
        }
        break

      case "spacer":
        nextElement = {
          id,
          element_type: "spacer",
          content: "",
          x: 96,
          y: 120,
          width: 320,
          height: 40,
          z_index: highestZ + 1,
          props: {
            hideOnMobile: false,
          },
        }
        break

      case "text":
      default:
        nextElement = {
          id,
          element_type: "text",
          content: "New text block",
          x: 96,
          y: 120,
          width: 264,
          height: 56,
          z_index: highestZ + 1,
          props: {
            hideOnMobile: false,
          },
        }
        break
    }

    setElements((prev) => normalizeZIndexes([...prev, nextElement]))
    setSelectedId(id)
    setSelectedSectionId(null)

    if (elementType === "text" || elementType === "button" || elementType === "pdf") {
      setEditingElementId(id)
    }
  }

  function moveSelectedSection(direction: "up" | "down") {
    if (!selectedSectionId) return

    setSections((prev) => {
      const heroSections = prev.filter((section) => section.type === "hero")
      const contentSections = prev.filter((section) => section.type !== "hero")

      const contentIndex = contentSections.findIndex((section) => section.id === selectedSectionId)
      if (contentIndex === -1) return prev

      const targetIndex = direction === "up" ? contentIndex - 1 : contentIndex + 1
      if (targetIndex < 0 || targetIndex >= contentSections.length) return prev

      const reordered = [...contentSections]
      const [moved] = reordered.splice(contentIndex, 1)
      reordered.splice(targetIndex, 0, moved)

      return [...heroSections, ...reordered]
    })
  }

  function deleteSelectedSection() {
    if (!selectedSectionId) return

    const selected = sections.find((section) => section.id === selectedSectionId)
    if (!selected || selected.type === "hero") return

    const remainingSections = sections.filter((section) => section.id !== selectedSectionId)
    const remainingContent = remainingSections.filter((section) => section.type !== "hero")

    setSections(remainingSections)
    setSelectedSectionId(remainingContent[0]?.id ?? null)
    setSelectedId(null)
  }

  function duplicateSelectedSection() {
    if (!selectedSectionId) return

    const selected = sections.find((section) => section.id === selectedSectionId)
    if (!selected || selected.type === "hero") return

    const selectedIndex = sections.findIndex((section) => section.id === selectedSectionId)
    if (selectedIndex === -1) return

    const nextId = getNextContentId()

    const duplicatedSection: EventPageSection = {
      ...selected,
      id: nextId,
      config: {
        ...selected.config,
        adminLabel: selected.config.adminLabel
          ? `${selected.config.adminLabel} Copy`
          : "Content Copy",
        title: selected.config.title
          ? `${selected.config.title} Copy`
          : "Content Section Copy",
      },
    }

    setSections((prev) => {
      const next = [...prev]
      next.splice(selectedIndex + 1, 0, duplicatedSection)
      return next
    })

    setSelectedSectionId(nextId)
    setSelectedId(null)
  }

  function deleteSelectedElement() {
    if (!selectedId) return

    setElements((prev) => normalizeZIndexes(prev.filter((el) => el.id !== selectedId)))
    setSelectedId(null)
    setEditingElementId(null)
  }

  function duplicateSelectedElement() {
    if (!selectedId) return

    const selected = elements.find((el) => el.id === selectedId)
    if (!selected) return

    const nextId = createElementId()
    const highestZ = elements.reduce((max, el) => Math.max(max, el.z_index ?? 0), 0)

    const duplicated: EditorElement = {
      ...selected,
      id: nextId,
      x: snapToGrid(selected.x + 24),
      y: snapToGrid(selected.y + 24),
      z_index: highestZ + 1,
      props: { ...(selected.props ?? {}) },
    }

    setElements((prev) => normalizeZIndexes([...prev, duplicated]))
    setSelectedId(nextId)
    setSelectedSectionId(null)
  }

  function handleSectionDragStart(sectionId: string) {
    const section = sections.find((s) => s.id === sectionId)
    if (!section || section.type === "hero") return
    setDraggingSectionId(sectionId)
    setDragOverSectionId(null)
    setSelectedSectionId(sectionId)
    setSelectedId(null)
  }

  function handleSectionDragOver(e: React.DragEvent<HTMLButtonElement>, sectionId: string) {
    e.preventDefault()

    if (!draggingSectionId || draggingSectionId === sectionId) return

    const targetSection = sections.find((s) => s.id === sectionId)
    const draggingSection = sections.find((s) => s.id === draggingSectionId)

    if (!targetSection || !draggingSection) return
    if (targetSection.type === "hero" || draggingSection.type === "hero") return

    setDragOverSectionId(sectionId)
  }

  function handleSectionDrop(sectionId: string) {
    if (!draggingSectionId || draggingSectionId === sectionId) {
      setDraggingSectionId(null)
      setDragOverSectionId(null)
      return
    }

    setSections((prev) => {
      const heroSections = prev.filter((section) => section.type === "hero")
      const contentOnly = prev.filter((section) => section.type !== "hero")

      const fromIndex = contentOnly.findIndex((section) => section.id === draggingSectionId)
      const toIndex = contentOnly.findIndex((section) => section.id === sectionId)

      if (fromIndex === -1 || toIndex === -1) return prev

      const reordered = [...contentOnly]
      const [moved] = reordered.splice(fromIndex, 1)
      reordered.splice(toIndex, 0, moved)

      return [...heroSections, ...reordered]
    })

    setSelectedSectionId(draggingSectionId)
    setDraggingSectionId(null)
    setDragOverSectionId(null)
    setSelectedId(null)
  }

  function handleSectionDragEnd() {
    setDraggingSectionId(null)
    setDragOverSectionId(null)
  }

  const selectedSection =
    sections.find((section) => section.id === selectedSectionId) ?? null

  const selectedElement =
    elements.find((element) => element.id === selectedId) ?? null

  const contentSections = sections.filter((section) => section.type !== "hero")
  const selectedContentIndex =
    selectedSection && selectedSection.type !== "hero"
      ? contentSections.findIndex((section) => section.id === selectedSection.id)
      : -1

  const normalizedElements = normalizeZIndexes(elements)
  const selectedElementIndex = normalizedElements.findIndex((el) => el.id === selectedId)

  const canMoveUp = selectedSection?.type !== "hero" && selectedContentIndex > 0
  const canMoveDown =
    selectedSection?.type !== "hero" &&
    selectedContentIndex > -1 &&
    selectedContentIndex < contentSections.length - 1

  const canDeleteSection = Boolean(selectedSection && selectedSection.type !== "hero")
  const canDuplicateSection = Boolean(selectedSection && selectedSection.type !== "hero")
  const canDeleteElement = Boolean(selectedElement)
  const canDuplicateElement = Boolean(selectedElement)
  const canBringForward =
    selectedElementIndex > -1 && selectedElementIndex < normalizedElements.length - 1
  const canSendBackward = selectedElementIndex > 0

  const canvasWrapClass = isMobilePreview ? "mx-auto w-[390px] max-w-full" : "w-full"
  const registryItem = selectedSection ? getSectionRegistryItem(selectedSection.type) : null

  return (
  <div className="min-h-screen bg-slate-950 text-white">
    <div className="border-b border-white/10 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">

        {/* LEFT SIDE */}
        <div className="flex items-center gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-white/40">
              Page Editor Preview
            </div>

            <h1 className="text-xl font-semibold capitalize">
              {eventInfo.title}
            </h1>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="flex items-center gap-3">
          <select
            onChange={(e) => {
              const tpl = templates.find((t) => t.id === e.target.value)
              if (!tpl) return

              setSections(Array.isArray(tpl.sections_json) ? tpl.sections_json : [])
setElements(Array.isArray(tpl.elements_json) ? tpl.elements_json : [])
            }}
            className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm"
          >
            <option value="">Apply Template</option>

            {templates.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => setIsMobilePreview((v) => !v)}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm"
          >
            {isMobilePreview ? "Mobile" : "Desktop"}
          </button>

          <button
            onClick={() => setIsEditing((v) => !v)}
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black"
          >
            {isEditing ? "Close Editor" : "Edit Page"}
          </button>
        </div>
      </div>
    </div>

    <div className="relative flex min-h-[calc(100vh-81px)]">
        <div className="flex-1 overflow-auto">
          <div className="mx-auto max-w-6xl px-6 py-10">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-10">
              {loading ? (
                <div className="mt-8 rounded-2xl border border-white/10 bg-black/30 p-8 text-white/60">
                  Loading editor elements...
                </div>
              ) : (
                <div className={canvasWrapClass}>
                  <div
                    className="mt-8 relative min-h-[900px] overflow-hidden rounded-2xl border border-white/10 bg-black"
                    onPointerMove={onCanvasMove}
                    onPointerUp={stopInteractions}
                    onPointerLeave={stopInteractions}
                    onClick={() => {
                      setSelectedId(null)
                      setSelectedSectionId(null)
                      setEditingElementId(null)
                    }}
                  >
                    <EventPageRenderer
                      mode="editor"
                      event={eventInfo}
                      elements={[]}
                      sections={sections}
                      isEditing={isEditing}
                      selectedSectionId={selectedSectionId}
                      onSelectSection={(id: string | null) => {
                        setSelectedSectionId(id)
                        setSelectedId(null)
                        setEditingElementId(null)
                      }}
                      isMobilePreview={isMobilePreview}
                    />

                    {normalizedElements
                      .filter((el) => !(isMobilePreview && Boolean(el.props?.hideOnMobile)))
                      .map((el) => {
                        const isInlineEditing = editingElementId === el.id
                        const showInlineEditor =
                          isInlineEditing &&
                          (el.element_type === "text" ||
                            el.element_type === "button" ||
                            el.element_type === "pdf")

                        return (
                          <div
                            key={el.id}
                            onPointerDown={(e) => startDrag(e, el.id, el.x, el.y)}
                            onDoubleClick={(e) => {
                              e.stopPropagation()
                              if (
                                el.element_type === "text" ||
                                el.element_type === "button" ||
                                el.element_type === "pdf"
                              ) {
                                setEditingElementId(el.id)
                                setSelectedId(el.id)
                                setSelectedSectionId(null)
                              }
                            }}
                        onClick={(e) => {
  if (isDraggingRef.current) return

  e.stopPropagation()
  setSelectedId(el.id)
  setSelectedSectionId(null)
}}
                            className={`absolute overflow-hidden rounded-xl shadow-lg ${
                              isEditing ? "cursor-grab active:cursor-grabbing" : "cursor-default"
                            } ${selectedId === el.id ? "ring-2 ring-white" : ""} ${
                              el.element_type === "image"
                                ? "bg-white"
                                : el.element_type === "pdf"
                                ? "bg-red-950/90 text-white"
                                : el.element_type === "button"
                                ? "bg-transparent"
                                : el.element_type === "spacer"
                                ? "border border-dashed border-white/20 bg-white/5"
                                : "bg-amber-400 text-black"
                            }`}
                            style={{
                              left: el.x,
                              top: el.y,
                              zIndex: el.z_index ?? 1,
                              width: el.width ?? "auto",
                              height: el.height ?? "auto",
                            }}
                          >
                            {showInlineEditor ? (
                              <div className="h-full w-full p-2">
                                {el.element_type === "text" ? (
                                  <textarea
                                    data-inline-editor="true"
                                    autoFocus
                                    defaultValue={el.content}
                                    onBlur={(e) => commitInlineElementEdit(el.id, e.target.value)}
                                    onKeyDown={(e) => {
                                      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                                        commitInlineElementEdit(
                                          el.id,
                                          (e.target as HTMLTextAreaElement).value
                                        )
                                      }
                                      if (e.key === "Escape") setEditingElementId(null)
                                    }}
                                    className="h-full w-full resize-none rounded-lg border border-black/10 bg-white/90 px-3 py-2 text-sm text-black outline-none"
                                  />
                                ) : (
                                  <input
                                    data-inline-editor="true"
                                    autoFocus
                                    defaultValue={el.content}
                                    onBlur={(e) => commitInlineElementEdit(el.id, e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        commitInlineElementEdit(
                                          el.id,
                                          (e.target as HTMLInputElement).value
                                        )
                                      }
                                      if (e.key === "Escape") setEditingElementId(null)
                                    }}
                                    className="h-full w-full rounded-lg border border-black/10 bg-white/90 px-3 py-2 text-sm text-black outline-none"
                                  />
                                )}
                              </div>
                            ) : el.element_type === "image" ? (
                              <img
                                src={String(el.props?.src ?? "https://placehold.co/800x450/png")}
                                alt={String(el.props?.alt ?? "Image block")}
                                className="h-full w-full object-cover"
                                draggable={false}
                              />
                            ) : el.element_type === "pdf" ? (
                              <div className="flex h-full w-full flex-col justify-between p-4">
                                <div>
                                  <div className="text-xs uppercase tracking-[0.18em] text-white/50">
                                    PDF
                                  </div>
                                  <div className="mt-2 text-base font-semibold">{el.content}</div>
                                </div>
                                <div className="mt-4 break-all text-xs text-white/70">
                                  {String(el.props?.url ?? "")}
                                </div>
                              </div>
                            ) : el.element_type === "button" ? (
                              <div className="flex h-full w-full items-center justify-center">
                                <button
                                  type="button"
                                  className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white"
                                >
                                  {el.content || "Button"}
                                </button>
                              </div>
                            ) : el.element_type === "spacer" ? (
                              <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-[0.18em] text-white/40">
                                Spacer
                              </div>
                            ) : (
                              <div className="px-4 py-2 text-sm font-medium whitespace-pre-wrap">
                                {el.content}
                              </div>
                            )}

                            {isEditing && !showInlineEditor && (
                              <div
                                data-resize-handle="true"
                                onPointerDown={(e) =>
                                  startResize(e, el.id, el.width, el.height)
                                }
                                className="absolute bottom-0 right-0 h-3 w-3 cursor-se-resize rounded-sm bg-black/40"
                              />
                            )}
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <aside
          className={`border-l border-white/10 bg-slate-950/95 backdrop-blur-xl transition-all duration-300 ${
            isEditing ? "w-[380px] opacity-100" : "w-0 overflow-hidden opacity-0"
          }`}
        >
          <div className="w-[380px] p-6">
            <div className="text-xs uppercase tracking-[0.22em] text-white/40">
              Editor Panel
            </div>

            <h3 className="mt-2 text-xl font-semibold">Edit Event Page</h3>

            <p className="mt-2 text-sm text-white/65">
              Live preview is active. Dragging and resizing snap to an {GRID_SIZE}px grid.
            </p>

            <div className="mt-3 text-xs text-white/45">
              Preview mode: {isMobilePreview ? "Mobile" : "Desktop"}
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
              <SectionPanelHeader
                title="Section Templates"
                open={sectionTemplatesOpen}
                onToggle={() => setSectionTemplatesOpen((v) => !v)}
              />

              {sectionTemplatesOpen && (
                <div className="mt-3 grid grid-cols-1 gap-3">
                  {SECTION_TEMPLATE_OPTIONS.map((preset) => (
                    <button
                      key={preset.key}
                      onClick={() => addSectionPreset(preset.key)}
                      className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-left hover:bg-white/5"
                    >
                      <div className="text-sm font-semibold text-white">{preset.title}</div>
                      <div className="mt-1 text-xs text-white/50">{preset.body}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
              <SectionPanelHeader
                title="Add Element"
                open={addElementOpen}
                onToggle={() => setAddElementOpen((v) => !v)}
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
                    onClick={() => addElement("button")}
                    className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-white hover:bg-white/5"
                  >
                    Button
                  </button>
                  <button
                    onClick={() => addElement("spacer")}
                    className="col-span-2 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-white hover:bg-white/5"
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

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
              <SectionPanelHeader
                title={
                  selectedElement
                    ? "Selected Element"
                    : selectedSection
                    ? selectedSection.config.adminLabel ||
                      getSectionRegistryItem(selectedSection.type).label
                    : "Editor"
                }
                open={editorDetailsOpen}
                onToggle={() => setEditorDetailsOpen((v) => !v)}
              />

              {editorDetailsOpen && (
                <>
                  <div className="mt-2 text-xs text-white/45">
                    {selectedElement
                      ? `${selectedElement.element_type ?? "text"} element`
                      : selectedSection
                      ? `${getSectionRegistryItem(selectedSection.type).label} section`
                      : "Select a section or canvas element"}
                  </div>

                  {selectedElement ? (
                    <div className="mt-4 space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={duplicateSelectedElement}
                          disabled={!canDuplicateElement}
                          className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                            canDuplicateElement
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
                          Delete
                        </button>
                      </div>

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

                      <div>
                        <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                          Layer
                        </div>
                        <input
                          value={selectedElement.z_index ?? 1}
                          readOnly
                          className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-sm text-white/70"
                        />
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
                                updateElement(selectedElement.id, { content: e.target.value })
                              }
                              className="min-h-[100px] w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"
                            />
                          ) : (
                            <input
                              value={selectedElement.content}
                              onChange={(e) =>
                                updateElement(selectedElement.id, { content: e.target.value })
                              }
                              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"
                            />
                          )}
                        </div>
                      )}

                      {selectedElement.element_type === "image" && (
                        <>
                          <div>
                            <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                              Image URL
                            </div>
                            <input
                              value={String(selectedElement.props?.src ?? "")}
                              onChange={(e) =>
                                updateElementProps(selectedElement.id, { src: e.target.value })
                              }
                              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"
                            />
                          </div>

                          <div>
                            <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                              Alt Text
                            </div>
                            <input
                              value={String(selectedElement.props?.alt ?? "")}
                              onChange={(e) =>
                                updateElementProps(selectedElement.id, { alt: e.target.value })
                              }
                              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"
                            />
                          </div>
                        </>
                      )}

                      {selectedElement.element_type === "pdf" && (
                        <div>
                          <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                            PDF URL
                          </div>
                          <input
                            value={String(selectedElement.props?.url ?? "")}
                            onChange={(e) =>
                              updateElementProps(selectedElement.id, { url: e.target.value })
                            }
                            className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"
                          />
                        </div>
                      )}

                      {selectedElement.element_type === "button" && (
                        <div>
                          <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                            Button Link
                          </div>
                          <input
                            value={String(selectedElement.props?.href ?? "")}
                            onChange={(e) =>
                              updateElementProps(selectedElement.id, { href: e.target.value })
                            }
                            className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                            X
                          </div>
                          <input
                            type="number"
                            value={selectedElement.x}
                            onChange={(e) =>
                              updateElement(selectedElement.id, {
                                x: snapToGrid(Number(e.target.value || 0)),
                              })
                            }
                            className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"
                          />
                        </div>

                        <div>
                          <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                            Y
                          </div>
                          <input
                            type="number"
                            value={selectedElement.y}
                            onChange={(e) =>
                              updateElement(selectedElement.id, {
                                y: snapToGrid(Number(e.target.value || 0)),
                              })
                            }
                            className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                            Width
                          </div>
                          <input
                            type="number"
                            value={selectedElement.width ?? 0}
                            onChange={(e) =>
                              updateElement(selectedElement.id, {
                                width: snapToGrid(Number(e.target.value || 0)),
                              })
                            }
                            className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"
                          />
                        </div>

                        <div>
                          <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                            Height
                          </div>
                          <input
                            type="number"
                            value={selectedElement.height ?? 0}
                            onChange={(e) =>
                              updateElement(selectedElement.id, {
                                height: snapToGrid(Number(e.target.value || 0)),
                              })
                            }
                            className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"
                          />
                        </div>
                      </div>
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

                      {registryItem?.fields.map((field) => {
                        const value = (selectedSection.config as any)?.[field.key]

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
                                {field.options?.map((opt) => (
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
                    </div>
                  ) : (
                    <div className="mt-3 text-sm text-white/55">
                      Click a section in the list or an element on the canvas to edit it.
                    </div>
                  )}
                </>
              )}
            </div>
<button
  onClick={async () => {
    const name = prompt("Template name?")
    if (!name) return

    await fetch("/api/admin/page-editor/templates", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        sections,
        elements,
      }),
    })

    alert("Template saved")
  }}
  className="mt-6 w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold hover:bg-indigo-500"
>
  Save Template
</button>

<button
  onClick={saveLayout}
  className="mt-8 w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold hover:bg-emerald-500"
>
  Save
</button>

{saveMessage && (
  <div className="mt-3 text-sm text-white/70">{saveMessage}</div>
)}

          </div>
        </aside>
      </div>
    </div>
  )
}