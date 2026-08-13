"use client"

import { useParams, usePathname, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  calculateAlignmentGuides,
  getCanvasAndSectionAlignmentTargets,
  type AlignmentGuides,
} from "./alignmentGuides"
import {
  screenDistanceToCanvasDistance,
  screenPointToCanvasPoint,
  type CanvasPoint,
} from "./canvasCoordinates"
import {
  findClosestReferenceBounds,
  type ElementAlignmentCommand,
} from "./elementAlignmentCommands"
import {
  compositeSelectionHasLockedMember,
  createElementGroupId,
  getCompositeAlignmentUpdates,
  getCompositeMoveUpdates,
  getCompositeSelectionItems,
  getElementGroupId,
  getElementGroupMemberIds,
  getExpandedGroupMemberIds,
  getGroupResizeSnapshot,
  getGroupResizeUpdates,
  getMinimumGroupResizeDimensions,
  type GroupResizeSnapshot,
} from "./elementGrouping"
import { DEFAULT_ELEMENT_ANIMATION } from "./elementAnimation"
import {
  applyLayerCommand,
  type LayerCommand,
} from "./layerCommands"
import EditorEventPageRenderer from "@/components/page-editor/EditorEventPageRenderer"
import FullCodeEditor from "@/components/page-editor/FullCodeEditor"
import ElementVideoPlayer from "@/components/page-renderer/ElementVideoPlayer"
import ExperienceInspectorRail from "./ExperienceInspectorRail"
import usePageEditorAutosave from "./hooks/usePageEditorAutosave"
import usePageEditorState from "@/components/page-editor/hooks/usePageEditorState"
import PageEditorToolbar from "./PageEditorToolbar"
import { createSystemComponentPreviewRegistry } from "./SystemComponentPreviewRegistry"

import {
  createDefaultEventHomeSections,
  getDefaultSectionConfig,
} from "@/lib/page-editor/sectionRegistry"
import { normalizeEventPageElements } from "@/lib/page-editor/elements"
import {
  getCustomCodeDocument,
  setCustomCodeDocument,
} from "@/lib/page-editor/customCode"
import {
  getButtonElementPresentationStyle,
  getElementAnimationAttribute,
  getElementContentAlignmentStyle,
  getElementFrameStyle,
  getImageElementPresentationStyle,
  getTextElementPresentationStyle,
  getVideoElementPresentationStyle,
  parseGeneralSessionProgramSource,
  resolveElementVideoSource,
  type GeneralSessionPresentationSource,
} from "@/lib/page-editor/elementPresentation"
import type {
  EventPageElement,
  SectionConfig,
  SectionType,
  SectionBlock,
  SystemComponentKey,
  EventTheme,
  ExperienceNode,
} from "@/lib/page-editor/sectionTypes"

export type EditorElement = EventPageElement

export type EventPageSection = {
  id: string
  type: SectionType
  config: SectionConfig
  blocks?: SectionBlock[]
}

type EditorExperienceNode = ExperienceNode & {
  sourceType: "section" | "element"
}

type AddableElementType = "text" | "image" | "pdf" | "video" | "button" | "spacer"
type RightRailTab = "inspect" | "layers" | "insert" | "page"
const GRID_SIZE = 8

const EXPERIENCE_EDITOR_ROOT_CLASS =
  "flex h-full min-h-0 flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.07),transparent_28%),radial-gradient(circle_at_82%_14%,rgba(168,85,247,0.075),transparent_30%),linear-gradient(180deg,#050816_0%,#040712_44%,#02040a_100%)] text-white"

const EXPERIENCE_EDITOR_CANVAS_SHELL_CLASS =
  "rounded-[28px] border border-white/[0.075] bg-[linear-gradient(180deg,rgba(255,255,255,0.038),rgba(255,255,255,0.014))] p-4 shadow-[0_22px_72px_rgba(0,0,0,0.30),inset_0_1px_0_rgba(255,255,255,0.035)]"

const EXPERIENCE_EDITOR_CANVAS_FRAME_CLASS =
  "mt-4 min-h-[900px] rounded-[24px] border border-white/[0.08] bg-black shadow-[inset_0_1px_0_rgba(255,255,255,0.035),0_18px_58px_rgba(0,0,0,0.28)]"

function snapToGrid(value: number) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE
}

