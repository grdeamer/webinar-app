"use client"

import { useParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import EventPageRenderer from "@/components/page-editor/EventPageRenderer"

type EditorElement = {
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

type EventPageSection = {
  id: string
  type: "hero" | "content"
  visible?: boolean
  title?: string
  body?: string | null
  adminLabel?: string
  backgroundStyle?: "transparent" | "subtle" | "panel"
  contentWidth?: "md" | "lg" | "xl" | "full"
  paddingY?: "sm" | "md" | "lg"
  textAlign?: "left" | "center"
  divider?: "none" | "top" | "bottom" | "both"
}

type SectionPreset = "content" | "agenda" | "speakers" | "resources" | "cta"
type AddableElementType = "text" | "image" | "pdf" | "button" | "spacer"

const GRID_SIZE = 8

function snapToGrid(value: number) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE
}

function createElementId() {
  return `el-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function getDefaultSections(eventInfo: { title: string; description?: string | null }): EventPageSection[] {
  return [
    {
      id: "hero",
      type: "hero",
      visible: true,
      title: eventInfo.title,
      body: eventInfo.description ?? null,
      adminLabel: "Hero",
      backgroundStyle: "subtle",
      contentWidth: "xl",
      paddingY: "lg",
      textAlign: "left",
      divider: "bottom",
    },
    {
      id: "content",
      type: "content",
      visible: true,
      title: "Main Content",
      body: "Built-in event sections will move here next.",
      adminLabel: "Main Content",
      backgroundStyle: "panel",
      contentWidth: "xl",
      paddingY: "md",
      textAlign: "left",
      divider: "none",
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
      props: {},
    },
  ]
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
  const [elements, setElements] = useState<EditorElement[]>([])
  const [sections, setSections] = useState<EventPageSection[]>(getDefaultSections(eventInfo))

  const dragRef = useRef<{
    id: string
    offsetX: number
    offsetY: number
  } | null>(null)

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
            type: section.type === "hero" ? "hero" : "content",
            visible: section.visible !== false,
            title: section.title == null ? undefined : String(section.title),
            body: section.body == null ? null : String(section.body),
            adminLabel:
              section.adminLabel == null ? undefined : String(section.adminLabel),
            backgroundStyle:
              section.backgroundStyle === "transparent" ||
              section.backgroundStyle === "subtle" ||
              section.backgroundStyle === "panel"
                ? section.backgroundStyle
                : undefined,
            contentWidth:
              section.contentWidth === "md" ||
              section.contentWidth === "lg" ||
              section.contentWidth === "xl" ||
              section.contentWidth === "full"
                ? section.contentWidth
                : undefined,
            paddingY:
              section.paddingY === "sm" ||
              section.paddingY === "md" ||
              section.paddingY === "lg"
                ? section.paddingY
                : undefined,
            textAlign:
              section.textAlign === "left" || section.textAlign === "center"
                ? section.textAlign
                : undefined,
            divider:
              section.divider === "none" ||
              section.divider === "top" ||
              section.divider === "bottom" ||
              section.divider === "both"
                ? section.divider
                : undefined,
          }))
        )
      } else {
        setSections(getDefaultSections(eventInfo))
      }

      setLoading(false)
    }

    void loadElements()
  }, [slug])

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
      prev.map((el) =>
        el.id === id ? { ...el, x: nextX, y: nextY } : el
      )
    )
  }

  function stopInteractions() {
    dragRef.current = null
    resizeRef.current = null
  }

  async function saveLayout() {
    setSaveMessage("Saving...")

    const payload = elements.map((el, idx) => ({
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

  function updateSection(id: string, patch: Partial<EventPageSection>) {
    setSections((prev) =>
      prev.map((section) =>
        section.id === id ? { ...section, ...patch } : section
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
    const contentCount = sections.filter((section) => section.type === "content").length
    return contentCount === 0 ? "content" : `content-${contentCount + 1}`
  }

  function buildPresetSection(preset: SectionPreset, id: string): EventPageSection {
    switch (preset) {
      case "agenda":
        return {
          id,
          type: "content",
          visible: true,
          adminLabel: "Agenda",
          title: "Agenda",
          body:
            "9:00 AM — Welcome\n10:00 AM — General Session\n11:00 AM — Breakout Sessions\n12:00 PM — Closing Remarks",
          backgroundStyle: "panel",
          contentWidth: "xl",
          paddingY: "md",
          textAlign: "left",
          divider: "top",
        }

      case "speakers":
        return {
          id,
          type: "content",
          visible: true,
          adminLabel: "Speakers",
          title: "Featured Speakers",
          body:
            "Speaker One — Title, Company\nSpeaker Two — Title, Company\nSpeaker Three — Title, Company",
          backgroundStyle: "subtle",
          contentWidth: "xl",
          paddingY: "md",
          textAlign: "left",
          divider: "top",
        }

      case "resources":
        return {
          id,
          type: "content",
          visible: true,
          adminLabel: "Resources",
          title: "Resources",
          body:
            "Download slides\nView agenda PDF\nAccess support materials\nReview follow-up links",
          backgroundStyle: "panel",
          contentWidth: "lg",
          paddingY: "md",
          textAlign: "left",
          divider: "top",
        }

      case "cta":
        return {
          id,
          type: "content",
          visible: true,
          adminLabel: "CTA",
          title: "Ready to Join?",
          body: "Register now, access your materials, and join the session when it begins.",
          backgroundStyle: "subtle",
          contentWidth: "md",
          paddingY: "lg",
          textAlign: "center",
          divider: "both",
        }

      case "content":
      default: {
        const count = sections.filter((s) => s.type === "content").length + 1
        return {
          id,
          type: "content",
          visible: true,
          adminLabel: `Content ${count}`,
          title: `Content Section ${count}`,
          body: "Add content here.",
          backgroundStyle: "panel",
          contentWidth: "xl",
          paddingY: "md",
          textAlign: "left",
          divider: "none",
        }
      }
    }
  }

  function addSectionPreset(preset: SectionPreset) {
    const nextId = getNextContentId()
    const newSection = buildPresetSection(preset, nextId)

    setSections((prev) => [...prev, newSection])
    setSelectedSectionId(nextId)
    setSelectedId(null)
  }

  function addElement(elementType: AddableElementType) {
    const id = createElementId()

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
          z_index: elements.length + 10,
          props: {
            src: "https://placehold.co/800x450/png",
            alt: "Image block",
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
          z_index: elements.length + 10,
          props: {
            url: "https://example.com/sample.pdf",
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
          z_index: elements.length + 10,
          props: {
            href: "#",
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
          z_index: elements.length + 10,
          props: {},
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
          z_index: elements.length + 10,
          props: {},
        }
        break
    }

    setElements((prev) => [...prev, nextElement])
    setSelectedId(id)
    setSelectedSectionId(null)
    if (elementType === "text" || elementType === "button" || elementType === "pdf") {
      setEditingElementId(id)
    }
  }

  function moveSelectedSection(direction: "up" | "down") {
    if (!selectedSectionId) return

    setSections((prev) => {
      const currentIndex = prev.findIndex((section) => section.id === selectedSectionId)
      if (currentIndex === -1) return prev

      const current = prev[currentIndex]
      if (!current || current.type !== "content") return prev

      const hero = prev.find((section) => section.type === "hero") ?? null
      const contentSections = prev.filter((section) => section.type === "content")
      const contentIndex = contentSections.findIndex((section) => section.id === selectedSectionId)
      if (contentIndex === -1) return prev

      const targetContentIndex =
        direction === "up" ? contentIndex - 1 : contentIndex + 1

      if (targetContentIndex < 0 || targetContentIndex >= contentSections.length) {
        return prev
      }

      const reorderedContent = [...contentSections]
      const [moved] = reorderedContent.splice(contentIndex, 1)
      reorderedContent.splice(targetContentIndex, 0, moved)

      return hero ? [hero, ...reorderedContent] : reorderedContent
    })
  }

  function deleteSelectedSection() {
    if (!selectedSectionId) return

    const selected = sections.find((section) => section.id === selectedSectionId)
    if (!selected || selected.type !== "content") return

    const contentOnly = sections.filter((section) => section.type === "content")
    const currentContentIndex = contentOnly.findIndex(
      (section) => section.id === selectedSectionId
    )

    const remainingSections = sections.filter((section) => section.id !== selectedSectionId)
    const remainingContent = remainingSections.filter((section) => section.type === "content")

    let nextSelectedSectionId: string | null = null

    if (remainingContent.length > 0) {
      const fallbackIndex = Math.min(currentContentIndex, remainingContent.length - 1)
      nextSelectedSectionId = remainingContent[fallbackIndex]?.id ?? null
    }

    setSections(remainingSections)
    setSelectedSectionId(nextSelectedSectionId)
    setSelectedId(null)
  }

  function duplicateSelectedSection() {
    if (!selectedSectionId) return

    const selected = sections.find((section) => section.id === selectedSectionId)
    if (!selected || selected.type !== "content") return

    const selectedIndex = sections.findIndex((section) => section.id === selectedSectionId)
    if (selectedIndex === -1) return

    const contentCount = sections.filter((section) => section.type === "content").length
    const nextId = `content-${contentCount + 1}`

    const duplicatedSection: EventPageSection = {
      ...selected,
      id: nextId,
      adminLabel: selected.adminLabel
        ? `${selected.adminLabel} Copy`
        : "Content Copy",
      title: selected.title ? `${selected.title} Copy` : "Content Section Copy",
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

    setElements((prev) => prev.filter((el) => el.id !== selectedId))
    setSelectedId(null)
    setEditingElementId(null)
  }

  function duplicateSelectedElement() {
    if (!selectedId) return

    const selected = elements.find((el) => el.id === selectedId)
    if (!selected) return

    const nextId = createElementId()
    const duplicated: EditorElement = {
      ...selected,
      id: nextId,
      x: snapToGrid(selected.x + 24),
      y: snapToGrid(selected.y + 24),
      z_index: (selected.z_index ?? 1) + 1,
      props: { ...(selected.props ?? {}) },
    }

    setElements((prev) => [...prev, duplicated])
    setSelectedId(nextId)
    setSelectedSectionId(null)
  }

  function handleSectionDragStart(sectionId: string) {
    const section = sections.find((s) => s.id === sectionId)
    if (!section || section.type !== "content") return
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
    if (targetSection.type !== "content" || draggingSection.type !== "content") return

    setDragOverSectionId(sectionId)
  }

  function handleSectionDrop(sectionId: string) {
    if (!draggingSectionId || draggingSectionId === sectionId) {
      setDraggingSectionId(null)
      setDragOverSectionId(null)
      return
    }

    setSections((prev) => {
      const hero = prev.find((section) => section.type === "hero") ?? null
      const contentOnly = prev.filter((section) => section.type === "content")

      const fromIndex = contentOnly.findIndex((section) => section.id === draggingSectionId)
      const toIndex = contentOnly.findIndex((section) => section.id === sectionId)

      if (fromIndex === -1 || toIndex === -1) return prev

      const reordered = [...contentOnly]
      const [moved] = reordered.splice(fromIndex, 1)
      reordered.splice(toIndex, 0, moved)

      return hero ? [hero, ...reordered] : reordered
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

  const contentSections = sections.filter((section) => section.type === "content")
  const selectedContentIndex =
    selectedSection?.type === "content"
      ? contentSections.findIndex((section) => section.id === selectedSection.id)
      : -1

  const canMoveUp =
    selectedSection?.type === "content" && selectedContentIndex > 0

  const canMoveDown =
    selectedSection?.type === "content" &&
    selectedContentIndex > -1 &&
    selectedContentIndex < contentSections.length - 1

  const canDeleteSection = selectedSection?.type === "content"
  const canDuplicateSection = selectedSection?.type === "content"
  const canDeleteElement = Boolean(selectedElement)
  const canDuplicateElement = Boolean(selectedElement)

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-white/40">
              Page Editor Preview
            </div>
            <h1 className="mt-1 text-2xl font-bold">Event Page</h1>
          </div>

          <button
            onClick={() => setIsEditing((v) => !v)}
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950"
          >
            {isEditing ? "Close Editor" : "Edit Page"}
          </button>
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
                <div
                  className="mt-8 relative min-h-[900px] w-full overflow-hidden rounded-2xl border border-white/10 bg-black"
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
                  />

                  {elements.map((el) => {
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
                          e.stopPropagation()
                          setSelectedId(el.id)
                          setSelectedSectionId(null)
                        }}
                        className={`absolute overflow-hidden rounded-xl shadow-lg ${
                          isEditing ? "cursor-move" : "cursor-default"
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
                                    commitInlineElementEdit(el.id, (e.target as HTMLTextAreaElement).value)
                                  }
                                  if (e.key === "Escape") {
                                    setEditingElementId(null)
                                  }
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
                                    commitInlineElementEdit(el.id, (e.target as HTMLInputElement).value)
                                  }
                                  if (e.key === "Escape") {
                                    setEditingElementId(null)
                                  }
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

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="mb-3 text-sm font-semibold">Section Templates</div>

              <div className="grid grid-cols-1 gap-3">
                {[
                  {
                    key: "content" as SectionPreset,
                    title: "Content",
                    body: "Generic text/content section.",
                  },
                  {
                    key: "agenda" as SectionPreset,
                    title: "Agenda",
                    body: "Agenda/timeline layout starter.",
                  },
                  {
                    key: "speakers" as SectionPreset,
                    title: "Speakers",
                    body: "Speaker roster starter section.",
                  },
                  {
                    key: "resources" as SectionPreset,
                    title: "Resources",
                    body: "Downloads, PDFs, and links.",
                  },
                  {
                    key: "cta" as SectionPreset,
                    title: "CTA",
                    body: "Centered call-to-action section.",
                  },
                ].map((preset) => (
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
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="mb-3 text-sm font-semibold">Add Element</div>

              <div className="grid grid-cols-2 gap-3">
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
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="mb-3 text-sm font-semibold">Sections</div>

              <div className="space-y-2">
                {sections.map((section) => {
                  const isActive = selectedSectionId === section.id
                  const isDragging = draggingSectionId === section.id
                  const isDragOver = dragOverSectionId === section.id
                  const label =
                    section.adminLabel ||
                    (section.type === "hero" ? "Hero Section" : "Content Section")

                  return (
                    <button
                      key={section.id}
                      draggable={section.type === "content"}
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
                          {section.type === "content" ? "⋮⋮" : ""}
                        </div>

                        <div>
                          <div className="text-sm font-medium">{label}</div>
                          <div className="mt-1 text-xs text-white/45">
                            {section.type === "hero" ? "Hero section" : "Content section"}
                          </div>
                        </div>
                      </div>

                      <div
                        className={`text-[10px] uppercase tracking-[0.18em] ${
                          section.visible === false ? "text-red-300/80" : "text-emerald-300/80"
                        }`}
                      >
                        {section.visible === false ? "Hidden" : "Visible"}
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="mt-3 text-xs text-white/35">
                Drag content sections to reorder. Hero stays pinned to the top.
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div>
                <div className="text-sm font-semibold">
                  {selectedElement
                    ? "Selected Element"
                    : selectedSection
                    ? selectedSection.adminLabel ||
                      (selectedSection.type === "hero" ? "Hero Section" : "Content Section")
                    : "Editor"}
                </div>

                <div className="mt-1 text-xs text-white/45">
                  {selectedElement
                    ? `${selectedElement.element_type ?? "text"} element`
                    : selectedSection
                    ? selectedSection.type === "hero"
                      ? "Hero section"
                      : "Content section"
                    : "Select a section or canvas element"}
                </div>
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
                      Duplicate Element
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
                      Delete Element
                    </button>
                  </div>

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

                  <div className="text-xs text-white/40">
                    Tip: double-click text, button, or PDF blocks on the canvas to edit inline.
                  </div>
                </div>
              ) : selectedSection ? (
                <div className="mt-4 space-y-4">
                  {selectedSection.type === "content" && (
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

                  <div>
                    <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                      Admin Label
                    </div>
                    <input
                      value={selectedSection.adminLabel ?? ""}
                      onChange={(e) =>
                        updateSection(selectedSection.id, { adminLabel: e.target.value })
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"
                      placeholder="Internal section name"
                    />
                  </div>

                  <label className="flex items-center gap-2 text-sm text-white/80">
                    <input
                      type="checkbox"
                      checked={selectedSection.visible !== false}
                      onChange={(e) =>
                        updateSection(selectedSection.id, {
                          visible: e.target.checked,
                        })
                      }
                    />
                    Visible
                  </label>

                  <div>
                    <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                      {selectedSection.type === "hero" ? "Hero Title" : "Content Title"}
                    </div>
                    <input
                      value={selectedSection.title ?? ""}
                      onChange={(e) =>
                        updateSection(selectedSection.id, { title: e.target.value })
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"
                    />
                  </div>

                  <div>
                    <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                      {selectedSection.type === "hero" ? "Hero Body" : "Content Body"}
                    </div>
                    <textarea
                      value={selectedSection.body ?? ""}
                      onChange={(e) =>
                        updateSection(selectedSection.id, { body: e.target.value })
                      }
                      className="min-h-[120px] w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                        Background
                      </div>
                      <select
                        value={selectedSection.backgroundStyle ?? "transparent"}
                        onChange={(e) =>
                          updateSection(selectedSection.id, {
                            backgroundStyle: e.target.value as
                              | "transparent"
                              | "subtle"
                              | "panel",
                          })
                        }
                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"
                      >
                        <option value="transparent">Transparent</option>
                        <option value="subtle">Subtle</option>
                        <option value="panel">Panel</option>
                      </select>
                    </div>

                    <div>
                      <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                        Width
                      </div>
                      <select
                        value={selectedSection.contentWidth ?? "xl"}
                        onChange={(e) =>
                          updateSection(selectedSection.id, {
                            contentWidth: e.target.value as
                              | "md"
                              | "lg"
                              | "xl"
                              | "full",
                          })
                        }
                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"
                      >
                        <option value="md">Medium</option>
                        <option value="lg">Large</option>
                        <option value="xl">Extra Large</option>
                        <option value="full">Full</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                        Vertical Padding
                      </div>
                      <select
                        value={selectedSection.paddingY ?? "md"}
                        onChange={(e) =>
                          updateSection(selectedSection.id, {
                            paddingY: e.target.value as "sm" | "md" | "lg",
                          })
                        }
                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"
                      >
                        <option value="sm">Small</option>
                        <option value="md">Medium</option>
                        <option value="lg">Large</option>
                      </select>
                    </div>

                    <div>
                      <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                        Text Align
                      </div>
                      <select
                        value={selectedSection.textAlign ?? "left"}
                        onChange={(e) =>
                          updateSection(selectedSection.id, {
                            textAlign: e.target.value as "left" | "center",
                          })
                        }
                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                      Divider
                    </div>
                    <select
                      value={selectedSection.divider ?? "none"}
                      onChange={(e) =>
                        updateSection(selectedSection.id, {
                          divider: e.target.value as "none" | "top" | "bottom" | "both",
                        })
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"
                    >
                      <option value="none">None</option>
                      <option value="top">Top</option>
                      <option value="bottom">Bottom</option>
                      <option value="both">Top + Bottom</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="mt-3 text-sm text-white/55">
                  Click a section in the list or an element on the canvas to edit it.
                </div>
              )}
            </div>

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