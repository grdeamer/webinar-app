"use client"

import { useParams, usePathname, useSearchParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import EditorEventPageRenderer from "@/components/page-editor/EditorEventPageRenderer"
import { SYSTEM_COMPONENTS } from "@/lib/page-editor/systemComponentRegistry"
import {
  SECTION_TEMPLATE_OPTIONS,
  createDefaultEventHomeSections,
  getDefaultSectionConfig,
  getSectionRegistryItem,
} from "@/lib/page-editor/sectionRegistry"
import type {
  SectionConfig,
  SectionType,
  SectionBlock,
  SystemComponentKey,
  EventTheme,
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
  blocks?: SectionBlock[]
}

type AddableElementType = "text" | "image" | "pdf" | "video" | "button" | "spacer"

const GRID_SIZE = 8

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

const PAGE_OPTIONS = [
  { label: "Home", value: "event_home" },
  { label: "Lobby", value: "lobby" },
  { label: "Agenda", value: "agenda" },
  { label: "Sessions", value: "sessions" },
  { label: "Breakouts", value: "breakouts" },
  { label: "Sponsors", value: "sponsors" },
  { label: "Engage", value: "chat" },
  { label: "Networking", value: "networking" },
  { label: "On-Demand", value: "on_demand" },
] as const

function snapToGrid(value: number) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE
}

function createElementId() {
  return `el-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function createSystemBlock(componentKey: SystemComponentKey): SectionBlock {
  return {
    id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: "system_component",
    props: {
      componentKey,
      containerStyle: "panel",
    },
  }
}

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "").trim()

  if (clean.length === 3) {
    const expanded = clean
      .split("")
      .map((c) => c + c)
      .join("")
    const num = parseInt(expanded, 16)
    const r = (num >> 16) & 255
    const g = (num >> 8) & 255
    const b = num & 255
    return `${r}, ${g}, ${b}`
  }

  if (clean.length === 6) {
    const num = parseInt(clean, 16)
    const r = (num >> 16) & 255
    const g = (num >> 8) & 255
    const b = num & 255
    return `${r}, ${g}, ${b}`
  }

  return "251, 191, 36"
}

function toTitleCase(value: string) {
  return value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function getSafeDefaultSectionConfig(type: string): SectionConfig {
  try {
    return getDefaultSectionConfig(type as SectionType)
  } catch {
    return getDefaultSectionConfig("content")
  }
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
function getDefaultSections(
  pageKey: string,
  eventInfo: {
    title: string
    description?: string | null
  }
): EventPageSection[] {
  switch (pageKey) {
    case "sessions":
      return [
        {
          id: "hero",
          type: "hero",
          config: {
            ...getSafeDefaultSectionConfig("hero"),
            adminLabel: "Sessions Hero",
            title: `${eventInfo.title} — Sessions`,
            body: "View the sessions available for this event.",
          },
          blocks: [],
        },
        {
          id: "sessions-list",
          type: "content",
          config: {
            ...getSafeDefaultSectionConfig("content"),
            adminLabel: "Sessions List",
            title: "My Sessions",
            body: "Session cards and access actions appear here.",
          },
          blocks: [createSystemBlock("sessions_list")],
        },
      ]

    case "agenda":
      return [
        {
          id: "hero",
          type: "hero",
          config: {
            ...getSafeDefaultSectionConfig("hero"),
            adminLabel: "Agenda Hero",
            title: `${eventInfo.title} — Agenda`,
            body: "Browse the event schedule.",
          },
          blocks: [],
        },
        {
          id: "agenda",
          type: "content",
          config: {
            ...getSafeDefaultSectionConfig("content"),
            adminLabel: "Agenda",
            title: "Schedule",
            body: "Agenda items appear here.",
          },
          blocks: [createSystemBlock("agenda")],
        },
      ]

    default:
      return createDefaultEventHomeSections({
        title: eventInfo.title,
        description: eventInfo.description ?? null,
      })
  }
}

function normalizeSectionIds(inputSections: EventPageSection[]) {
  const used = new Set<string>()
  let heroSeen = false
  let fallbackCount = 0

  return inputSections.flatMap((section) => {
    if (section.type === "hero") {
      if (heroSeen) return []
      heroSeen = true
      used.add("hero")
      return [{ ...section, id: "hero" }]
    }

    const rawId =
      typeof section.id === "string" && section.id.trim().length > 0
        ? section.id.trim()
        : section.config?.adminLabel
        ? String(section.config.adminLabel)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
        : ""

    let nextId = rawId || `${section.type}-${fallbackCount + 1}`

    while (!nextId || used.has(nextId)) {
      fallbackCount += 1
      nextId = `${section.type}-${fallbackCount}`
    }

    used.add(nextId)

    return [{ ...section, id: nextId }]
  })
}

function normalizeSections(inputSections: any[]): EventPageSection[] {
  return normalizeSectionIds(
    inputSections.map((section: any) => ({
      id: String(
        section.id ?? `section-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      ),
      type: String(section.type ?? "content") as SectionType,
      config:
        section.config && typeof section.config === "object"
          ? section.config
          : getSafeDefaultSectionConfig(String(section.type ?? "content")),
      blocks: Array.isArray(section.blocks) ? section.blocks : [],
    }))
  )
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

function getTextElementStyle(el: EditorElement) {
  return {
    padding: `${Number(el.props?.paddingY ?? 8)}px ${Number(el.props?.paddingX ?? 16)}px`,
    color: String(el.props?.textColor ?? "#111111"),
    backgroundColor: el.props?.backgroundColor
      ? `rgba(${hexToRgb(String(el.props.backgroundColor))}, ${Number(
          el.props?.backgroundOpacity ?? 0.9
        )})`
      : "rgba(251, 191, 36, 0.9)",
    fontSize: `${Number(el.props?.fontSize ?? 14)}px`,
    fontWeight: Number(el.props?.fontWeight ?? 500),
    fontFamily: String(el.props?.fontFamily ?? "inherit"),
    borderRadius: `${Number(el.props?.borderRadius ?? 12)}px`,
    lineHeight: 1.4,
  }
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

function EditorVideoPreview({
  url,
  sourceType = "mp4",
  className = "",
}: {
  url: string
  sourceType?: string
  className?: string
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    let destroyed = false
    let hlsInstance: any = null

    async function setup() {
      const video = videoRef.current
      if (!video || !url) return

      if (sourceType !== "hls") {
        video.src = url
        video.load()
        return
      }

      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = url
        video.load()
        return
      }

      try {
        const mod = await import("hls.js")
        if (destroyed) return

        const Hls = mod.default
        if (Hls.isSupported()) {
          hlsInstance = new Hls()
          hlsInstance.loadSource(url)
          hlsInstance.attachMedia(video)
        } else {
          video.src = url
          video.load()
        }
      } catch {
        video.src = url
        video.load()
      }
    }

    void setup()

    return () => {
      destroyed = true
      if (hlsInstance) hlsInstance.destroy()
    }
  }, [url, sourceType])

  return <video ref={videoRef} className={className} muted playsInline autoPlay />
}