function createElementId() {
  return `el-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function createSystemBlock(componentKey: SystemComponentKey): SectionBlock {
const registrationPreviewProps =
  componentKey === "registration_form"
    ? {
        title: "Reserve Your Place",
        body: "Native Jupiter registration flow with field builder, session binding, waitlist, and reservation state.",
        ctaLabel: "Start Registration",
        confirmationTitle: "Registration Confirmed",
        confirmationBody: "Your registration is part of the live Jupiter event experience now.",
        registrationFields: [],
      }
    : {}

  return {
    id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: "system_component",
    props: {
      componentKey,
      containerStyle: "panel",
      ...registrationPreviewProps,
    },
  }
}

function getSafeDefaultSectionConfig(type: string): SectionConfig {
  try {
    return getDefaultSectionConfig(type as SectionType)
  } catch {
    return getDefaultSectionConfig("content")
  }
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

function sectionToEditorExperienceNode(
  section: EventPageSection,
  index: number
): EditorExperienceNode {
  return {
    id: section.id,
    nodeType: "section",
    sourceType: "section",
    parentId: null,
    position: {
      x: 0,
      y: index,
    },
    zIndex: index,
    visible: section.config?.visible !== false,
    locked: false,
    props: {
      sectionType: section.type,
      adminLabel: section.config?.adminLabel,
      contentWidth: section.config?.contentWidth,
      paddingY: section.config?.paddingY,
    },
    children: section.blocks?.map((block, blockIndex) => ({
      id: block.id,
      nodeType: "block",
      parentId: section.id,
      position: {
        x: 0,
        y: blockIndex,
      },
      zIndex: blockIndex,
      visible: true,
      locked: false,
      props: {
        blockType: block.type,
        ...block.props,
      },
    })),
  }
}

function elementToEditorExperienceNode(element: EditorElement): EditorExperienceNode {
  return {
    id: element.id,
    nodeType:
      element.element_type === "image" ||
      element.element_type === "video" ||
      element.element_type === "pdf"
        ? "media"
        : element.element_type === "button" || element.element_type === "spacer"
          ? "graphic"
          : "overlay",
    sourceType: "element",
    parentId: null,
    position: {
      x: element.x,
      y: element.y,
    },
    size: {
      width: element.width ?? 0,
      height: element.height ?? 0,
    },
    zIndex: element.z_index ?? 1,
    visible: element.visible !== false,
    locked: element.locked === true,
    props: {
      elementType: element.element_type,
      content: element.content,
      ...element.props,
    },
  }
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
  const [isCodeEditorOpen, setIsCodeEditorOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [loadedPageKey, setLoadedPageKey] = useState<string | null>(null)
  const [eventAdminId, setEventAdminId] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [draggingSectionId, setDraggingSectionId] = useState<string | null>(null)
  const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(null)
  const [draggingLayerNodeId, setDraggingLayerNodeId] = useState<string | null>(null)
  const [dragOverLayerNodeId, setDragOverLayerNodeId] = useState<string | null>(null)
  const [isMobilePreview, setIsMobilePreview] = useState(false)
  const [canvasZoom, setCanvasZoom] = useState(1)
  const [rightRailTab, setRightRailTab] = useState<RightRailTab>("inspect")
  const [hoveredExperienceNodeId, setHoveredExperienceNodeId] = useState<string | null>(null)
  const [sectionTemplatesOpen, setSectionTemplatesOpen] = useState(true)
  const [addElementOpen, setAddElementOpen] = useState(true)
  const [sectionsListOpen, setSectionsListOpen] = useState(true)
  const [editorDetailsOpen, setEditorDetailsOpen] = useState(true)
  const [templates, setTemplates] = useState<any[]>([])
  const [generalSession, setGeneralSession] =
    useState<GeneralSessionPresentationSource>(null)

  const {
    elements,
    setElements,
    sections,
    setSections,
    eventTheme,
    setEventTheme,
    selectedId,
    setSelectedId,
    selectedIds,
    setSelectedIds,
    selectedElement,
    selectedSectionId,
    setSelectedSectionId,
    selectedSection,
    selectedBlockId,
    setSelectedBlockId,
    selectedBlock,
    editingElementId,
    setEditingElementId,
    selectedPageKey,
    switchPageState,
    setHasUnsavedChanges,
    clearSelection,
    canUndo,
    canRedo,
    beginTransaction,
    commitTransaction,
    runTransaction,
    resetHistory,
    restoreHistorySnapshot,
    documentRevision,
    getDocumentRevision,
    updateElement,
    updateElementProps,
    updateSectionConfig,
    addSectionPreset,
    deleteSelectedSection,
    duplicateSelectedSection,
    moveSelectedSection,
    selectBlock,
    updateBlock,
    updateBlockProps,
    removeBlockFromSection,
    addBlockToSection: addBlockToSectionState,
  } = usePageEditorState({
    initialPageKey: "event_home",
    eventInfo,
  })
  const {
    activePageSaveState,
    activePageIsDirty,
    registerLoadedPage,
    scheduleSave,
    saveNow,
    flushLatestPage,
  } = usePageEditorAutosave({
    slug,
    activePageKey: selectedPageKey,
    activeRevision: documentRevision,
  })
  const documentReady =
    !loading && !loadError && loadedPageKey === selectedPageKey
  const flushCurrentPage = useCallback(async (): Promise<boolean> => {
    if (!documentReady) return false

    const saved = await saveNow(selectedPageKey, documentRevision, {
      elements,
      sections,
      eventTheme,
    })
    if (!saved) return false

    return flushLatestPage(selectedPageKey)
  }, [
    documentRevision,
    elements,
    eventTheme,
    flushLatestPage,
    documentReady,
    saveNow,
    sections,
    selectedPageKey,
  ])

  const [selectionBox, setSelectionBox] = useState<{
    startX: number
    startY: number
    currentX: number
    currentY: number
    scale: number
  } | null>(null)
  const [alignmentGuides, setAlignmentGuides] = useState<AlignmentGuides>({
    vertical: [],
    horizontal: [],
    distances: [],
  })

  const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false)

  const dragRef = useRef<{
    id: string
    scale: number
    startPointer: CanvasPoint
    startPosition: CanvasPoint
    hasMoved: boolean
  } | null>(null)

  const groupDragRef = useRef<{
    ids: string[]
    scale: number
    startPointer: CanvasPoint
    startPositions: Record<string, { x: number; y: number }>
    hasMoved: boolean
  } | null>(null)

  const canvasRef = useRef<HTMLDivElement | null>(null)
  const isDraggingRef = useRef(false)
  const loadRequestIdRef = useRef(0)
  const eventInfoRef = useRef(eventInfo)
  const eventThemeRef = useRef(eventTheme)

  eventInfoRef.current = eventInfo
  eventThemeRef.current = eventTheme

  const resizeRef = useRef<{
    id: string
    scale: number
    startPointer: CanvasPoint
    startWidth: number
    startHeight: number
    groupSnapshot?: GroupResizeSnapshot | null
  } | null>(null)

  useEffect(() => {
    const requestId = loadRequestIdRef.current + 1
    loadRequestIdRef.current = requestId
    const abortController = new AbortController()

    async function loadElements() {
      const pageKey = selectedPageKey
      setLoading(true)
      setLoadError(null)
      setLoadedPageKey(null)
      setSaveMessage(null)

      try {
        const res = await fetch(
          `/api/admin/page-editor/event/${slug}/elements?pageKey=${encodeURIComponent(pageKey)}`,
          {
            cache: "no-store",
            signal: abortController.signal,
          },
        )
        const data = (await res.json().catch((): null => null)) as {
          elements?: unknown
          sections?: unknown
          eventTheme?: unknown
          event_id?: unknown
          revision?: unknown
          error?: unknown
        } | null
        if (requestId !== loadRequestIdRef.current) return

        if (!res.ok) {
          throw new Error(
            typeof data?.error === "string"
              ? data.error
              : "Failed to load the page editor document",
          )
        }

        const serverRevision = Number(data?.revision)

        if (
          !Array.isArray(data?.elements) ||
          !Array.isArray(data?.sections) ||
          !Number.isSafeInteger(serverRevision) ||
          serverRevision < 0
        ) {
          throw new Error("The page editor returned an invalid document")
        }

        const snapshot = {
          elements: normalizeEventPageElements(data.elements),
          sections:
            data.sections.length > 0
              ? normalizeSections(data.sections)
              : normalizeSections(
                  getDefaultSections(pageKey, eventInfoRef.current),
                ),
          eventTheme:
            data?.eventTheme && typeof data.eventTheme === "object"
              ? (data.eventTheme as EventTheme)
              : eventThemeRef.current,
        }

        if (typeof data.event_id === "string" && data.event_id.trim()) {
          setEventAdminId(data.event_id)
        }

        resetHistory(pageKey, snapshot)
        registerLoadedPage(
          pageKey,
          getDocumentRevision(pageKey),
          serverRevision,
          snapshot,
        )
        setLoadedPageKey(pageKey)
      } catch (error) {
        if (
          abortController.signal.aborted ||
          requestId !== loadRequestIdRef.current
        ) {
          return
        }

        setLoadError(
          error instanceof Error
            ? error.message
            : "Failed to load the page editor document",
        )
        console.error("Failed to load page editor data", error)
      } finally {
        if (requestId === loadRequestIdRef.current) {
          setLoading(false)
        }
      }
    }

    void loadElements()

    return () => {
      abortController.abort()
    }
  }, [
    getDocumentRevision,
    loadAttempt,
    registerLoadedPage,
    resetHistory,
    slug,
    selectedPageKey,
  ])

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
    if (!documentReady) return

    scheduleSave(selectedPageKey, documentRevision, {
      elements,
      sections,
      eventTheme,
    })
  }, [
    documentRevision,
    documentReady,
    elements,
    eventTheme,
    scheduleSave,
    sections,
    selectedPageKey,
  ])

  useEffect(() => {
    async function loadGeneralSession() {
      try {
        const res = await fetch("/api/general-session/program", {
          cache: "no-store",
        })

        const data: unknown = await res.json().catch((): null => null)

        if (!res.ok || !data) return

        setGeneralSession(parseGeneralSessionProgramSource(data))
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
      const isTyping =
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        target?.isContentEditable ||
        Boolean(
          target?.closest(
            "input, textarea, select, [contenteditable='true'], [role='textbox']"
          )
        )

      if (isTyping) return
      if (!isEditing || !documentReady) return

      const commandKey = e.metaKey || e.ctrlKey
      const key = e.key.toLowerCase()

      if (commandKey && key === "z") {
        e.preventDefault()
        restoreHistorySnapshot(e.shiftKey ? "redo" : "undo")
        return
      }

      if (commandKey && key === "d") {
        e.preventDefault()
        duplicateSelectedElement()
        return
      }

      if (commandKey && key === "g") {
        e.preventDefault()
        if (e.shiftKey) {
          ungroupSelectedElements()
        } else {
          groupSelectedElements()
        }
        return
      }

      if (commandKey && key === "a") {
        e.preventDefault()
        const allIds = elements.map((element) => element.id)
        setSelectedIds(allIds)
        setSelectedId(allIds[allIds.length - 1] ?? null)
        setSelectedSectionId(null)
        setSelectedBlockId(null)
        setEditingElementId(null)
        return
      }

      if (e.key === "Escape") {
        e.preventDefault()
        clearSelection()
        return
      }

      if (e.key === "Backspace" || e.key === "Delete") {
        if (selectedId || selectedIds.length > 0) {
          e.preventDefault()
          deleteSelectedElement()
        }
        return
      }

      const arrowOffsets: Partial<
        Record<KeyboardEvent["key"], { x: number; y: number }>
      > = {
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
        ArrowUp: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 },
      }
      const arrowOffset = arrowOffsets[e.key]

      if (arrowOffset) {
        e.preventDefault()
        const distance = e.shiftKey ? 10 : 1
        moveSelectedElementsBy(
          arrowOffset.x * distance,
          arrowOffset.y * distance
        )
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [
    clearSelection,
    documentReady,
    elements,
    isEditing,
    restoreHistorySnapshot,
    selectedId,
    selectedIds,
  ])

  function startDrag(
    e: React.PointerEvent<HTMLDivElement>,
    id: string,
    x: number,
    y: number
  ) {
    if (!isEditing) return
    const targetElement = elements.find((el) => el.id === id) as EditorElement | undefined
    if (targetElement?.locked) return
    if (editingElementId === id) return
    if ((e.target as HTMLElement).dataset.resizeHandle === "true") return
    if ((e.target as HTMLElement).dataset.inlineEditor === "true") return
    if (!canvasRef.current) return

    const startPointer = screenPointToCanvasPoint(
      e.clientX,
      e.clientY,
      canvasRef.current,
      canvasScale
    )

    beginTransaction()
    isDraggingRef.current = false
    setAlignmentGuides({ vertical: [], horizontal: [], distances: [] })
    dragRef.current = {
      id,
      scale: canvasScale,
      startPointer,
      startPosition: { x, y },
      hasMoved: false,
    }
  }

  function startResize(
    e: React.PointerEvent<HTMLDivElement>,
    id: string,
    width: number | null | undefined,
    height: number | null | undefined
  ) {
    if (!isEditing) return
    const targetElement = elements.find((el) => el.id === id) as EditorElement | undefined
    if (targetElement?.locked) return
    if (editingElementId === id) return
    e.stopPropagation()
    const groupId = targetElement ? getElementGroupId(targetElement) : null
    const groupMembers = groupId
      ? elements.filter((element) => getElementGroupId(element) === groupId)
      : []
    if (groupMembers.some((element) => element.locked === true)) return
    if (!canvasRef.current) return

    const startPointer = screenPointToCanvasPoint(
      e.clientX,
      e.clientY,
      canvasRef.current,
      canvasScale
    )

    beginTransaction()
    const groupSnapshot = getGroupResizeSnapshot(
      groupMembers.map((element) => ({
        id: element.id,
        x: element.x,
        y: element.y,
        width: element.width ?? 0,
        height: element.height ?? 0,
        props: element.props,
      }))
    )

    setAlignmentGuides({ vertical: [], horizontal: [], distances: [] })
    isDraggingRef.current = false
    resizeRef.current = {
      id,
      scale: canvasScale,
      startPointer,
      startWidth: groupSnapshot?.bounds.width ?? width ?? 224,
      startHeight: groupSnapshot?.bounds.height ?? height ?? 56,
      groupSnapshot,
    }

    setSelectedId(id)
    if (groupSnapshot) {
      setSelectedIds(groupSnapshot.elements.map((element) => element.id))
    } else {
      setSelectedIds([id])
    }
    setSelectedSectionId(null)
    setSelectedBlockId(null)
  }

  function onCanvasMove(e: React.PointerEvent<HTMLDivElement>) {
    if (groupDragRef.current) {
      if (!canvasRef.current) return

      const { ids, scale, startPointer, startPositions } = groupDragRef.current
      const currentPointer = screenPointToCanvasPoint(
        e.clientX,
        e.clientY,
        canvasRef.current,
        scale
      )

      const dx = snapToGrid(currentPointer.x - startPointer.x)
      const dy = snapToGrid(currentPointer.y - startPointer.y)
      const dragThreshold = screenDistanceToCanvasDistance(4, scale)
      const pointerDeltaX = currentPointer.x - startPointer.x
      const pointerDeltaY = currentPointer.y - startPointer.y

      if (
        !groupDragRef.current.hasMoved &&
        Math.abs(pointerDeltaX) <= dragThreshold &&
        Math.abs(pointerDeltaY) <= dragThreshold
      ) {
        return
      }

      groupDragRef.current.hasMoved = true
      isDraggingRef.current = true

      if (dx === 0 && dy === 0) return

      setHasUnsavedChanges(true)

      const updates = getCompositeMoveUpdates({
        elements: elements.flatMap((element) => {
          const start = startPositions[element.id]
          if (!start) return []

          return [
            {
              id: element.id,
              x: start.x,
              y: start.y,
              width: element.width ?? 0,
              height: element.height ?? 0,
              locked: element.locked,
              props: element.props,
            },
          ]
        }),
        selectedIds: ids,
        deltaX: dx,
        deltaY: dy,
      })
      const updatesById = new Map(updates.map((update) => [update.id, update]))

      setElements((prev) =>
        prev.map((el) => {
          const update = updatesById.get(el.id)
          return update ? { ...el, ...update } : el
        })
      )

      return
    }

    if (resizeRef.current) {
      if (!canvasRef.current) return

      const {
        id,
        scale,
        startPointer,
        startWidth,
        startHeight,
        groupSnapshot,
      } = resizeRef.current
      const currentPointer = screenPointToCanvasPoint(
        e.clientX,
        e.clientY,
        canvasRef.current,
        scale
      )
      const deltaX = currentPointer.x - startPointer.x
      const deltaY = currentPointer.y - startPointer.y

      const minimumGroupDimensions = groupSnapshot
        ? getMinimumGroupResizeDimensions(groupSnapshot, 96, 32)
        : null
      const nextWidth = Math.max(
        minimumGroupDimensions?.width ?? 96,
        startWidth + snapToGrid(deltaX)
      )
      const nextHeight = Math.max(
        minimumGroupDimensions?.height ?? 32,
        startHeight + snapToGrid(deltaY)
      )
      if (nextWidth === startWidth && nextHeight === startHeight) return

      isDraggingRef.current = true
      setHasUnsavedChanges(true)
      if (groupSnapshot) {
        const updates = getGroupResizeUpdates({
          snapshot: groupSnapshot,
          width: nextWidth,
          height: nextHeight,
        })
        const updatesById = new Map(updates.map((update) => [update.id, update]))

        setElements((prev) =>
          prev.map((element) => {
            const update = updatesById.get(element.id)
            return update ? { ...element, ...update } : element
          })
        )
        return
      }

      setElements((prev) =>
        prev.map((el) => (el.id === id ? { ...el, width: nextWidth, height: nextHeight } : el))
      )

      return
    }

    if (!dragRef.current) return
    if (!canvasRef.current) return

    const { id, scale, startPointer, startPosition } = dragRef.current
    const currentEl = elements.find((el) => el.id === id)
    if (!currentEl) return
    const currentPointer = screenPointToCanvasPoint(
      e.clientX,
      e.clientY,
      canvasRef.current,
      scale
    )
    const deltaX = currentPointer.x - startPointer.x
    const deltaY = currentPointer.y - startPointer.y
    const dragThreshold = screenDistanceToCanvasDistance(4, scale)

    if (
      !dragRef.current.hasMoved &&
      Math.abs(deltaX) <= dragThreshold &&
      Math.abs(deltaY) <= dragThreshold
    ) {
      return
    }

    dragRef.current.hasMoved = true
    isDraggingRef.current = true

    const proposedX = Math.max(0, startPosition.x + snapToGrid(deltaX))
    const proposedY = Math.max(0, startPosition.y + snapToGrid(deltaY))
    const canvasAndSectionTargets = canvasRef.current
      ? getCanvasAndSectionAlignmentTargets(canvasRef.current, scale)
      : []
    const alignment = calculateAlignmentGuides({
      dragged: {
        id,
        x: proposedX,
        y: proposedY,
        width: currentEl.width ?? 0,
        height: currentEl.height ?? 0,
      },
      targets: [
        ...elements
          .filter((element) => (element as EditorElement).visible !== false)
          .filter(
            (element) =>
              !(isMobilePreview && Boolean(element.props?.hideOnMobile))
          )
          .map((element) => ({
            id: element.id,
            x: element.x,
            y: element.y,
            width: element.width ?? 0,
            height: element.height ?? 0,
          })),
        ...canvasAndSectionTargets,
      ],
      threshold: screenDistanceToCanvasDistance(8, scale),
      distanceGuideRange: screenDistanceToCanvasDistance(160, scale),
    })

    setAlignmentGuides(alignment.guides)
    setHasUnsavedChanges(true)
    setElements((prev) =>
      prev.map((el) =>
        el.id === id ? { ...el, x: alignment.x, y: alignment.y } : el
      )
    )
  }

  function stopInteractions() {
    commitTransaction()
    dragRef.current = null
    groupDragRef.current = null
    resizeRef.current = null
    setAlignmentGuides({ vertical: [], horizontal: [], distances: [] })

    setTimeout(() => {
      isDraggingRef.current = false
    }, 50)
  }

  function executeElementAlignmentCommand(command: ElementAlignmentCommand) {
    const requestedIds =
      selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : []
    if (requestedIds.length === 0) return

    const activeIds = getExpandedGroupMemberIds(elements, requestedIds)
    if (activeIds.length === 0) return
    if (compositeSelectionHasLockedMember(elements, activeIds)) return

    const groupableElements = elements.map((element) => ({
      id: element.id,
      x: element.x,
      y: element.y,
      width: element.width ?? 0,
      height: element.height ?? 0,
      locked: element.locked,
      props: element.props,
    }))
    const composites = getCompositeSelectionItems(groupableElements, activeIds)
    const selectedComposite = composites[0]
    if (!selectedComposite) return

    const isDistributionCommand =
      command === "distribute-horizontally" ||
      command === "distribute-vertically"
    const isSingleElementReferenceCommand =
      command === "center-in-section" || command === "center-on-page"
    if (composites.length > 1 && isSingleElementReferenceCommand) return

    let referenceBounds = null

    if (composites.length === 1 && !isDistributionCommand) {
      if (!canvasRef.current) return

      const [pageBounds, ...sectionBounds] =
        getCanvasAndSectionAlignmentTargets(canvasRef.current, canvasScale)
      referenceBounds =
        command === "center-in-section"
          ? findClosestReferenceBounds(
              {
                ...selectedComposite.bounds,
                id: selectedComposite.id,
              },
              sectionBounds
            )
          : pageBounds
    }

    if (composites.length === 1 && !isDistributionCommand && !referenceBounds) return

    const updates = getCompositeAlignmentUpdates({
      elements: groupableElements,
      selectedIds: activeIds,
      command,
      referenceBounds,
    })
    const updatesById = new Map(updates.map((update) => [update.id, update]))

    setElements((current) =>
      current.map((element) => {
        const update = updatesById.get(element.id)
        return update ? { ...element, ...update } : element
      })
    )
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

  async function saveLayout() {
    await flushCurrentPage()
  }

  async function selectPage(pageKey: string) {
    if (pageKey === selectedPageKey) return

    if (!documentReady) {
      setLoading(true)
      setLoadError(null)
      switchPageState(pageKey)
      return
    }

    const saved = await flushCurrentPage()
    if (!saved) return

    setLoading(true)
    switchPageState(pageKey)
  }

  function toggleEditing() {
    if (!documentReady) return

    if (isEditing) {
      void flushCurrentPage()
    }
    setIsEditing((value) => !value)
  }

  useEffect(() => {
    if (!activePageIsDirty) return

    let navigationInProgress = false

    function handleNavigationClick(event: MouseEvent): void {
      if (
        navigationInProgress ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return
      }

      const target = event.target
      if (!(target instanceof Element)) return

      const anchor = target.closest<HTMLAnchorElement>("a[href]")
      if (
        !anchor ||
        anchor.hasAttribute("download") ||
        (anchor.target && anchor.target !== "_self") ||
        anchor.closest("[data-experience-editor-canvas]")
      ) {
        return
      }

      const destination = new URL(anchor.href, window.location.href)
      if (
        destination.origin !== window.location.origin ||
        destination.href === window.location.href
      ) {
        return
      }

      event.preventDefault()
      navigationInProgress = true

      void flushCurrentPage().then((saved) => {
        if (saved) {
          window.location.assign(destination.href)
          return
        }

        navigationInProgress = false
      })
    }

    document.addEventListener("click", handleNavigationClick, true)
    return () =>
      document.removeEventListener("click", handleNavigationClick, true)
  }, [activePageIsDirty, flushCurrentPage])


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

  function selectLayerElement(targetId: string) {
    const target = elements.find((element) => element.id === targetId)
    const nextSelectedIds = target
      ? getElementGroupMemberIds(elements, target)
      : [targetId]

    setSelectedId(targetId)
    setSelectedIds(nextSelectedIds)
    setSelectedSectionId(null)
    setSelectedBlockId(null)
    setEditingElementId(null)
  }

  function performLayerCommand(targetId: string, command: LayerCommand) {
    if (!elements.some((element) => element.id === targetId)) return

    selectLayerElement(targetId)
    setElements((current) => applyLayerCommand(current, targetId, command))
  }

function handleLayerDragStart(node: EditorExperienceNode) {
  if (node.sourceType !== "element") return
  if (node.locked) return

  setDraggingLayerNodeId(node.id)
  setDragOverLayerNodeId(null)
  selectLayerElement(node.id)
}

function handleLayerDragOver(
  e: React.DragEvent<HTMLButtonElement>,
  node: EditorExperienceNode
) {
  if (node.sourceType !== "element") return
  if (!draggingLayerNodeId || draggingLayerNodeId === node.id) return

  e.preventDefault()
  e.stopPropagation()
  e.dataTransfer.dropEffect = "move"

  setDragOverLayerNodeId(node.id)
}

function handleLayerDrop(
  e: React.DragEvent<HTMLButtonElement>,
  node: EditorExperienceNode
) {
  e.preventDefault()
  e.stopPropagation()

  if (node.sourceType !== "element") {
    setDraggingLayerNodeId(null)
    setDragOverLayerNodeId(null)
    return
  }

  const droppedId =
    e.dataTransfer.getData("text/plain") || draggingLayerNodeId

  if (!droppedId || droppedId === node.id) {
    setDraggingLayerNodeId(null)
    setDragOverLayerNodeId(null)
    return
  }

  setHasUnsavedChanges(true)

  setElements((prev) => {
    const normalized = normalizeZIndexes(prev)

    const bottomFirst = [...normalized].sort(
      (a, b) => (a.z_index ?? 0) - (b.z_index ?? 0)
    )

    const topFirst = [...bottomFirst].reverse()

    const fromIndex = topFirst.findIndex(
      (element) => element.id === droppedId
    )

    const toIndex = topFirst.findIndex(
      (element) => element.id === node.id
    )

    if (fromIndex === -1 || toIndex === -1) return prev

    const reorderedTopFirst = [...topFirst]

    const [moved] = reorderedTopFirst.splice(fromIndex, 1)

    reorderedTopFirst.splice(toIndex, 0, moved)

    const nextBottomFirst = [...reorderedTopFirst].reverse()

    return nextBottomFirst.map((element, index) => ({
      ...element,
      z_index: index + 1,
    }))
  })

  selectLayerElement(droppedId)

  setDraggingLayerNodeId(null)
  setDragOverLayerNodeId(null)
}

function handleLayerDragEnd() {
  setDraggingLayerNodeId(null)
  setDragOverLayerNodeId(null)
}
  function addBlockToSection(sectionId: string, block: SectionBlock) {
    addBlockToSectionState(sectionId, block)
    setSelectedSectionId(sectionId)
    setSelectedBlockId(block.id)
    setSelectedId(null)
    setSelectedIds([])
    setEditingElementId(null)
  }


  function updateSelectedBlock(nextBlock: SectionBlock) {
    if (!selectedSectionId || !selectedBlockId) return
    updateBlock(selectedSectionId, selectedBlockId, nextBlock)
  }

  function updateSelectedBlockProps(
    nextProps: Partial<Extract<SectionBlock, { type: "rich_text" }>["props"]> |
      Partial<Extract<SectionBlock, { type: "system_component" }>["props"]>
  ) {
    if (!selectedSectionId || !selectedBlockId) return
    updateBlockProps(selectedSectionId, selectedBlockId, nextProps)
  }
function updateRegistrationBlockCopyProp(
  key: "title" | "body" | "ctaLabel" | "confirmationTitle" | "confirmationBody",
  value: string
) {
  updateSelectedBlockProps({ [key]: value } as any)
}
function createDefaultRegistrationFieldDefinitions() {
  return [
    {
      id: "firstName",
      label: "First name",
      placeholder: "Gary",
      fieldType: "text",
      required: true,
      visible: true,
      locked: true,
      width: "half",
      systemRole: "identity",
    },
    {
      id: "lastName",
      label: "Last name",
      placeholder: "Deamer",
      fieldType: "text",
      required: true,
      visible: true,
      locked: true,
      width: "half",
      systemRole: "identity",
    },
    {
      id: "email",
      label: "Email address",
      placeholder: "gary@example.com",
      fieldType: "email",
      required: true,
      visible: true,
      locked: true,
      width: "full",
      helperText: "Used for confirmation, access, changes, and cancellation.",
      systemRole: "contact",
    },
    {
      id: "organization",
      label: "Organization",
      placeholder: "Jupiter.events",
      fieldType: "text",
      required: false,
      visible: true,
      width: "full",
      helperText: "Optional field previewing future builder-controlled registration fields.",
      systemRole: "profile",
    },
  ]
}

function getSelectedRegistrationFields() {
  if (!selectedBlock || selectedBlock.type !== "system_component") {
    return createDefaultRegistrationFieldDefinitions()
  }

  const fields = (selectedBlock.props as any).registrationFields

  return Array.isArray(fields) && fields.length > 0
    ? fields
    : createDefaultRegistrationFieldDefinitions()
}

function updateRegistrationFields(nextFields: any[]) {
  updateSelectedBlockProps({ registrationFields: nextFields } as any)
}

function updateRegistrationField(
  fieldId: string,
  nextFieldProps: Record<string, unknown>
) {
  const fields = getSelectedRegistrationFields()

  updateRegistrationFields(
    fields.map((field: any) =>
      field.id === fieldId ? { ...field, ...nextFieldProps } : field
    )
  )
}

function moveRegistrationFieldInSelectedBlock(
  fieldId: string,
  direction: "up" | "down"
) {
  const fields = getSelectedRegistrationFields()
  const index = fields.findIndex((field: any) => field.id === fieldId)
  if (index === -1) return

  const targetIndex = direction === "up" ? index - 1 : index + 1
  if (targetIndex < 0 || targetIndex >= fields.length) return

  const next = [...fields]
  const [moved] = next.splice(index, 1)
  next.splice(targetIndex, 0, moved)

  updateRegistrationFields(next)
}

function createRegistrationFieldFromTemplate(
  template: "jobTitle" | "phone" | "dietaryNeeds"
) {
  switch (template) {
    case "phone":
      return {
        id: `phone-${Date.now()}`,
        label: "Phone Number",
        placeholder: "(555) 123-4567",
        fieldType: "text",
        required: false,
        visible: true,
        locked: false,
        width: "half",
        systemRole: "profile",
      }

    case "dietaryNeeds":
      return {
        id: `dietary-${Date.now()}`,
        label: "Dietary Needs",
        placeholder: "Vegetarian, allergies, etc.",
        fieldType: "text",
        required: false,
        visible: true,
        locked: false,
        width: "full",
        systemRole: "profile",
      }

    case "jobTitle":
    default:
      return {
        id: `jobTitle-${Date.now()}`,
        label: "Job Title",
        placeholder: "Executive Producer",
        fieldType: "text",
        required: false,
        visible: true,
        locked: false,
        width: "half",
        systemRole: "profile",
      }
  }
}

function addRegistrationFieldFromTemplate(
  template: "jobTitle" | "phone" | "dietaryNeeds"
) {
  updateRegistrationFields([
    ...getSelectedRegistrationFields(),
    createRegistrationFieldFromTemplate(template),
  ])
}

function removeRegistrationField(fieldId: string) {
  updateRegistrationFields(
    getSelectedRegistrationFields().filter((field: any) => field.id !== fieldId)
  )
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

    const currentBlocks = selectedSection?.blocks ?? []
    const currentIndex = currentBlocks.findIndex((block) => block.id === selectedBlockId)
    const nextSelectedBlockId =
      currentIndex === -1
        ? null
        : currentBlocks[Math.max(0, currentIndex - 1)]?.id ??
          currentBlocks[currentIndex + 1]?.id ??
          null

    removeBlockFromSection(selectedSectionId, selectedBlockId)
    setSelectedBlockId(nextSelectedBlockId)
  }

  function addSystemBlockToSelectedSection(componentKey: SystemComponentKey) {
    if (!selectedSectionId) return
    addBlockToSection(selectedSectionId, createSystemBlock(componentKey))
  }
function addRegistrationFormSection() {
  const block = createSystemBlock("registration_form")
  const sectionId = `registration-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  const nextSection: EventPageSection = {
    id: sectionId,
    type: "system",
    config: {
      ...getSafeDefaultSectionConfig("system"),
      adminLabel: "Registration Form",
      title: "Reserve Your Place",
      body: "Native Jupiter registration flow with field builder, session binding, waitlist, and reservation state.",
    },
    blocks: [block],
  }

  setHasUnsavedChanges(true)
  setSections((prev) => normalizeSectionIds([...prev, nextSection]))
  setSelectedSectionId(sectionId)
  setSelectedBlockId(block.id)
  setSelectedId(null)
  setSelectedIds([])
  setEditingElementId(null)
  setEditorDetailsOpen(true)
  setRightRailTab("inspect")
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

    nextElement = {
      ...nextElement,
      props: {
        ...(nextElement.props ?? {}),
        animation: { ...DEFAULT_ELEMENT_ANIMATION },
      },
    }

    setHasUnsavedChanges(true)
    setElements((prev) => normalizeZIndexes([...prev, nextElement]))
    setSelectedId(id)
    setSelectedIds([id])
    setSelectedSectionId(null)
    setSelectedBlockId(null)

    if (elementType === "text" || elementType === "button" || elementType === "pdf") {
      setEditingElementId(id)
    }
  }




  function getActiveSelectedElementIds() {
    const selected =
      selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : []
    return getExpandedGroupMemberIds(elements, selected)
  }

  function deleteSelectedElement() {
    const idsToDelete = getActiveSelectedElementIds()

    if (idsToDelete.length === 0) return
    if (compositeSelectionHasLockedMember(elements, idsToDelete)) return

    setHasUnsavedChanges(true)
    setElements((prev) => normalizeZIndexes(prev.filter((el) => !idsToDelete.includes(el.id))))

    setSelectedId(null)
    setSelectedIds([])
    setEditingElementId(null)
  }

  function duplicateSelectedElement() {
    const activeIds = getActiveSelectedElementIds()
    if (compositeSelectionHasLockedMember(elements, activeIds)) return

    const selectedElements = elements
      .filter((element) => activeIds.includes(element.id))
      .sort((a, b) => (a.z_index ?? 0) - (b.z_index ?? 0))
    if (selectedElements.length === 0) return

    const highestZ = elements.reduce((max, el) => Math.max(max, el.z_index ?? 0), 0)
    const duplicatedGroupIds = new Map<string, string>()
    const duplicated = selectedElements.map((selected, index): EditorElement => {
      const nextId = createElementId()
      const currentGroupId = getElementGroupId(selected)
      let nextGroupId: string | null = null

      if (currentGroupId) {
        nextGroupId =
          duplicatedGroupIds.get(currentGroupId) ?? createElementGroupId()
        duplicatedGroupIds.set(currentGroupId, nextGroupId)
      }

      return {
        ...selected,
        id: nextId,
        x: selected.x + 24,
        y: selected.y + 24,
        z_index: highestZ + index + 1,
        props: {
          ...(selected.props ?? {}),
          ...(nextGroupId ? { groupId: nextGroupId } : {}),
        },
      }
    })
    const duplicatedIds = duplicated.map((element) => element.id)

    setHasUnsavedChanges(true)
    setElements((prev) => normalizeZIndexes([...prev, ...duplicated]))
    setSelectedIds(duplicatedIds)
    setSelectedId(duplicatedIds[duplicatedIds.length - 1] ?? null)
    setSelectedSectionId(null)
    setSelectedBlockId(null)
  }

  function moveSelectedElementsBy(deltaX: number, deltaY: number) {
    const activeIds = getActiveSelectedElementIds()
    if (activeIds.length === 0) return
    if (compositeSelectionHasLockedMember(elements, activeIds)) return

    const updates = getCompositeMoveUpdates({
      elements: elements.map((element) => ({
        id: element.id,
        x: element.x,
        y: element.y,
        width: element.width ?? 0,
        height: element.height ?? 0,
        locked: element.locked,
        props: element.props,
      })),
      selectedIds: activeIds,
      deltaX,
      deltaY,
    })
    const updatesById = new Map(updates.map((update) => [update.id, update]))

    setHasUnsavedChanges(true)
    setElements((current) =>
      current.map((element) => {
        const update = updatesById.get(element.id)
        return update ? { ...element, ...update } : element
      })
    )
  }

  function groupSelectedElements() {
    const activeIds = getActiveSelectedElementIds()
    const selectedElements = elements.filter((element) =>
      activeIds.includes(element.id)
    )

    if (
      selectedElements.length < 2 ||
      selectedElements.some((element) => element.locked === true) ||
      selectedElements.some((element) => getElementGroupId(element))
    ) {
      return
    }

    const groupId = createElementGroupId()

    setHasUnsavedChanges(true)
    setElements((current) =>
      current.map((element) =>
        activeIds.includes(element.id)
          ? {
              ...element,
              props: {
                ...(element.props ?? {}),
                groupId,
              },
            }
          : element
      )
    )
    setSelectedIds(activeIds)
    setSelectedId(activeIds[activeIds.length - 1] ?? null)
  }

  function ungroupSelectedElements() {
    const activeIds = getActiveSelectedElementIds()
    if (compositeSelectionHasLockedMember(elements, activeIds)) return

    const groupIds = new Set(
      elements
        .filter((element) => activeIds.includes(element.id))
        .map((element) => getElementGroupId(element))
        .filter((groupId): groupId is string => Boolean(groupId))
    )

    if (groupIds.size === 0) return

    setHasUnsavedChanges(true)
    setElements((current) =>
      current.map((element) =>
        groupIds.has(getElementGroupId(element) ?? "")
          ? {
              ...element,
              props: {
                ...(element.props ?? {}),
                groupId: null,
              },
            }
          : element
      )
    )
    setSelectedIds(activeIds)
    setSelectedId(activeIds[activeIds.length - 1] ?? null)
  }

  function handleSectionDragStart(sectionId: string) {
    const section = sections.find((s) => s.id === sectionId)
    if (!section || section.type === "hero") return

    setDraggingSectionId(sectionId)
    setDragOverSectionId(null)
    setSelectedSectionId(sectionId)
    setSelectedBlockId(null)
    setSelectedId(null)
    setSelectedIds([])
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
    setSelectedIds([])
  }

  function handleSectionDragEnd() {
    setDraggingSectionId(null)
    setDragOverSectionId(null)
  }

  async function saveCurrentTemplate() {
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
  }

  async function uploadSelectedImage(file: File) {
    if (!selectedElement) return

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
  }

  async function uploadSelectedPdf(file: File) {
    if (!selectedElement) return

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
  }

  async function uploadSelectedVideo(file: File) {
    if (!selectedElement) return

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
  }

  async function uploadSelectedPoster(file: File) {
    if (!selectedElement) return

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
  }

  function selectExperienceNode(node: EditorExperienceNode) {
    if (node.sourceType === "section") {
      setSelectedSectionId(node.id)
      setSelectedBlockId(null)
      setSelectedId(null)
      setSelectedIds([])
      setEditingElementId(null)
    } else {
      selectLayerElement(node.id)
    }
  }

  function updateEventTheme(nextTheme: Partial<EventTheme>) {
    setEventTheme((prev) => ({
      ...prev,
      ...nextTheme,
    }))
  }

  function resetRegistrationFields() {
    updateRegistrationFields(createDefaultRegistrationFieldDefinitions())
  }

  function addSectionTemplate(key: SectionType, title: string) {
    if (title === "Registration Form") {
      addRegistrationFormSection()
    } else {
      addSectionPreset(key)
    }
  }

  function selectSectionFromList(section: EventPageSection) {
    setSelectedSectionId(section.id)
    setSelectedBlockId(section.blocks?.[0]?.id ?? null)
    setSelectedId(null)
    setSelectedIds([])
    setEditingElementId(null)
  }

  // removed local selectedSection, selectedElement, selectedBlock (now from state)

  const contentSections = sections.filter((section) => section.type !== "hero")
  const selectedContentIndex =
    selectedSection && selectedSection.type !== "hero"
      ? contentSections.findIndex((section) => section.id === selectedSection.id)
      : -1

  const normalizedElements = normalizeZIndexes(elements)
  const experienceNodes: EditorExperienceNode[] = [
  ...sections
    .filter((section) => section.id !== "__jupiter_custom_code__")
    .map((section, index) => sectionToEditorExperienceNode(section, index)),
  ...normalizedElements.map((element) => elementToEditorExperienceNode(element)),
]
const orderedExperienceNodes = [...experienceNodes].sort(
  (a, b) => (b.zIndex ?? 0) - (a.zIndex ?? 0)
)
const selectedExperienceNode = experienceNodes.find(
    (node) =>
      node.id === selectedId ||
      node.id === selectedSectionId ||
      node.children?.some((child) => child.id === selectedBlockId)
  )
  const selectedElementIndex = normalizedElements.findIndex((el) => el.id === selectedId)

  const canMoveUp = selectedSection?.type !== "hero" && selectedContentIndex > 0
  const canMoveDown =
    selectedSection?.type !== "hero" &&
    selectedContentIndex > -1 &&
    selectedContentIndex < contentSections.length - 1

  const canDeleteSection = Boolean(selectedSection && selectedSection.type !== "hero")
  const canDuplicateSection = Boolean(selectedSection && selectedSection.type !== "hero")

  const selectedCommandIds = getExpandedGroupMemberIds(
    normalizedElements,
    selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : []
  )
  const selectedElementsForCommands = normalizedElements.filter((element) =>
    selectedCommandIds.includes(element.id)
  )
  const selectedElementCount = getCompositeSelectionItems(
    selectedElementsForCommands.map((element) => ({
      id: element.id,
      x: element.x,
      y: element.y,
      width: element.width ?? 0,
      height: element.height ?? 0,
      locked: element.locked,
      props: element.props,
    })),
    selectedCommandIds
  ).length
  const selectedCompositeIsLocked = compositeSelectionHasLockedMember(
    normalizedElements,
    selectedCommandIds
  )
  const canGroupElements =
    !selectedCompositeIsLocked &&
    selectedElementsForCommands.length >= 2 &&
    selectedElementsForCommands.every((element) => !getElementGroupId(element))
  const canUngroupElements =
    !selectedCompositeIsLocked &&
    selectedElementsForCommands.some((element) =>
      Boolean(getElementGroupId(element))
    )

  const canDeleteElement = selectedElementCount > 0 && !selectedCompositeIsLocked
  const canDuplicateElement = Boolean(selectedElement) && !selectedCompositeIsLocked
  const canBringForward =
    selectedElementIndex > -1 && selectedElementIndex < normalizedElements.length - 1
  const canSendBackward = selectedElementIndex > 0

  const canvasWrapClass = isEmbedded
    ? "w-full"
    : isMobilePreview
      ? "mx-auto w-[390px] max-w-full"
      : "w-full"

  const canvasScale = isMobilePreview ? 1 : canvasZoom
  const canvasViewportClass = isEmbedded
    ? "w-full overflow-auto"
    : "w-full overflow-auto rounded-[26px]"
  const systemComponents = createSystemComponentPreviewRegistry({ sections })
  const saveStatusMessage =
    activePageSaveState.status === "saving"
      ? "Saving..."
      : activePageSaveState.status === "conflict"
        ? activePageSaveState.error ??
          "This page was modified elsewhere. Refresh before continuing."
      : activePageSaveState.status === "failed"
        ? `Save failed: ${activePageSaveState.error ?? "Please try again"}`
        : activePageIsDirty
          ? "Unsaved changes"
          : "Saved"
  const inspectorSaveMessage = saveMessage
    ? `${saveMessage} · ${saveStatusMessage}`
    : saveStatusMessage
  const customCodeDocument = getCustomCodeDocument(sections)

  return (
    <div className={EXPERIENCE_EDITOR_ROOT_CLASS}>
      {!isEmbedded && (
        <PageEditorToolbar
          isEmbedded={isEmbedded}
          eventTitle={eventInfo.title}
          eventAdminHref={eventAdminId ? `/admin/events/${eventAdminId}` : null}
          selectedPageKey={selectedPageKey}
          templates={documentReady ? templates : []}
          canUndo={documentReady && canUndo}
          canRedo={documentReady && canRedo}
          canvasZoom={canvasZoom}
          isMobilePreview={isMobilePreview}
          isEditing={isEditing && documentReady}
          isCodeEditorOpen={isCodeEditorOpen}
          selectedElementCount={documentReady ? selectedElementCount : 0}
          canGroupElements={documentReady && canGroupElements}
          canUngroupElements={documentReady && canUngroupElements}
          onSelectPage={(pageKey) => {
            void selectPage(pageKey)
          }}
          onSelectTemplate={(templateId) => {
            if (!documentReady) return

            const template = templates.find((item) => item.id === templateId)
            if (!template) return

            runTransaction(() => {
              setSections(
                normalizeSections(
                  Array.isArray(template.sections_json) ? template.sections_json : []
                )
              )
              setElements(
                Array.isArray(template.elements_json) ? template.elements_json : []
              )
              if (template.event_theme && typeof template.event_theme === "object") {
                setEventTheme(template.event_theme as EventTheme)
              }
            })
          }}
          onUndo={() => restoreHistorySnapshot("undo")}
          onRedo={() => restoreHistorySnapshot("redo")}
          onChangeZoom={setCanvasZoom}
          onToggleMobilePreview={() => setIsMobilePreview((value) => !value)}
          onToggleEditing={toggleEditing}
          onToggleCodeEditor={() => {
            setIsCodeEditorOpen((value) => !value)
            setIsEditing(false)
            clearSelection()
          }}
          onAlignElements={executeElementAlignmentCommand}
          onGroupElements={groupSelectedElements}
          onUngroupElements={ungroupSelectedElements}
        />
      )}

            <div className="relative flex min-h-0 flex-1 overflow-hidden">
              {isCodeEditorOpen && documentReady ? (
                <FullCodeEditor
                  key={selectedPageKey}
                  initialHtml={customCodeDocument.html}
                  initialCss={customCodeDocument.css}
                  enabled={customCodeDocument.enabled}
                  saveStatus={saveStatusMessage}
                  onApply={(html, css) => {
                    setSections((current) =>
                      setCustomCodeDocument(current, {
                        enabled: true,
                        html,
                        css,
                      }),
                    )
                    setSaveMessage("Custom code applied")
                  }}
                  onUseVisualDesign={() => {
                    setSections((current) =>
                      setCustomCodeDocument(current, {
                        ...getCustomCodeDocument(current),
                        enabled: false,
                      }),
                    )
                    setSaveMessage("Visual design restored")
                  }}
                />
              ) : (
                <>
                <div
                  className="min-w-0 flex-1 overflow-auto overscroll-contain"
                  data-experience-editor-canvas
                >
          <div className={isEmbedded ? "w-full px-0 py-0" : "mx-auto max-w-7xl px-5 py-6"}>
            <div
              className={
                isEmbedded
                  ? "min-h-screen border-0 bg-transparent p-0"
                  : EXPERIENCE_EDITOR_CANVAS_SHELL_CLASS
              }
            >
              {loading || (!loadError && !documentReady) ? (
                <div className="mt-8 rounded-2xl border border-white/10 bg-black/30 p-8 text-white/60">
                  Loading editor elements...
                </div>
              ) : loadError ? (
                <div className="mt-8 rounded-2xl border border-red-300/20 bg-red-500/10 p-8 text-red-50">
                  <div className="text-lg font-semibold">
                    This page could not be loaded
                  </div>
                  <p className="mt-2 max-w-2xl text-sm text-red-100/70">
                    {loadError}
                  </p>
                  <p className="mt-3 max-w-2xl text-sm text-white/55">
                    Editing and saving are disabled so the existing page cannot
                    be overwritten with incomplete data.
                  </p>
                  <button
                    type="button"
                    onClick={() => setLoadAttempt((attempt) => attempt + 1)}
                    className="mt-5 rounded-xl border border-red-200/20 bg-red-400/15 px-4 py-2 text-sm font-semibold text-red-50 transition hover:bg-red-400/25"
                  >
                    Retry loading
                  </button>
                </div>
              ) : (
                <div className={canvasViewportClass}>
                  {!isEmbedded && (
                    <div className="pointer-events-none sticky top-3 z-30 mx-2 mb-2 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/55 px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-white/50 shadow-2xl backdrop-blur-xl">
                      <div className="flex items-center gap-3">
                        <span>Canvas · {Math.round(canvasScale * 100)}%</span>
                        <span className="h-1 w-1 rounded-full bg-white/25" />
                        <span>{experienceNodes.length} nodes · {normalizedElements.length} layers</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="relative h-10 w-20 overflow-hidden rounded-lg border border-white/10 bg-white/[0.035]">
                          <div className="absolute inset-x-2 top-1 h-2 rounded-sm bg-violet-300/25" />
                          <div className="absolute inset-x-3 top-4 h-2 rounded-sm bg-sky-300/20" />
                          <div className="absolute bottom-1 left-5 h-2 w-8 rounded-sm bg-amber-300/25" />
                          <div
                            className="absolute rounded-md border border-white/45 bg-white/10"
                            style={{
                              inset: canvasScale > 1 ? "10px 18px" : canvasScale < 1 ? "5px 8px" : "7px 12px",
                            }}
                          />
                        </div>
                        <span>Minimap</span>
                      </div>
                    </div>
                  )}

                  <div
                    className={canvasWrapClass}
                    style={{
                      transform: `scale(${canvasScale})`,
                      transformOrigin: "top center",
                      width: canvasScale === 1 ? undefined : `${100 / canvasScale}%`,
                    }}
                  >
                    <div
                      ref={canvasRef}
                      className={`relative overflow-hidden bg-black ${
  isEmbedded
    ? "min-h-screen rounded-none border-0 mt-0"
    : EXPERIENCE_EDITOR_CANVAS_FRAME_CLASS
}`}
                    onPointerDown={(e) => {
                      if (!isEditing) return
                      if (
  (e.target as HTMLElement).closest("[data-editor-element]") ||
  (e.target as HTMLElement).closest("[data-editor-section]")
) {
  return
}

                      if (!canvasRef.current) return

                      const start = screenPointToCanvasPoint(
                        e.clientX,
                        e.clientY,
                        canvasRef.current,
                        canvasScale
                      )

                      canvasRef.current?.setPointerCapture?.(e.pointerId)

                      setSelectedId(null)
                      setSelectedIds([])
                      setSelectedSectionId(null)
                      setSelectedBlockId(null)
                      setEditingElementId(null)

                      setSelectionBox({
                        startX: start.x,
                        startY: start.y,
                        currentX: start.x,
                        currentY: start.y,
                        scale: canvasScale,
                      })

                      setIsMarqueeSelecting(true)
                    }}
                    onPointerMove={(e) => {
                      onCanvasMove(e)

                      if (!isMarqueeSelecting || !selectionBox || !canvasRef.current) return

                      const current = screenPointToCanvasPoint(
                        e.clientX,
                        e.clientY,
                        canvasRef.current,
                        selectionBox.scale
                      )

                      setSelectionBox((prev) =>
                        prev
                          ? {
                              ...prev,
                              currentX: current.x,
                              currentY: current.y,
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

                      const end = screenPointToCanvasPoint(
                        e.clientX,
                        e.clientY,
                        canvasRef.current,
                        selectionBox.scale
                      )
                      const left = Math.min(selectionBox.startX, end.x)
                      const right = Math.max(selectionBox.startX, end.x)
                      const top = Math.min(selectionBox.startY, end.y)
                      const bottom = Math.max(selectionBox.startY, end.y)

                      const directlyHitIds = normalizedElements
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
                      const hitIds = getExpandedGroupMemberIds(
                        elements,
                        directlyHitIds
                      )

                      setSelectedIds(hitIds)
                      setSelectedId(hitIds[hitIds.length - 1] ?? null)
                      setIsMarqueeSelecting(false)
                      setSelectionBox(null)

                      canvasRef.current?.releasePointerCapture?.(e.pointerId)
                    }}
                    onPointerCancel={stopInteractions}
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
  sections={sections}
  isEditing={isEditing}
  selectedSectionId={selectedSectionId}
  draggingSectionId={draggingSectionId}
  dragOverSectionId={dragOverSectionId}
  onSectionDragStart={handleSectionDragStart}
  onSectionDragOver={handleSectionDragOver}
  onSectionDrop={handleSectionDrop}
  onSectionDragEnd={handleSectionDragEnd}
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
  experienceNodeCount={experienceNodes.length}
  isMobilePreview={isMobilePreview}
  systemComponents={systemComponents}
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

                    {isEditing && isDraggingRef.current && (
                      <>
                        {alignmentGuides.vertical.map((position, index) => (
                          <div
                            key={`vertical-${position}-${index}`}
                            className="pointer-events-none absolute inset-y-0 w-px bg-fuchsia-400/90 shadow-[0_0_6px_rgba(232,121,249,0.7)]"
                            style={{
                              left: position,
                              zIndex: 9999,
                            }}
                          />
                        ))}

                        {alignmentGuides.horizontal.map((position, index) => (
                          <div
                            key={`horizontal-${position}-${index}`}
                            className="pointer-events-none absolute inset-x-0 h-px bg-fuchsia-400/90 shadow-[0_0_6px_rgba(232,121,249,0.7)]"
                            style={{
                              top: position,
                              zIndex: 9999,
                            }}
                          />
                        ))}

                        {alignmentGuides.distances.map((guide, index) => {
                          const guideColor = guide.equal
                            ? "bg-fuchsia-300"
                            : "bg-fuchsia-400/70"
                          const labelClass = guide.equal
                            ? "border-fuchsia-100/40 bg-fuchsia-500 text-white shadow-[0_0_12px_rgba(217,70,239,0.55)]"
                            : "border-fuchsia-300/25 bg-slate-950/90 text-fuchsia-100"

                          return guide.orientation === "horizontal" ? (
                            <div key={`distance-horizontal-${index}`}>
                              <div
                                className={`pointer-events-none absolute h-px ${guideColor}`}
                                style={{
                                  left: guide.start,
                                  top: guide.crossPosition,
                                  width: Math.max(0, guide.end - guide.start),
                                  zIndex: 9999,
                                }}
                              />
                              {[guide.start, guide.end].map((position, tickIndex) => (
                                <div
                                  key={`${position}-${tickIndex}`}
                                  className={`pointer-events-none absolute h-2.5 w-px ${guideColor}`}
                                  style={{
                                    left: position,
                                    top: guide.crossPosition - 5,
                                    zIndex: 9999,
                                  }}
                                />
                              ))}
                              <div
                                className={`pointer-events-none absolute rounded-md border px-1.5 py-0.5 text-[9px] font-black tabular-nums ${labelClass}`}
                                style={{
                                  left: guide.start + (guide.end - guide.start) / 2,
                                  top: guide.crossPosition,
                                  transform: "translate(-50%, -50%)",
                                  zIndex: 10000,
                                }}
                              >
                                {Math.round(guide.distance)}px
                              </div>
                            </div>
                          ) : (
                            <div key={`distance-vertical-${index}`}>
                              <div
                                className={`pointer-events-none absolute w-px ${guideColor}`}
                                style={{
                                  left: guide.crossPosition,
                                  top: guide.start,
                                  height: Math.max(0, guide.end - guide.start),
                                  zIndex: 9999,
                                }}
                              />
                              {[guide.start, guide.end].map((position, tickIndex) => (
                                <div
                                  key={`${position}-${tickIndex}`}
                                  className={`pointer-events-none absolute h-px w-2.5 ${guideColor}`}
                                  style={{
                                    left: guide.crossPosition - 5,
                                    top: position,
                                    zIndex: 9999,
                                  }}
                                />
                              ))}
                              <div
                                className={`pointer-events-none absolute rounded-md border px-1.5 py-0.5 text-[9px] font-black tabular-nums ${labelClass}`}
                                style={{
                                  left: guide.crossPosition,
                                  top: guide.start + (guide.end - guide.start) / 2,
                                  transform: "translate(-50%, -50%)",
                                  zIndex: 10000,
                                }}
                              >
                                {Math.round(guide.distance)}px
                              </div>
                            </div>
                          )
                        })}
                      </>
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
                    .filter((el) => el.visible !== false)
                    .filter((el) => !(isMobilePreview && Boolean(el.props?.hideOnMobile)))
                    .map((el) => {
                        const isInlineEditing = editingElementId === el.id
                        const isLayerHovered = hoveredExperienceNodeId === el.id
                        const isLocked = el.locked === true
                        const groupMemberIds = getElementGroupMemberIds(elements, el)
                        const showInlineEditor =
                          isInlineEditing &&
                          (el.element_type === "text" ||
                            el.element_type === "button" ||
                            el.element_type === "pdf")

                        const videoSource =
                          el.element_type === "video"
                            ? resolveElementVideoSource(el, generalSession)
                            : null

                        return (
                          <div
                            data-editor-element="true"
                            data-element-animation={getElementAnimationAttribute(el)}
                            key={el.id}
                            onMouseEnter={() => setHoveredExperienceNodeId(el.id)}
                            onMouseLeave={() => setHoveredExperienceNodeId(null)}
                            onPointerDown={(e) => {
                              e.stopPropagation()
                              if (!isEditing) return

                              const isSelectionModifier =
                                e.shiftKey || e.metaKey || e.ctrlKey
                              const isAlreadySelected = selectedIds.includes(el.id)
                              const activeIds =
                                selectedIds.length > 1 && isAlreadySelected
                                  ? selectedIds
                                  : groupMemberIds.length > 1
                                    ? groupMemberIds
                                    : [el.id]

                              if (isSelectionModifier) {
                                dragRef.current = null
                                groupDragRef.current = null
                                setSelectedSectionId(null)
                                setSelectedBlockId(null)
                                return
                              }

                              if (!isSelectionModifier) {
                                setSelectedId(el.id)
                                setSelectedIds(activeIds)
                              }

                              setSelectedSectionId(null)
                              setSelectedBlockId(null)

                              if (
                                activeIds.length > 1 &&
                                (groupMemberIds.length > 1 || isAlreadySelected)
                              ) {
                                if (
                                  elements.some(
                                    (item) =>
                                      activeIds.includes(item.id) &&
                                      item.locked === true
                                  )
                                ) {
                                  return
                                }
                                if (!canvasRef.current) return

                                const startPointer = screenPointToCanvasPoint(
                                  e.clientX,
                                  e.clientY,
                                  canvasRef.current,
                                  canvasScale
                                )
                                beginTransaction()
                                const startPositions: Record<string, { x: number; y: number }> = {}

                                elements.forEach((item) => {
                                  if (activeIds.includes(item.id)) {
                                    startPositions[item.id] = { x: item.x, y: item.y }
                                  }
                                })

                                groupDragRef.current = {
                                  ids: activeIds,
                                  scale: canvasScale,
                                  startPointer,
                                  startPositions,
                                  hasMoved: false,
                                }
                                isDraggingRef.current = false

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
  setSelectedIds(groupMemberIds)
  setSelectedSectionId(null)
  setSelectedBlockId(null)

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

                              if (e.metaKey || e.ctrlKey) {
                                const groupIsSelected = groupMemberIds.every((id) =>
                                  selectedIds.includes(id)
                                )
                                const nextIds = groupIsSelected
                                  ? selectedIds.filter(
                                      (id) => !groupMemberIds.includes(id)
                                    )
                                  : Array.from(
                                      new Set([...selectedIds, ...groupMemberIds])
                                    )
                                setSelectedIds(nextIds)
                                setSelectedId(
                                  !groupIsSelected
                                    ? el.id
                                    : nextIds[nextIds.length - 1] ?? null
                                )
                              } else if (e.shiftKey) {
                                const nextIds = Array.from(
                                  new Set([...selectedIds, ...groupMemberIds])
                                )
                                setSelectedIds(nextIds)
                                setSelectedId(el.id)
                              } else {
                                setSelectedId(el.id)
                                setSelectedIds(groupMemberIds)
                              }

                              setSelectedSectionId(null)
                              setSelectedBlockId(null)
                            }}
                            className={`absolute overflow-hidden rounded-xl shadow-lg ${
                              isEditing
                              ? isLocked
                                ? "cursor-default"
                                : "cursor-grab active:cursor-grabbing"
                              : "cursor-default"
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
                              isLayerHovered && !selectedIds.includes(el.id) && selectedId !== el.id
                                ? "ring-2 ring-violet-300/70 shadow-[0_0_0_1px_rgba(196,181,253,0.55),0_0_30px_rgba(167,139,250,0.24)]"
                                : ""
                            } ${
                              isLocked
                                ? "before:pointer-events-none before:absolute before:inset-0 before:z-20 before:rounded-[inherit] before:border before:border-amber-300/45 before:shadow-[inset_0_0_0_1px_rgba(251,191,36,0.24),0_0_22px_rgba(251,191,36,0.12)]"
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
                            style={getElementFrameStyle(el)}
                          >
                                                        {isLocked && (
                              <div className="pointer-events-none absolute right-2 top-2 z-30 flex h-6 w-6 items-center justify-center rounded-full border border-amber-300/30 bg-amber-500/12 text-[10px] font-black text-amber-100/70 shadow-[0_0_18px_rgba(251,191,36,0.18)] backdrop-blur-sm">
                                L
                              </div>
                            )}
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
                                className="h-full w-full"
                                style={getImageElementPresentationStyle(el)}
                                draggable={false}
                              />
                            ) : el.element_type === "video" ? (
                              (() => {
                                const showControls = Boolean(el.props?.controls ?? true)
                                const shouldLoop = Boolean(el.props?.loop ?? false)
                                const shouldAutoplay = Boolean(el.props?.autoplay ?? false)
                                const posterUrl = String(el.props?.posterUrl ?? "")
                                const shouldMute =
                                  typeof el.props?.muted === "boolean"
                                    ? el.props.muted
                                    : shouldAutoplay

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
                                        setSelectedIds(groupMemberIds)
                                        setSelectedSectionId(null)
                                        setSelectedBlockId(null)
                                      }}
                                    >
                                      {videoUrl ? (
                                        <ElementVideoPlayer
                                          url={videoUrl}
                                          sourceType={sourceType}
                                          className="h-full w-full"
                                          style={getVideoElementPresentationStyle(el)}
                                          controls
                                          loop={shouldLoop}
                                          autoPlay={shouldAutoplay}
                                          muted={shouldMute}
                                          poster={posterUrl}
                                          trimStart={Number(el.props?.trimStart ?? 0)}
                                          trimEnd={Number(el.props?.trimEnd ?? 0)}
                                        />
                                      ) : (
                                        <img
                                          src={posterUrl}
                                          alt={el.content || "Video poster"}
                                          className="h-full w-full"
                                          style={getVideoElementPresentationStyle(el)}
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
                                      setSelectedIds(groupMemberIds)
                                      setSelectedSectionId(null)
                                      setSelectedBlockId(null)
                                    }}
                                    className="relative block h-full w-full bg-black text-left"
                                  >
                                    <div className="group relative h-full w-full overflow-hidden">
                                      {videoUrl ? (
                                        <ElementVideoPlayer
                                          url={videoUrl}
                                          sourceType={sourceType}
                                          className="h-full w-full transition-transform duration-500 group-hover:scale-105"
                                          style={getVideoElementPresentationStyle(el)}
                                          controls={false}
                                          loop={shouldLoop}
                                          autoPlay={shouldAutoplay}
                                          muted={
                                            typeof el.props?.muted === "boolean"
                                              ? el.props.muted
                                              : true
                                          }
                                          poster={
                                            Boolean(
                                              el.props?.showPosterOnCard ?? true
                                            )
                                              ? posterUrl
                                              : ""
                                          }
                                          trimStart={Number(el.props?.trimStart ?? 0)}
                                          trimEnd={Number(el.props?.trimEnd ?? 0)}
                                        />
                                      ) : posterUrl ? (
                                        <img
                                          src={posterUrl}
                                          alt={el.content || "Video poster"}
                                          className="h-full w-full transition-transform duration-500 group-hover:scale-105"
                                          style={getVideoElementPresentationStyle(el)}
                                          draggable={false}
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
                              <div
                                className="flex h-full w-full"
                                style={getElementContentAlignmentStyle(el)}
                              >
                                <button
                                  type="button"
                                  style={getButtonElementPresentationStyle(el)}
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
                                style={getTextElementPresentationStyle(el)}
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
                </div>
              )}
            </div>
          </div>
        </div>

        {documentReady && !isCodeEditorOpen && <ExperienceInspectorRail
          {...{
            addElement,
            addElementOpen,
            addRegistrationFieldFromTemplate,
            addSectionTemplate,
            addSystemBlockToSelectedSection,
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
            performLayerCommand,
            removeRegistrationField,
            resetRegistrationFields,
            rightRailTab,
            saveCurrentTemplate,
            saveLayout,
            saveMessage: inspectorSaveMessage,
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
            setAddElementOpen,
            setEditorDetailsOpen,
            setHoveredExperienceNodeId,
            setRightRailTab,
            setSectionsListOpen,
            setSectionTemplatesOpen,
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
          }}
        />}
                </>
              )}
    </div>
  </div>
  )
}