function EditorTrimPreview({
  url,
  sourceType = "mp4",
  trimStart = 0,
  trimEnd = 0,
  onDuration,
}: {
  url: string
  sourceType?: string
  trimStart?: number
  trimEnd?: number
  onDuration?: (duration: number) => void
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    let destroyed = false
    let hlsInstance: any = null

    async function setup() {
      const video = videoRef.current
      if (!video || !url) return

      if (sourceType !== "hls") {
        video.src = url
        video.load()
        return
      }

      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = url
        video.load()
        return
      }

      try {
        const mod = await import("hls.js")
        if (destroyed) return

        const Hls = mod.default
        if (Hls.isSupported()) {
          hlsInstance = new Hls()
          hlsInstance.loadSource(url)
          hlsInstance.attachMedia(video)
        } else {
          video.src = url
          video.load()
        }
      } catch {
        video.src = url
        video.load()
      }
    }

    void setup()

    return () => {
      destroyed = true
      if (hlsInstance) hlsInstance.destroy()
    }
  }, [url, sourceType])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const startAt = trimStart > 0 ? trimStart : 0

    const handleLoadedMetadata = () => {
      if (Number.isFinite(video.duration)) {
        onDuration?.(video.duration)
      }

      try {
        video.currentTime = startAt
      } catch {}
    }

    const handleTimeUpdate = () => {
      if (trimEnd > 0 && video.currentTime >= trimEnd) {
        video.pause()
      }
    }

    video.addEventListener("loadedmetadata", handleLoadedMetadata)
    video.addEventListener("timeupdate", handleTimeUpdate)

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata)
      video.removeEventListener("timeupdate", handleTimeUpdate)
    }
  }, [trimStart, trimEnd, onDuration])

  return (
    <video
      ref={videoRef}
      controls
      playsInline
      className="w-full rounded-xl border border-white/10 bg-black"
    />
  )
}

export default function AdminEventPageEditorPreview() {
const params = useParams()
const pathname = usePathname()
const searchParams = useSearchParams()
const slug = String(params.slug ?? "")
const isEmbedded =
  pathname.startsWith("/embed/") || searchParams.get("embed") === "1"

  const eventInfo = {
    title: slug ? slug.replace(/-/g, " ") : "Event Preview",
    description: "Renderer mode is now active inside the Page Editor.",
  }

  const [isEditing, setIsEditing] = useState(isEmbedded)
  const [loading, setLoading] = useState(true)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [draggingSectionId, setDraggingSectionId] = useState<string | null>(null)
  const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(null)
  const [editingElementId, setEditingElementId] = useState<string | null>(null)
  const [isMobilePreview, setIsMobilePreview] = useState(false)
  const [selectedPageKey, setSelectedPageKey] = useState<string>("event_home")
  const [sectionTemplatesOpen, setSectionTemplatesOpen] = useState(true)
  const [addElementOpen, setAddElementOpen] = useState(true)
  const [sectionsListOpen, setSectionsListOpen] = useState(true)
  const [editorDetailsOpen, setEditorDetailsOpen] = useState(true)

  const [elements, setElements] = useState<EditorElement[]>([])
  const [sections, setSections] = useState<EventPageSection[]>(
  getDefaultSections(selectedPageKey, eventInfo)
)
  const [templates, setTemplates] = useState<any[]>([])
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [generalSession, setGeneralSession] = useState<{
    title?: string | null
    sourceType?: string | null
    mp4Url?: string | null
    hlsUrl?: string | null
    playbackUrl?: string | null
  } | null>(null)

  const [eventTheme, setEventTheme] = useState<EventTheme>({
    pageBackgroundColor: "#020617",
    panelBackgroundColor: "#0f172a",
    panelBorderColor: "rgba(255,255,255,0.10)",
    textColor: "#ffffff",
    gradientColorA: "#0f172a",
    gradientColorB: "#1d4ed8",
    gradientAngle: "135deg",
  })

  const [selectionBox, setSelectionBox] = useState<{
    startX: number
    startY: number
    currentX: number
    currentY: number
  } | null>(null)

  const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false)

  const dragRef = useRef<{
    id: string
    offsetX: number
    offsetY: number
  } | null>(null)

  const groupDragRef = useRef<{
    ids: string[]
    startPointerX: number
    startPointerY: number
    startPositions: Record<string, { x: number; y: number }>
  } | null>(null)

  const canvasRef = useRef<HTMLDivElement | null>(null)
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

const res = await fetch(
  `/api/admin/page-editor/event/${slug}/elements?pageKey=${selectedPageKey}`,
  {
    cache: "no-store",
  }
)

      const data: any = await res.json().catch((): null => null)

      if (!res.ok) {
        setElements(getFallbackElements())
        setSections(normalizeSections(getDefaultSections(selectedPageKey, eventInfo)))
        setHasUnsavedChanges(false)
        setLoading(false)
        return
      }

      const rows = Array.isArray(data?.elements) ? data.elements : []
      const loadedSections = Array.isArray(data?.sections) ? data.sections : []
      const loadedTheme =
  data?.eventTheme && typeof data.eventTheme === "object" ? data.eventTheme : null

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
        setSections(normalizeSections(loadedSections))
      } else {
        setSections(normalizeSections(getDefaultSections(selectedPageKey, eventInfo)))
      }

      setHasUnsavedChanges(false)
      setLoading(false)
    }

    void loadElements()
}, [slug, selectedPageKey])

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

    void loadTemplates()
  }, [])

  useEffect(() => {
    if (loading) return
    if (!isEditing) return
    if (!hasUnsavedChanges) return

    const timeout = window.setTimeout(() => {
      void saveLayout(true)
    }, 1200)

    return () => window.clearTimeout(timeout)
  }, [elements, sections, isEditing, loading, hasUnsavedChanges])

  useEffect(() => {
    async function loadGeneralSession() {
      try {
        const res = await fetch(`/api/admin/events/${slug}/general-session`, {
          cache: "no-store",
        })

        const data = (await res.json().catch((_: unknown): null => null)) as any

        if (!res.ok || !data) return

        setGeneralSession({
          title: data.title ?? null,
          sourceType: data.sourceType ?? "mp4",
          mp4Url: data.mp4Url ?? null,
          hlsUrl: data.hlsUrl ?? null,
          playbackUrl: data.playbackUrl ?? null,
        })
      } catch {
        console.error("Failed to load general session")
      }
    }

    if (slug) {
      void loadGeneralSession()
    }
}, [slug, selectedPageKey])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const tag = target?.tagName?.toLowerCase()
      const isTyping = tag === "input" || tag === "textarea" || target?.isContentEditable

      if (isTyping) return
      if (!isEditing) return

      if (e.key === "Backspace" || e.key === "Delete") {
        if (selectedId || selectedIds.length > 0) {
          e.preventDefault()
          deleteSelectedElement()
        }
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [isEditing, selectedId, selectedIds])

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
    if (groupDragRef.current) {
      const { ids, startPointerX, startPointerY, startPositions } = groupDragRef.current

      const dx = snapToGrid(e.clientX - startPointerX)
      const dy = snapToGrid(e.clientY - startPointerY)

      if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
        isDraggingRef.current = true
      }

      setHasUnsavedChanges(true)

      setElements((prev) =>
        prev.map((el) => {
          if (!ids.includes(el.id)) return el

          const start = startPositions[el.id]
          if (!start) return el

          return {
            ...el,
            x: Math.max(0, start.x + dx),
            y: Math.max(0, start.y + dy),
          }
        })
      )

      return
    }

    if (resizeRef.current) {
      const { id, startX, startY, startWidth, startHeight } = resizeRef.current

      const nextWidth = snapToGrid(Math.max(96, startWidth + (e.clientX - startX)))
      const nextHeight = snapToGrid(Math.max(32, startHeight + (e.clientY - startY)))

      setHasUnsavedChanges(true)
      setElements((prev) =>
        prev.map((el) => (el.id === id ? { ...el, width: nextWidth, height: nextHeight } : el))
      )

      return
    }

    if (!dragRef.current) return

    const { id, offsetX, offsetY } = dragRef.current
    const currentEl = elements.find((el) => el.id === id)
    if (!currentEl) return

    const movedX = Math.abs(e.clientX - (offsetX + currentEl.x))
    const movedY = Math.abs(e.clientY - (offsetY + currentEl.y))

    if (movedX > 4 || movedY > 4) {
      isDraggingRef.current = true
    }

    const nextX = snapToGrid(Math.max(0, e.clientX - offsetX))
    const nextY = snapToGrid(Math.max(0, e.clientY - offsetY))

    setHasUnsavedChanges(true)
    setElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, x: nextX, y: nextY } : el))
    )
  }

  function stopInteractions() {
    dragRef.current = null
    groupDragRef.current = null
    resizeRef.current = null

    setTimeout(() => {
      isDraggingRef.current = false
    }, 50)
  }

  async function uploadMediaFile(file: File) {
    const formData = new FormData()
    formData.append("file", file)

    const res = await fetch("/api/admin/page-editor/upload-media", {
      method: "POST",
      body: formData,
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data?.error || "Upload failed")
    }

    return data
  }

  async function saveLayout(isAutoSave = false) {
    setSaveMessage(isAutoSave ? "Auto-saving..." : "Saving...")

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

const res = await fetch(
  `/api/admin/page-editor/event/${slug}/elements?pageKey=${selectedPageKey}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      elements: payload,
      sections,
      eventTheme,
    }),
  }
)

    const data: any = await res.json().catch((): null => null)

    if (!res.ok) {
      setSaveMessage(data?.error || "Failed to save")
      return
    }

    setSaveMessage(isAutoSave ? "Auto-saved" : "Saved")
    setHasUnsavedChanges(false)

    if (isAutoSave) {
      window.setTimeout(() => {
        setSaveMessage((current) => (current === "Auto-saved" ? null : current))
      }, 1800)
    }
  }

  function updateSectionConfig(id: string, patch: Partial<SectionConfig>) {
    setHasUnsavedChanges(true)
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
    setHasUnsavedChanges(true)
    setElements((prev) => prev.map((el) => (el.id === id ? { ...el, ...patch } : el)))
  }

  function updateElementProps(id: string, patch: Record<string, unknown>) {
    setHasUnsavedChanges(true)
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

    setHasUnsavedChanges(true)
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

    setHasUnsavedChanges(true)
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

  function addBlockToSection(sectionId: string, block: SectionBlock) {
    setHasUnsavedChanges(true)
    setSections((prev) =>
      prev.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              blocks: [...(section.blocks ?? []), block],
            }
          : section
      )
    )

    setSelectedSectionId(sectionId)
    setSelectedBlockId(block.id)
    setSelectedId(null)
    setSelectedIds([])
    setEditingElementId(null)
  }

  function selectBlock(sectionId: string, blockId: string) {
    setSelectedSectionId(sectionId)
    setSelectedBlockId(blockId)
    setSelectedId(null)
    setSelectedIds([])
    setEditingElementId(null)
  }

  function updateSelectedBlock(nextBlock: SectionBlock) {
    if (!selectedSectionId || !selectedBlockId) return

    setHasUnsavedChanges(true)
    setSections((prev) =>
      prev.map((section) =>
        section.id === selectedSectionId
          ? {
              ...section,
              blocks: (section.blocks ?? []).map((block) =>
                block.id === selectedBlockId ? nextBlock : block
              ),
            }
          : section
      )
    )
  }

  function updateSelectedBlockProps(
    nextProps: Partial<Extract<SectionBlock, { type: "rich_text" }>["props"]> |
      Partial<Extract<SectionBlock, { type: "system_component" }>["props"]>
  ) {
    if (!selectedBlock) return

    if (selectedBlock.type === "rich_text") {
      updateSelectedBlock({
        ...selectedBlock,
        props: {
          ...selectedBlock.props,
          ...nextProps,
        },
      })
      return
    }

    updateSelectedBlock({
      ...selectedBlock,
      props: {
        ...selectedBlock.props,
        ...nextProps,
      },
    })
  }

  function moveSelectedBlock(direction: "up" | "down") {
    if (!selectedSectionId || !selectedBlockId) return

    setHasUnsavedChanges(true)
    setSections((prev) =>
      prev.map((section) => {
        if (section.id !== selectedSectionId) return section

        const blocks = [...(section.blocks ?? [])]
        const index = blocks.findIndex((block) => block.id === selectedBlockId)
        if (index === -1) return section

        const targetIndex = direction === "up" ? index - 1 : index + 1
        if (targetIndex < 0 || targetIndex >= blocks.length) return section

        const [moved] = blocks.splice(index, 1)
        blocks.splice(targetIndex, 0, moved)

        return {
          ...section,
          blocks,
        }
      })
    )
  }

  function deleteSelectedBlock() {
    if (!selectedSectionId || !selectedBlockId) return

    setHasUnsavedChanges(true)

    let nextSelectedBlockId: string | null = null

    setSections((prev) =>
      prev.map((section) => {
        if (section.id !== selectedSectionId) return section

        const blocks = [...(section.blocks ?? [])]
        const index = blocks.findIndex((block) => block.id === selectedBlockId)
        if (index === -1) return section

        blocks.splice(index, 1)
        nextSelectedBlockId = blocks[Math.max(0, index - 1)]?.id ?? blocks[0]?.id ?? null

        return {
          ...section,
          blocks,
        }
      })
    )

    setSelectedBlockId(nextSelectedBlockId)
  }

  function addSystemBlockToSelectedSection(componentKey: SystemComponentKey) {
    if (!selectedSectionId) return
    addBlockToSection(selectedSectionId, createSystemBlock(componentKey))
  }

  function addSectionPreset(type: SectionType) {
    if (type === "hero") {
      const existingHero = sections.find((section) => section.type === "hero")
      if (existingHero) {
        setSelectedSectionId(existingHero.id)
        setSelectedId(null)
        return
      }
    }

    const nextId =
      type === "hero"
        ? "hero"
        : normalizeSectionIds([
            ...sections,
            {
              id: "temp",
              type,
              config: getSafeDefaultSectionConfig(type),
              blocks: [],
            },
          ]).at(-1)?.id ?? getNextContentId()

    setHasUnsavedChanges(true)
    setSections((prev) => [
      ...prev,
      {
        id: nextId,
        type,
        config: getSafeDefaultSectionConfig(type),
        blocks: [],
      },
    ])

    setSelectedSectionId(nextId)
    setSelectedBlockId(null)
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
            imageFit: "cover",
            imagePosition: "center",
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

      case "video":
        nextElement = {
          id,
          element_type: "video",
          content: "Video Block",
          x: 96,
          y: 120,
          width: 420,
          height: 236,
          z_index: highestZ + 1,
          props: {
            url: "",
            sourceType: "mp4",
            useGeneralSession: false,
            hideOnMobile: false,
            autoplay: false,
            controls: true,
            loop: false,
            isLive: false,
            posterUrl: "",
            showPosterOnCard: true,
            playOnHover: true,
            trimStart: 0,
            trimEnd: 0,
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
            backgroundColor: "#facc15",
            backgroundOpacity: 1,
            textColor: "#000000",
            fontSize: 14,
            fontWeight: 500,
            fontFamily: "inherit",
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
            backgroundColor: "#2563eb",
            backgroundOpacity: 0.9,
            textColor: "#ffffff",
            fontSize: 22,
            fontWeight: 700,
            fontFamily: "Arial, sans-serif",
          },
        }
        break
    }

    setHasUnsavedChanges(true)
    setElements((prev) => normalizeZIndexes([...prev, nextElement]))
    setSelectedId(id)
    setSelectedSectionId(null)
    setSelectedBlockId(null)

    if (elementType === "text" || elementType === "button" || elementType === "pdf") {
      setEditingElementId(id)
    }
  }

  function moveSelectedSection(direction: "up" | "down") {
    if (!selectedSectionId) return

    setHasUnsavedChanges(true)
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

      return normalizeSectionIds([...heroSections, ...reordered])
    })
  }

  function deleteSelectedSection() {
    if (!selectedSectionId) return

    const selected = sections.find((section) => section.id === selectedSectionId)
    if (!selected || selected.type === "hero") return

    const remainingSections = sections.filter((section) => section.id !== selectedSectionId)
    const remainingContent = remainingSections.filter((section) => section.type !== "hero")

    setHasUnsavedChanges(true)
    setSections(normalizeSectionIds(remainingSections))
    setSelectedSectionId(remainingContent[0]?.id ?? null)
    setSelectedBlockId(null)
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
      blocks: Array.isArray(selected.blocks) ? [...selected.blocks] : [],
    }

    setHasUnsavedChanges(true)
    setSections((prev) => {
      const next = [...prev]
      next.splice(selectedIndex + 1, 0, duplicatedSection)
      return normalizeSectionIds(next)
    })

    setSelectedSectionId(nextId)
    setSelectedBlockId(null)
    setSelectedId(null)
  }

  function deleteSelectedElement() {
    const idsToDelete = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : []

    if (idsToDelete.length === 0) return

    setHasUnsavedChanges(true)
    setElements((prev) => normalizeZIndexes(prev.filter((el) => !idsToDelete.includes(el.id))))

    setSelectedId(null)
    setSelectedIds([])
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

    setHasUnsavedChanges(true)
    setElements((prev) => normalizeZIndexes([...prev, duplicated]))
    setSelectedId(nextId)
    setSelectedSectionId(null)
    setSelectedBlockId(null)
  }

  function handleSectionDragStart(sectionId: string) {
    const section = sections.find((s) => s.id === sectionId)
    if (!section || section.type === "hero") return

    setDraggingSectionId(sectionId)
    setDragOverSectionId(null)
    setSelectedSectionId(sectionId)
    setSelectedBlockId(null)
    setSelectedId(null)
  }

  function handleSectionDragOver(e: React.DragEvent<HTMLElement>, sectionId: string) {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = "move"

    if (!draggingSectionId || draggingSectionId === sectionId) return

    const targetSection = sections.find((s) => s.id === sectionId)
    const draggingSection = sections.find((s) => s.id === draggingSectionId)

    if (!targetSection || !draggingSection) return
    if (targetSection.type === "hero" || draggingSection.type === "hero") return

    setDragOverSectionId(sectionId)
  }

  function handleSectionDrop(e: React.DragEvent<HTMLElement>, sectionId: string) {
    e.preventDefault()
    e.stopPropagation()

    const droppedId = e.dataTransfer.getData("text/plain") || draggingSectionId

    if (!droppedId || droppedId === sectionId) {
      setDraggingSectionId(null)
      setDragOverSectionId(null)
      return
    }

    setSections((prev) => {
      const heroSections = prev.filter((section) => section.type === "hero")
      const contentOnly = prev.filter((section) => section.type !== "hero")

      const fromIndex = contentOnly.findIndex((section) => section.id === droppedId)
      const toIndex = contentOnly.findIndex((section) => section.id === sectionId)

      if (fromIndex === -1 || toIndex === -1) return prev

      const reordered = [...contentOnly]
      const [moved] = reordered.splice(fromIndex, 1)
      reordered.splice(toIndex, 0, moved)

      return normalizeSectionIds([...heroSections, ...reordered])
    })

    setHasUnsavedChanges(true)
    setSelectedSectionId(droppedId)
    setSelectedBlockId(null)
    setDraggingSectionId(null)
    setDragOverSectionId(null)
    setSelectedId(null)
  }

  function handleSectionDragEnd() {
    setDraggingSectionId(null)
    setDragOverSectionId(null)
  }

  const selectedSection = sections.find((section) => section.id === selectedSectionId) ?? null
  const selectedElement = elements.find((element) => element.id === selectedId) ?? null
  const selectedBlock =
    selectedSection?.blocks?.find((block) => block.id === selectedBlockId) ?? null

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

  const selectedElementCount = selectedIds.length > 0 ? selectedIds.length : selectedElement ? 1 : 0

  const canDeleteElement = selectedElementCount > 0
  const canDuplicateElement = Boolean(selectedElement)
  const canBringForward =
    selectedElementIndex > -1 && selectedElementIndex < normalizedElements.length - 1
  const canSendBackward = selectedElementIndex > 0

 const canvasWrapClass =
  isEmbedded
    ? "w-full"
    : isMobilePreview
    ? "mx-auto w-[390px] max-w-full"
    : "w-full"
  const registryItem = selectedSection ? getSafeSectionRegistryItem(selectedSection.type) : null

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {!isEmbedded && (
        <div className="border-b border-white/10 bg-slate-950/80 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
            <div className="flex items-center gap-4">
              <div>
<div className="text-xs uppercase tracking-[0.22em] text-white/40">
  {isEmbedded ? "Experience Builder" : "Page Editor Preview"}
</div>
<h1 className="text-xl font-semibold capitalize">
  {isEmbedded ? "Experience Builder" : eventInfo.title}
</h1>
              </div>
            </div>

<div className="flex items-center gap-3">
  <select
    value={selectedPageKey}
  onChange={(e) => {
  setSelectedPageKey(e.target.value)
  setSelectedId(null)
  setSelectedIds([])
  setSelectedSectionId(null)
  setSelectedBlockId(null)
  setEditingElementId(null)
}}
    className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm"
  >
    {PAGE_OPTIONS.map((page) => (
      <option key={page.value} value={page.value}>
        {page.label}
      </option>
    ))}
  </select>

  <select
    onChange={(e) => {
      const tpl = templates.find((t) => t.id === e.target.value)
      if (!tpl) return

      setSections(
        normalizeSections(Array.isArray(tpl.sections_json) ? tpl.sections_json : [])
      )
      setElements(Array.isArray(tpl.elements_json) ? tpl.elements_json : [])
      setHasUnsavedChanges(true)
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
      )}

            <div className={`relative flex ${isEmbedded ? "min-h-screen" : "min-h-[calc(100vh-81px)]"}`}>
                <div className="flex-1 overflow-auto">
          <div className={isEmbedded ? "w-full px-0 py-0" : "mx-auto max-w-6xl px-6 py-10"}>
            <div
              className={
                isEmbedded
                  ? "min-h-screen border-0 bg-transparent p-0"
                  : "rounded-3xl border border-white/10 bg-white/5 p-10"
              }
            >
              {loading ? (
                <div className="mt-8 rounded-2xl border border-white/10 bg-black/30 p-8 text-white/60">
                  Loading editor elements...
                </div>
              ) : (
                <div className={canvasWrapClass}>
                  <div
                    ref={canvasRef}
                    className={`relative overflow-hidden bg-black ${
  isEmbedded
    ? "min-h-screen rounded-none border-0 mt-0"
    : "mt-8 min-h-[900px] rounded-2xl border border-white/10"
}`}
                    onPointerDown={(e) => {
                      if (!isEditing) return
                      if (
  (e.target as HTMLElement).closest("[data-editor-element]") ||
  (e.target as HTMLElement).closest("[data-editor-section]")
) {
  return
}

                      const rect = canvasRef.current?.getBoundingClientRect()
                      if (!rect) return

                      const startX = e.clientX - rect.left
                      const startY = e.clientY - rect.top

                      canvasRef.current?.setPointerCapture?.(e.pointerId)

                      setSelectedId(null)
                      setSelectedIds([])
                      setSelectedSectionId(null)
                      setSelectedBlockId(null)
                      setEditingElementId(null)

                      setSelectionBox({
                        startX,
                        startY,
                        currentX: startX,
                        currentY: startY,
                      })

                      setIsMarqueeSelecting(true)
                    }}
                    onPointerMove={(e) => {
                      onCanvasMove(e)

                      if (!isMarqueeSelecting || !selectionBox || !canvasRef.current) return

                      const rect = canvasRef.current.getBoundingClientRect()
                      const currentX = e.clientX - rect.left
                      const currentY = e.clientY - rect.top

                      setSelectionBox((prev) =>
                        prev
                          ? {
                              ...prev,
                              currentX,
                              currentY,
                            }
                          : null
                      )
                    }}
                    onPointerUp={(e) => {
                      stopInteractions()

                      if (!isMarqueeSelecting || !selectionBox || !canvasRef.current) {
                        canvasRef.current?.releasePointerCapture?.(e.pointerId)
                        return
                      }

                      const left = Math.min(selectionBox.startX, selectionBox.currentX)
                      const right = Math.max(selectionBox.startX, selectionBox.currentX)
                      const top = Math.min(selectionBox.startY, selectionBox.currentY)
                      const bottom = Math.max(selectionBox.startY, selectionBox.currentY)

                      const hitIds = normalizedElements
                        .filter((el) => {
                          const elLeft = el.x
                          const elTop = el.y
                          const elRight = el.x + (el.width ?? 0)
                          const elBottom = el.y + (el.height ?? 0)

                          return (
                            elRight >= left &&
                            elLeft <= right &&
                            elBottom >= top &&
                            elTop <= bottom
                          )
                        })
                        .map((el) => el.id)

                      setSelectedIds(hitIds)
                      setSelectedId(hitIds[hitIds.length - 1] ?? null)
                      setIsMarqueeSelecting(false)
                      setSelectionBox(null)

                      canvasRef.current?.releasePointerCapture?.(e.pointerId)
                    }}
                    onPointerLeave={() => {
                      stopInteractions()

                      if (isMarqueeSelecting) {
                        setIsMarqueeSelecting(false)
                        setSelectionBox(null)
                      }
                    }}
                  >
<EditorEventPageRenderer
  event={eventInfo}
  elements={normalizedElements}
  sections={sections}
  isEditing={isEditing}
  selectedSectionId={selectedSectionId}
  onSelectSection={(id: string | null) => {
    const nextSection = sections.find((section) => section.id === id) ?? null

    setSelectedSectionId(id)
    setSelectedBlockId(nextSection?.blocks?.[0]?.id ?? null)
    setSelectedId(null)
    setSelectedIds([])
    setEditingElementId(null)
    setEditorDetailsOpen(true)
  }}
  eventTheme={eventTheme}
  systemComponents={{
    live_state: (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                            <span className="text-white/80">Live status preview</span>
                          </div>
                        ),
                        stage_player: (
                          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
                            <div className="flex h-[220px] items-center justify-center text-sm text-white/45">
                              Stage player preview
                            </div>
                          </div>
                        ),
                        countdown: (
                          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                            <div className="text-xs uppercase tracking-[0.18em] text-white/40">
                              Countdown
                            </div>
                            <div className="mt-3 text-lg font-semibold text-white">
                              Next session begins soon
                            </div>
                            <div className="mt-2 text-sm text-white/60">00d 00h 00m 00s</div>
                          </div>
                        ),
                        agenda: (
                          <div className="space-y-3">
                            <div className="text-sm font-semibold text-white">Event Agenda</div>
                            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                              <div className="text-sm text-white">9:00 AM — Welcome</div>
                              <div className="mt-2 text-sm text-white/70">
                                10:00 AM — Main Session
                              </div>
                              <div className="mt-2 text-sm text-white/70">
                                11:00 AM — Breakouts
                              </div>
                            </div>
                          </div>
                        ),
                        sessions_list: (
                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                              <div className="text-sm font-semibold text-white">Session One</div>
                              <div className="mt-2 text-sm text-white/60">
                                Session card preview
                              </div>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                              <div className="text-sm font-semibold text-white">Session Two</div>
                              <div className="mt-2 text-sm text-white/60">
                                Session card preview
                              </div>
                            </div>
                          </div>
                        ),
                        speaker_cards: (
                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/70">
                              Speaker card preview
                            </div>
                            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/70">
                              Speaker card preview
                            </div>
                          </div>
                        ),
                        speaker_spotlight: (
                          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                            <div className="text-sm font-semibold text-white">
                              Featured Speaker
                            </div>
                            <div className="mt-2 text-sm text-white/60">
                              Spotlight component preview
                            </div>
                          </div>
                        ),
                        access_gate: (
                          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                            <div className="text-sm font-semibold text-white">Access Gate</div>
                            <div className="mt-2 text-sm text-white/60">
                              Email/login preview block
                            </div>
                          </div>
                        ),
                        featured_breakouts: (
                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/70">
                              Breakout preview
                            </div>
                            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/70">
                              Breakout preview
                            </div>
                          </div>
                        ),
                      }}
                    />

                    {isMarqueeSelecting && selectionBox && (
                      <div
                        className="pointer-events-none absolute border border-sky-400 bg-sky-400/15"
                        style={{
                          left: Math.min(selectionBox.startX, selectionBox.currentX),
                          top: Math.min(selectionBox.startY, selectionBox.currentY),
                          width: Math.abs(selectionBox.currentX - selectionBox.startX),
                          height: Math.abs(selectionBox.currentY - selectionBox.startY),
                          zIndex: 9999,
                        }}
                      />
                    )}

                    {isEditing && isDraggingRef.current && selectedElement && (
                      <>
                        <div
                          className="pointer-events-none absolute inset-y-0 border-l border-cyan-400/70 border-dashed"
                          style={{
                            left: selectedElement.x,
                            zIndex: 9998,
                          }}
                        />
                        <div
                          className="pointer-events-none absolute inset-x-0 border-t border-cyan-400/70 border-dashed"
                          style={{
                            top: selectedElement.y,
                            zIndex: 9998,
                          }}
                        />
                        <div
                          className="pointer-events-none absolute rounded-md bg-cyan-400/90 px-2 py-1 text-[11px] font-semibold text-slate-950"
                          style={{
                            left: selectedElement.x + 8,
                            top: Math.max(8, selectedElement.y - 28),
                            zIndex: 9999,
                          }}
                        >
                          {selectedElement.x}, {selectedElement.y}
                        </div>
                      </>
                    )}

                    {normalizedElements
                      .filter((el) => !(isMobilePreview && Boolean(el.props?.hideOnMobile)))
                      .map((el) => {
                        const isInlineEditing = editingElementId === el.id
                        const showInlineEditor =
                          isInlineEditing &&
                          (el.element_type === "text" ||
                            el.element_type === "button" ||
                            el.element_type === "pdf")

                        const videoSource =
                          el.element_type === "video"
                            ? {
                                url:
                                  el.props?.useGeneralSession && generalSession
                                    ? String(
                                        generalSession.playbackUrl ||
                                          (generalSession.sourceType === "hls"
                                            ? generalSession.hlsUrl
                                            : generalSession.mp4Url) ||
                                          ""
                                      )
                                    : String(el.props?.url ?? ""),
                                sourceType:
                                  el.props?.useGeneralSession && generalSession
                                    ? String(generalSession.sourceType ?? "mp4")
                                    : String(el.props?.sourceType ?? "mp4"),
                              }
                            : null

                        return (
                          <div
                            data-editor-element="true"
                            key={el.id}
                            onPointerDown={(e) => {
                              e.stopPropagation()
                              if (!isEditing) return

                              const isShift = e.shiftKey
                              const isAlreadySelected = selectedIds.includes(el.id)
                              const activeIds =
                                selectedIds.length > 1 && isAlreadySelected ? selectedIds : [el.id]

                              if (!isShift) {
                                setSelectedId(el.id)
                                setSelectedIds(activeIds)
                              }

                              setSelectedSectionId(null)

                              if (activeIds.length > 1 && isAlreadySelected) {
                                const startPositions: Record<string, { x: number; y: number }> = {}

                                elements.forEach((item) => {
                                  if (activeIds.includes(item.id)) {
                                    startPositions[item.id] = { x: item.x, y: item.y }
                                  }
                                })

                                groupDragRef.current = {
                                  ids: activeIds,
                                  startPointerX: e.clientX,
                                  startPointerY: e.clientY,
                                  startPositions,
                                }

                                dragRef.current = null
                              } else {
                                groupDragRef.current = null
                                startDrag(e, el.id, el.x, el.y)
                              }
                            }}
    onDoubleClick={(e) => {
  e.stopPropagation()
  if (!isEditing) return

  setSelectedId(el.id)
  setSelectedIds([el.id])
  setSelectedSectionId(null)

  if (
    el.element_type === "text" ||
    el.element_type === "button" ||
    el.element_type === "pdf"
  ) {
    setEditingElementId(el.id)
  } else {
    setEditingElementId(null)
  }
}}
                            onClick={(e) => {
                              if (isDraggingRef.current) return
                              e.stopPropagation()

                              if (e.shiftKey) {
                                setSelectedIds((prev) =>
                                  prev.includes(el.id)
                                    ? prev.filter((id) => id !== el.id)
                                    : [...prev, el.id]
                                )
                                setSelectedId(el.id)
                              } else {
                                setSelectedId(el.id)
                                setSelectedIds([el.id])
                              }

                              setSelectedSectionId(null)
                            }}
                            className={`absolute overflow-hidden rounded-xl shadow-lg ${
                              isEditing ? "cursor-grab active:cursor-grabbing" : "cursor-default"
                            } ${
                              selectedIds.includes(el.id)
                                ? "border border-sky-300/70 ring-2 ring-sky-400"
                                : selectedId === el.id
                                ? "border border-white/60 ring-2 ring-white"
                                : "border border-transparent"
                            } ${
                              isDraggingRef.current &&
                              (selectedId === el.id || selectedIds.includes(el.id))
                                ? "shadow-[0_0_0_1px_rgba(56,189,248,0.7),0_0_24px_rgba(56,189,248,0.25)]"
                                : ""
                            } ${
                              el.element_type === "image"
                                ? "bg-white"
                                : el.element_type === "video"
                                ? "bg-black"
                                : el.element_type === "pdf"
                                ? "bg-red-950/90 text-white"
                                : el.element_type === "button"
                                ? "bg-transparent"
                                : el.element_type === "spacer"
                                ? "border border-dashed border-white/20 bg-white/5"
                                : ""
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
                                className={`h-full w-full ${
                                  String(el.props?.imageFit ?? "cover") === "contain"
                                    ? "object-contain"
                                    : "object-cover"
                                } ${
                                  String(el.props?.imagePosition ?? "center") === "top"
                                    ? "object-top"
                                    : String(el.props?.imagePosition ?? "center") === "bottom"
                                    ? "object-bottom"
                                    : String(el.props?.imagePosition ?? "center") === "left"
                                    ? "object-left"
                                    : String(el.props?.imagePosition ?? "center") === "right"
                                    ? "object-right"
                                    : "object-center"
                                }`}
                                draggable={false}
                              />
                            ) : el.element_type === "video" ? (
                              (() => {
                                const showControls = Boolean(el.props?.controls ?? true)
                                const shouldLoop = Boolean(el.props?.loop ?? false)
                                const shouldAutoplay = Boolean(el.props?.autoplay ?? false)
                                const posterUrl = String(el.props?.posterUrl ?? "")

                                const videoUrl = String(videoSource?.url ?? "")
                                const sourceType = String(videoSource?.sourceType ?? "mp4")

                                if (!videoUrl && !posterUrl) {
                                  return (
                                    <div className="flex h-full w-full items-center justify-center text-sm text-white/50">
                                      Video block
                                    </div>
                                  )
                                }

                                if (showControls) {
                                  return (
                                    <div
                                      className="relative h-full w-full bg-black"
                                      onClick={() => {
                                        setSelectedId(el.id)
                                        setSelectedSectionId(null)
                                      }}
                                    >
                                      {videoUrl ? (
                                        sourceType === "hls" ? (
                                          <EditorVideoPreview
                                            url={videoUrl}
                                            sourceType="hls"
                                            className="h-full w-full object-cover"
                                          />
                                        ) : (
                                          <video
                                            src={videoUrl}
                                            className="h-full w-full object-cover"
                                            controls
                                            playsInline
                                            loop={shouldLoop}
                                            autoPlay={shouldAutoplay}
                                            poster={posterUrl || undefined}
                                          />
                                        )
                                      ) : (
                                        <img
                                          src={posterUrl}
                                          alt={el.content || "Video poster"}
                                          className="h-full w-full object-cover"
                                          draggable={false}
                                        />
                                      )}
                                    </div>
                                  )
                                }

                                return (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedId(el.id)
                                      setSelectedSectionId(null)
                                    }}
                                    className="relative block h-full w-full bg-black text-left"
                                  >
                                    <div className="group relative h-full w-full overflow-hidden">
                                      {posterUrl ? (
                                        <img
                                          src={posterUrl}
                                          alt={el.content || "Video poster"}
                                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                          draggable={false}
                                        />
                                      ) : videoUrl ? (
                                        <EditorVideoPreview
                                          url={videoUrl}
                                          sourceType={sourceType}
                                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                      ) : null}

                                      <div className="pointer-events-none absolute inset-0 bg-black/40 transition group-hover:bg-black/30" />

                                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-black shadow-xl transition group-hover:scale-110">
                                          ▶
                                        </div>
                                      </div>

                                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent" />

                                      <div className="pointer-events-none absolute bottom-3 left-4 right-4 z-20">
                                        <div className="flex items-center gap-2">
                                          {Boolean(el.props?.isLive) && (
                                            <span className="inline-flex rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white shadow-lg">
                                              LIVE
                                            </span>
                                          )}

                                          <div className="text-sm font-semibold text-white drop-shadow">
                                            {el.content || "Session Video"}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </button>
                                )
                              })()
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
                              <div
                                className="h-full w-full whitespace-pre-wrap"
                                style={getTextElementStyle(el)}
                              >
                                {el.content}
                              </div>
                            )}

                            {isEditing && !showInlineEditor && (
                              <div
                                data-resize-handle="true"
                                onPointerDown={(e) => startResize(e, el.id, el.width, el.height)}
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
  className={`shrink-0 border-l border-white/10 bg-slate-950/95 backdrop-blur-xl ${
    isEmbedded
      ? "w-[320px] opacity-100 overflow-visible"
      : `transition-[width,opacity] duration-300 ${
          isEditing ? "w-[380px] opacity-100" : "w-0 opacity-0"
        } ${!isEditing ? "pointer-events-none overflow-hidden" : "overflow-visible"}`
  }`}
>
  <div className={`h-full ${isEmbedded ? "w-[320px] p-4" : "w-[380px] p-6"}`}>
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-white/40">Editor</div>

              <h3 className="text-lg font-semibold">
                {selectedElement
                  ? "Element Settings"
                  : selectedSection
                  ? "Section Settings"
                  : "Page Editor"}
              </h3>

              <div className="mt-2 text-xs text-white/50">
                {selectedElement
                  ? "Editing element"
                  : selectedSection
                  ? "Editing section"
                  : "Select something to edit"}
              </div>

              <div className="mt-3 text-xs text-white/45">
                Preview mode: {isMobilePreview ? "Mobile" : "Desktop"}
              </div>
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
              onClick={() => void saveLayout(false)}
              className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold hover:bg-emerald-500"
            >
              Save
            </button>

            {saveMessage && <div className="mt-3 text-sm text-white/70">{saveMessage}</div>}

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <SectionPanelHeader
                title={
                  selectedElement
                    ? "Selected Element"
                    : selectedSection
                    ? selectedSection.config.adminLabel || getSafeSectionLabel(selectedSection.type)
                    : "Editor"
                }
                open={editorDetailsOpen}
                onToggle={() => setEditorDetailsOpen((v) => !v)}
              />

              {editorDetailsOpen && (
                <div className="mt-4">
                  {!selectedElement && !selectedSection && (
  <div className="space-y-4">
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
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
              setEventTheme((prev) => ({
                ...prev,
                pageBackgroundColor: e.target.value,
              }))
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
              setEventTheme((prev) => ({
                ...prev,
                panelBackgroundColor: e.target.value,
              }))
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
              setEventTheme((prev) => ({
                ...prev,
                textColor: e.target.value,
              }))
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
              setEventTheme((prev) => ({
                ...prev,
                gradientColorA: e.target.value,
              }))
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
              setEventTheme((prev) => ({
                ...prev,
                gradientColorB: e.target.value,
              }))
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

                                try {
                                  setSaveMessage("Uploading image...")
                                  const uploaded = await uploadMediaFile(file)

                                  updateElementProps(selectedElement.id, {
                                    src: uploaded.url,
                                  })

                                  setSaveMessage("Image uploaded")
                                } catch (err: any) {
                                  setSaveMessage(err.message)
                                }
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

                              try {
                                setSaveMessage("Uploading PDF...")
                                const uploaded = await uploadMediaFile(file)

                                updateElementProps(selectedElement.id, {
                                  url: uploaded.url,
                                })

                                setSaveMessage("PDF uploaded")
                              } catch (err: any) {
                                setSaveMessage(err.message)
                              }
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

                                try {
                                  setSaveMessage("Uploading video...")
                                  const uploaded = await uploadMediaFile(file)

                                  updateElementProps(selectedElement.id, {
                                    url: uploaded.url,
                                    sourceType: "mp4",
                                  })

                                  setSaveMessage("Video uploaded")
                                } catch (err: any) {
                                  setSaveMessage(err.message)
                                }
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

                                try {
                                  setSaveMessage("Uploading poster...")
                                  const uploaded = await uploadMediaFile(file)

                                  updateElementProps(selectedElement.id, {
                                    posterUrl: uploaded.url,
                                  })

                                  setSaveMessage("Poster uploaded")
                                } catch (err: any) {
                                  setSaveMessage(err.message)
                                }
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
                            (selectedSection.blocks ?? []).map((block, index) => {
                              const isActive = selectedBlockId === block.id
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
                onToggle={() => setSectionsListOpen((v) => !v)}
              />

              {sectionsListOpen && (
                <>
                  <div className="mt-3 space-y-2">
{sections.map((section, index) => {
  const isActive = selectedSectionId === section.id
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
      onClick={() => {
        setSelectedSectionId(section.id)
        setSelectedBlockId(section.blocks?.[0]?.id ?? null)
        setSelectedId(null)
        setSelectedIds([])
        setEditingElementId(null)
      }}
      onDoubleClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setSelectedSectionId(section.id)
        setSelectedBlockId(section.blocks?.[0]?.id ?? null)
        setSelectedId(null)
        setSelectedIds([])
        setEditingElementId(null)
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          setSelectedSectionId(section.id)
          setSelectedBlockId(section.blocks?.[0]?.id ?? null)
          setSelectedId(null)
          setSelectedIds([])
          setEditingElementId(null)
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
          </div>
        </aside>
      </div>
    </div>
  )
}