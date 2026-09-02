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
import CanvasGridOverlay from "./CanvasGridOverlay"
import ResizeHandles, { type ResizeHandle } from "./ResizeHandles"
import EditorEventPageRenderer from "@/components/page-editor/EditorEventPageRenderer"
import FullCodeEditor from "@/components/page-editor/FullCodeEditor"
import ElementVideoPlayer from "@/components/page-renderer/ElementVideoPlayer"
import ExperienceInspectorRail from "./ExperienceInspectorRail"
import usePageEditorAutosave from "./hooks/usePageEditorAutosave"
import usePageEditorState from "@/components/page-editor/hooks/usePageEditorState"
import PageEditorToolbar from "./PageEditorToolbar"
import EditorToolDock, { type EditorToolPanel } from "./EditorToolDock"
import EditorToolPanelContent from "./EditorToolPanel"
import PageFilmstrip, { type EditorPageManifestItem, type PageThumbnailDocument } from "./PageFilmstrip"
import { EDITOR_PAGES, getPublicEditorPageUrl } from "./editorPages"
import TextContextToolbar from "./TextContextToolbar"
import EditorCollaborationPanel from "./EditorCollaborationPanel"
import RichTextInlineEditor from "./RichTextInlineEditor"
import RichTextContent from "@/components/page-renderer/RichTextContent"
import type { RichTextRun } from "@/lib/page-editor/richText"
import { createSystemComponentPreviewRegistry } from "./SystemComponentPreviewRegistry"
import { useJupiterNotice } from "@/components/ui/JupiterNotificationProvider"

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
  getElementIntroAnimationStyle,
  getImageElementPresentationStyle,
  getResponsiveElement,
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

type PageEditorTemplate = {
  id: string
  name: string
  sections_json: EventPageSection[]
  elements_json: EventPageElement[]
  event_theme?: Partial<EventTheme> | null
}

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
type TextPreset = "heading" | "subheading" | "body"
type RegistrationFieldDefinition = {
  id: string
  label: string
  placeholder: string
  fieldType: "text" | "email"
  required: boolean
  visible: boolean
  locked?: boolean
  width: "half" | "full"
  helperText?: string
  systemRole: "identity" | "contact" | "profile"
}

function applyResponsiveFramePatch(element: EventPageElement, patch: Partial<Pick<EventPageElement, "x" | "y" | "width" | "height">>, device: "desktop" | "tablet" | "mobile") {
  if (device === "desktop") return { ...element, ...patch }
  const props = element.props ?? {}
  const responsiveStyles = props.responsiveStyles && typeof props.responsiveStyles === "object" && !Array.isArray(props.responsiveStyles) ? props.responsiveStyles as Record<string, unknown> : {}
  const current = responsiveStyles[device] && typeof responsiveStyles[device] === "object" && !Array.isArray(responsiveStyles[device]) ? responsiveStyles[device] as Record<string, unknown> : {}
  return { ...element, props: { ...props, responsiveStyles: { ...responsiveStyles, [device]: { ...current, ...patch } } } }
}
type EditorAsset = { id: string; path: string; url: string; name: string; type: string; trashed?: boolean; originalPath?: string }
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function normalizeSections(inputSections: unknown): EventPageSection[] {
  const values = Array.isArray(inputSections) ? inputSections : []
  return normalizeSectionIds(
    values.map((value) => {
      const section = isRecord(value) ? value : {}
      const type = String(section.type ?? "content") as SectionType
      const blocks = Array.isArray(section.blocks) ? section.blocks.flatMap((blockValue, blockIndex): SectionBlock[] => {
        if (!isRecord(blockValue)) return []
        const blockType = blockValue.type === "system_component" ? "system_component" : "rich_text"
        return [{ id: String(blockValue.id ?? `block-${blockIndex + 1}`), type: blockType, props: isRecord(blockValue.props) ? blockValue.props : {} } as SectionBlock]
      }) : []
      return {
      id: String(
        section.id ?? `section-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      ),
      type,
      config:
        isRecord(section.config)
          ? section.config as SectionConfig
          : getSafeDefaultSectionConfig(type),
      blocks,
    }}),
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

export default function AdminEventPageEditorPreview({
  eventSlug,
  eventAdminId: eventAdminIdOverride,
}: {
  eventSlug?: string
  eventAdminId?: string
} = {}) {
const { alert: showNotice, prompt: promptNotice } = useJupiterNotice()
const params = useParams()
const pathname = usePathname()
const searchParams = useSearchParams()
const slug = eventSlug ?? String(params.slug ?? "")
const requestedPageKey = searchParams.get("page") || "event_home"
const requestedMode = searchParams.get("mode")
const isEmbedded =
  pathname.startsWith("/embed/") || searchParams.get("embed") === "1"

  const [eventTitle, setEventTitle] = useState(slug ? slug.replace(/-/g, " ") : "Event Preview")
  const [eventStage, setEventStage] = useState("build")

  const eventInfo = {
    title: eventTitle,
    description: "Renderer mode is now active inside the Page Editor.",
  }

  const [isEditing, setIsEditing] = useState(
    isEmbedded || requestedMode === "edit",
  )
  const [isCodeEditorOpen, setIsCodeEditorOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [loadedPageKey, setLoadedPageKey] = useState<string | null>(null)
  const [eventAdminId, setEventAdminId] = useState<string | null>(
    eventAdminIdOverride ?? null
  )
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [draggingSectionId, setDraggingSectionId] = useState<string | null>(null)
  const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(null)
  const [draggingLayerNodeId, setDraggingLayerNodeId] = useState<string | null>(null)
  const [dragOverLayerNodeId, setDragOverLayerNodeId] = useState<string | null>(null)
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop")
  const isMobilePreview = previewDevice === "mobile"
  const [canvasZoom, setCanvasZoom] = useState(1)
  const [showGrid, setShowGrid] = useState(true)
  const [showRulers, setShowRulers] = useState(false)
  const [copiedElementStyle, setCopiedElementStyle] = useState<Record<string, unknown> | null>(null)
  const [rightRailTab, setRightRailTab] = useState<RightRailTab>("inspect")
  const [activeToolPanel, setActiveToolPanel] = useState<EditorToolPanel>("design")
  const [toolPanelOpen, setToolPanelOpen] = useState(true)
  const [collaborationOpen, setCollaborationOpen] = useState(false)
  const [editorAssets, setEditorAssets] = useState<EditorAsset[]>([])
  const [editorPages, setEditorPages] = useState<EditorPageManifestItem[]>(() => EDITOR_PAGES.map((page) => ({ pageKey: page.value, title: page.label, isSystem: true })))
  const [pageThumbnails, setPageThumbnails] = useState<Record<string, PageThumbnailDocument>>({})
  const [hoveredExperienceNodeId, setHoveredExperienceNodeId] = useState<string | null>(null)
  const [sectionTemplatesOpen, setSectionTemplatesOpen] = useState(true)
  const [addElementOpen, setAddElementOpen] = useState(true)
  const [sectionsListOpen, setSectionsListOpen] = useState(true)
  const [editorDetailsOpen, setEditorDetailsOpen] = useState(true)
  const [templates, setTemplates] = useState<PageEditorTemplate[]>([])
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
    markDocumentDirty,
    updateElement,
    updateElementProps,
    updateSectionConfig,
    addSectionPreset,
    deleteSelectedSection,
    duplicateSelectedSection,
    moveSelectedSection,
    selectBlock,
    updateBlockProps,
    removeBlockFromSection,
    addBlockToSection: addBlockToSectionState,
  } = usePageEditorState({
    initialPageKey: requestedPageKey,
    eventInfo,
  })
  const displaySelectedElement = selectedElement ? getResponsiveElement(selectedElement, previewDevice) : null
  const {
    activePageSaveState,
    activePageIsDirty,
    registerLoadedPage,
    getRecoverySnapshot,
    clearRecoverySnapshot,
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
    handle: ResizeHandle
    scale: number
    startPointer: CanvasPoint
    startX: number
    startY: number
    startWidth: number
    startHeight: number
    lockAspectRatio: boolean
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
          event_title?: unknown
          event_stage?: unknown
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
          if (typeof data.event_title === "string" && data.event_title.trim()) setEventTitle(data.event_title.trim())
          if (typeof data.event_stage === "string" && data.event_stage.trim()) setEventStage(data.event_stage.trim())
        }

        const recovery = getRecoverySnapshot(pageKey)
        const shouldRecover = recovery ? window.confirm(`Recover unsaved changes from ${new Date(recovery.savedAt).toLocaleString()}? Choose Cancel to discard that local recovery copy.`) : false
        const recoveredSnapshot = shouldRecover && recovery ? {
          elements: normalizeEventPageElements(recovery.snapshot.elements),
          sections: normalizeSections(recovery.snapshot.sections),
          eventTheme: recovery.snapshot.eventTheme && typeof recovery.snapshot.eventTheme === "object" ? recovery.snapshot.eventTheme as EventTheme : snapshot.eventTheme,
        } : null
        if (recovery) clearRecoverySnapshot(pageKey)

        resetHistory(pageKey, snapshot)
        registerLoadedPage(
          pageKey,
          getDocumentRevision(pageKey),
          serverRevision,
          snapshot,
        )
        if (recoveredSnapshot) {
          resetHistory(pageKey, recoveredSnapshot)
          markDocumentDirty()
          setSaveMessage("Recovered unsaved local changes")
        }
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
    clearRecoverySnapshot,
    getDocumentRevision,
    getRecoverySnapshot,
    loadAttempt,
    markDocumentDirty,
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

        if (Array.isArray(data.templates)) {
          setTemplates(data.templates as PageEditorTemplate[])
        }
      } catch {
        console.error("Failed to load templates")
      }
    }

    void loadTemplates()
  }, [])

  useEffect(() => {
    async function loadPageManifest() {
      try {
        const response = await fetch(`/api/admin/page-editor/event/${slug}/pages`)
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || "Failed to load pages")
        setEditorPages((Array.isArray(data.pages) ? data.pages : []).map((page: Record<string, unknown>) => ({ pageKey: String(page.page_key), title: String(page.title), isSystem: Boolean(page.is_system) })))
      } catch (error) {
        console.error("Failed to load page manifest", error)
        setSaveMessage("Using built-in pages until page management is available")
      }
    }
    void loadPageManifest()
  }, [slug])

  useEffect(() => {
    if (!editorPages.length) return
    const abortController = new AbortController()
    async function loadThumbnails() {
      const entries = await Promise.all(editorPages.filter((page) => page.pageKey !== selectedPageKey).map(async (page) => {
        try {
          const response = await fetch(`/api/admin/page-editor/event/${slug}/elements?pageKey=${encodeURIComponent(page.pageKey)}`, { cache: "no-store", signal: abortController.signal })
          const data = await response.json().catch((): null => null)
          if (!response.ok || !data) return null
          return [page.pageKey, { elements: normalizeEventPageElements(data.elements), sections: normalizeSections(data.sections), eventTheme: data.eventTheme && typeof data.eventTheme === "object" ? data.eventTheme as EventTheme : eventThemeRef.current }] as const
        } catch { return null }
      }))
      if (!abortController.signal.aborted) setPageThumbnails(Object.fromEntries(entries.filter((entry): entry is NonNullable<typeof entry> => entry !== null)))
    }
    void loadThumbnails()
    return () => abortController.abort()
  }, [editorPages, selectedPageKey, slug])

  async function persistPageOrder(pages: EditorPageManifestItem[]) {
    const previousPages = editorPages
    setEditorPages(pages)
    setSaveMessage("Saving page order...")
    try {
      const response = await fetch(`/api/admin/page-editor/event/${slug}/pages`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pages }) })
      const data = await response.json().catch((): null => null)
      if (!response.ok) throw new Error(data?.error || "Page order could not be saved")
      setSaveMessage("Page order saved")
    } catch (error) {
      setEditorPages(previousPages)
      setSaveMessage(error instanceof Error ? error.message : "Page order could not be saved")
    }
  }

  async function createEditorPage(sourcePageKey?: string) {
    const title = window.prompt(sourcePageKey ? "Name the duplicated page" : "Name the new page", sourcePageKey ? "Copy of page" : "Untitled page")?.trim()
    if (!title) return
    try {
      setSaveMessage(sourcePageKey ? "Duplicating page..." : "Creating page...")
      const response = await fetch(`/api/admin/page-editor/event/${slug}/pages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, sourcePageKey }) })
      const data = await response.json().catch((): null => null)
      if (!response.ok) throw new Error(data?.error || "Page could not be created")
      const page = { pageKey: String(data.page.page_key), title: String(data.page.title), isSystem: false }
      setEditorPages((current) => [...current, page])
      await selectPage(page.pageKey)
      setSaveMessage(sourcePageKey ? "Page duplicated" : "Page created")
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "Page could not be created")
    }
  }

  async function renameEditorPage(page: EditorPageManifestItem) {
    const title = window.prompt("Rename page", page.title)?.trim()
    if (!title || title === page.title) return
    await persistPageOrder(editorPages.map((item) => item.pageKey === page.pageKey ? { ...item, title } : item))
  }

  async function deleteEditorPage(page: EditorPageManifestItem) {
    if (page.isSystem || !window.confirm(`Delete “${page.title}”? This cannot be undone.`)) return
    const response = await fetch(`/api/admin/page-editor/event/${slug}/pages`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pageKey: page.pageKey }) })
    const data = await response.json().catch((): null => null)
    if (!response.ok) { setSaveMessage(data?.error || "Page could not be deleted"); return }
    const remaining = editorPages.filter((item) => item.pageKey !== page.pageKey)
    setEditorPages(remaining)
    if (selectedPageKey === page.pageKey) await selectPage(remaining[0]?.pageKey ?? "event_home")
  }

  useEffect(() => {
    if (activeToolPanel !== "media" || !eventAdminId) return
    const abortController = new AbortController()
    async function loadAssets() {
      try {
        const response = await fetch(`/api/admin/page-editor/upload-media?eventId=${encodeURIComponent(eventAdminId!)}`, { signal: abortController.signal })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || "Failed to load media")
        setEditorAssets(Array.isArray(data.assets) ? data.assets : [])
      } catch (error) {
        if (!abortController.signal.aborted) setSaveMessage(error instanceof Error ? error.message : "Failed to load media")
      }
    }
    void loadAssets()
    return () => abortController.abort()
  }, [activeToolPanel, eventAdminId])

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
        return
      }

      if (key === "g") {
        e.preventDefault()
        setShowGrid((value) => !value)
        return
      }

      if (key === "r") {
        e.preventDefault()
        setShowRulers((value) => !value)
        return
      }

      if (commandKey && e.shiftKey && key === "c") {
        e.preventDefault()
        if (selectedElement) {
          setCopiedElementStyle(structuredClone(selectedElement.props ?? {}))
        }
        return
      }

      if (commandKey && e.shiftKey && key === "v") {
        e.preventDefault()
        if (copiedElementStyle && (selectedId || selectedIds.length > 0)) {
          const targetIds = selectedIds.length > 0 ? selectedIds : [selectedId]
          setElements((prev) =>
            prev.map((el) =>
              targetIds.includes(el.id)
                ? { ...el, props: { ...(el.props ?? {}), ...copiedElementStyle } }
                : el
            )
          )
        }
        return
      }

      if (key === "?") {
        e.preventDefault()
        void showNotice({
          title: "Keyboard Shortcuts",
          message:
            "Cmd+Z / Cmd+Shift+Z — Undo / Redo\nCmd+D — Duplicate\nCmd+G / Cmd+Shift+G — Group / Ungroup\nCmd+A — Select all\nCmd+Shift+C / Cmd+Shift+V — Copy / Paste style\nArrows — Nudge (Shift x10)\nG — Toggle grid\nR — Toggle rulers\nDelete — Remove selected\n? — Show shortcuts",
          tone: "default",
        })
        return
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [
    clearSelection,
    copiedElementStyle,
    documentReady,
    elements,
    isEditing,
    restoreHistorySnapshot,
    selectedElement,
    selectedId,
    selectedIds,
    setCopiedElementStyle,
    setElements,
    setShowGrid,
    setShowRulers,
    showNotice,
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
    handle: ResizeHandle,
    x: number,
    y: number,
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
      ? elements.filter((element) => getElementGroupId(element) === groupId).map((element) => getResponsiveElement(element, previewDevice))
      : []
    if (groupMembers.some((element) => element.locked === true)) return
    if (!canvasRef.current) return

    const startPointer = screenPointToCanvasPoint(
      e.clientX,
      e.clientY,
      canvasRef.current,
      canvasScale
    )

    const effectiveHandle = groupMembers.length > 1 ? "se" : handle

    beginTransaction()
    const groupSnapshot =
      effectiveHandle === "se" && groupMembers.length > 1
        ? getGroupResizeSnapshot(
            groupMembers.map((element) => ({
              id: element.id,
              x: element.x,
              y: element.y,
              width: element.width ?? 0,
              height: element.height ?? 0,
              props: element.props,
            }))
          )
        : null

    setAlignmentGuides({ vertical: [], horizontal: [], distances: [] })
    isDraggingRef.current = false
    resizeRef.current = {
      id,
      handle: effectiveHandle,
      scale: canvasScale,
      startPointer,
      startX: groupSnapshot?.bounds.x ?? x,
      startY: groupSnapshot?.bounds.y ?? y,
      startWidth: groupSnapshot?.bounds.width ?? width ?? 224,
      startHeight: groupSnapshot?.bounds.height ?? height ?? 56,
      lockAspectRatio: Boolean(targetElement?.props?.lockAspectRatio),
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
          return update ? applyResponsiveFramePatch(el, update, previewDevice) : el
        })
      )

      return
    }

    if (resizeRef.current) {
      if (!canvasRef.current) return

      const {
        id,
        handle,
        scale,
        startPointer,
        startX,
        startY,
        startWidth,
        startHeight,
        lockAspectRatio,
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

      const dx = snapToGrid(deltaX)
      const dy = snapToGrid(deltaY)

      let nextX = startX
      let nextY = startY
      let nextWidth = startWidth
      let nextHeight = startHeight

      if (handle.includes("e")) nextWidth = startWidth + dx
      if (handle.includes("w")) {
        nextWidth = startWidth - dx
        nextX = startX + dx
      }
      if (handle.includes("s")) nextHeight = startHeight + dy
      if (handle.includes("n")) {
        nextHeight = startHeight - dy
        nextY = startY + dy
      }

      if ((lockAspectRatio || e.shiftKey) && handle.length === 2 && startWidth > 0 && startHeight > 0) {
        const ratio = startWidth / startHeight
        const widthChange = Math.abs((nextWidth - startWidth) / startWidth)
        const heightChange = Math.abs((nextHeight - startHeight) / startHeight)
        if (widthChange >= heightChange) nextHeight = nextWidth / ratio
        else nextWidth = nextHeight * ratio
        if (handle.includes("w")) nextX = startX + startWidth - nextWidth
        if (handle.includes("n")) nextY = startY + startHeight - nextHeight
      }

      if (groupSnapshot) {
        nextWidth = Math.max(minimumGroupDimensions?.width ?? 96, nextWidth)
        nextHeight = Math.max(minimumGroupDimensions?.height ?? 32, nextHeight)
      } else {
        nextWidth = Math.max(96, nextWidth)
        nextHeight = Math.max(32, nextHeight)
        nextX = Math.max(0, nextX)
        nextY = Math.max(0, nextY)
      }

      if (
        nextX === startX &&
        nextY === startY &&
        nextWidth === startWidth &&
        nextHeight === startHeight
      ) {
        return
      }

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
            return update ? applyResponsiveFramePatch(element, update, previewDevice) : element
          })
        )
        return
      }

      setElements((prev) =>
        prev.map((el) =>
          el.id === id
            ? applyResponsiveFramePatch(el, { x: nextX, y: nextY, width: nextWidth, height: nextHeight }, previewDevice)
            : el
        )
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
          .map((element) => getResponsiveElement(element, previewDevice))
          .filter((element) => (element as EditorElement).visible !== false)
          .filter(
            (element) =>
              !((previewDevice === "mobile" && Boolean(element.props?.hideOnMobile)) || (previewDevice === "tablet" && Boolean(element.props?.hideOnTablet)) || (previewDevice === "desktop" && Boolean(element.props?.hideOnDesktop)))
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
        el.id === id ? applyResponsiveFramePatch(el, { x: alignment.x, y: alignment.y }, previewDevice) : el
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

    const groupableElements = elements.map((element) => getResponsiveElement(element, previewDevice)).map((element) => ({
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
        return update ? applyResponsiveFramePatch(element, update, previewDevice) : element
      })
    )
  }

  async function uploadMediaFile(file: File, onProgress?: (percent: number) => void) {
    if (!eventAdminId) throw new Error("Event context is still loading")
    const res = await fetch("/api/admin/page-editor/upload-media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: eventAdminId, file_name: file.name, file_size: file.size, content_type: file.type }),
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data?.error || "Upload failed")
    }

    if (!data?.path || !data?.token || !data?.signedUrl) throw new Error("Upload signer returned invalid data")
    await new Promise<void>((resolve, reject) => {
      const request = new XMLHttpRequest()
      request.open("PUT", String(data.signedUrl))
      request.setRequestHeader("x-upsert", "false")
      request.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100))
      })
      request.addEventListener("load", () => {
        if (request.status >= 200 && request.status < 300) { onProgress?.(100); resolve(); return }
        try {
          const uploadError = JSON.parse(request.responseText) as { message?: string; error?: string }
          reject(new Error(uploadError.message ?? uploadError.error ?? `Upload failed (${request.status})`))
        } catch { reject(new Error(`Upload failed (${request.status})`)) }
      })
      request.addEventListener("error", () => reject(new Error("Upload connection failed")))
      request.addEventListener("abort", () => reject(new Error("Upload cancelled")))
      const formData = new FormData()
      formData.append("cacheControl", "3600")
      formData.append("", file)
      request.send(formData)
    })

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

  function commitRichTextEdit(id: string, value: string, runs: RichTextRun[]) {
    runTransaction(() => setElements((current) => current.map((element) => {
      if (element.id !== id) return element
      if (previewDevice === "desktop") return { ...element, content: value, props: { ...(element.props ?? {}), richTextRuns: runs } }
      const props = element.props ?? {}
      const responsiveStyles = props.responsiveStyles && typeof props.responsiveStyles === "object" && !Array.isArray(props.responsiveStyles) ? props.responsiveStyles as Record<string, unknown> : {}
      const override = responsiveStyles[previewDevice] && typeof responsiveStyles[previewDevice] === "object" && !Array.isArray(responsiveStyles[previewDevice]) ? responsiveStyles[previewDevice] as Record<string, unknown> : {}
      const overrideProps = override.props && typeof override.props === "object" && !Array.isArray(override.props) ? override.props as Record<string, unknown> : {}
      return { ...element, props: { ...props, responsiveStyles: { ...responsiveStyles, [previewDevice]: { ...override, content: value, props: { ...overrideProps, richTextRuns: runs } } } } }
    })))
    setEditingElementId(null)
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
  updateSelectedBlockProps({ [key]: value })
}
function createDefaultRegistrationFieldDefinitions(): RegistrationFieldDefinition[] {
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

  const fields = selectedBlock.props.registrationFields

  return Array.isArray(fields) && fields.length > 0
    ? fields.filter(isRecord).map((field) => field as RegistrationFieldDefinition)
    : createDefaultRegistrationFieldDefinitions()
}

function updateRegistrationFields(nextFields: RegistrationFieldDefinition[]) {
  updateSelectedBlockProps({ registrationFields: nextFields })
}

function updateRegistrationField(
  fieldId: string,
  nextFieldProps: Record<string, unknown>
) {
  const fields = getSelectedRegistrationFields()

  updateRegistrationFields(
    fields.map((field) =>
      field.id === fieldId ? { ...field, ...nextFieldProps } : field
    )
  )
}

function moveRegistrationFieldInSelectedBlock(
  fieldId: string,
  direction: "up" | "down"
) {
  const fields = getSelectedRegistrationFields()
  const index = fields.findIndex((field) => field.id === fieldId)
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
): RegistrationFieldDefinition {
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
    getSelectedRegistrationFields().filter((field) => field.id !== fieldId)
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

  function addElement(elementType: AddableElementType, textPreset?: TextPreset) {
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
        const preset = textPreset === "heading"
          ? { content: "Add a heading", width: 560, height: 104, fontSize: 48, fontWeight: 800 }
          : textPreset === "subheading"
            ? { content: "Add a subheading", width: 440, height: 72, fontSize: 30, fontWeight: 700 }
            : textPreset === "body"
              ? { content: "Add body text", width: 400, height: 64, fontSize: 18, fontWeight: 400 }
              : { content: "New text block", width: 264, height: 56, fontSize: 22, fontWeight: 700 }
        nextElement = {
          id,
          element_type: "text",
          content: preset.content,
          x: 96,
          y: 120,
          width: preset.width,
          height: preset.height,
          z_index: highestZ + 1,
          props: {
            hideOnMobile: false,
            backgroundColor: "#2563eb",
            backgroundOpacity: 0.9,
            textColor: "#ffffff",
            fontSize: preset.fontSize,
            fontWeight: preset.fontWeight,
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

  function applyPageTemplate(templateId: string) {
    if (!documentReady) return
    const template = templates.find((item) => item.id === templateId)
    if (!template) return
    runTransaction(() => {
      setSections(normalizeSections(Array.isArray(template.sections_json) ? template.sections_json : []))
      setElements(Array.isArray(template.elements_json) ? template.elements_json : [])
      if (template.event_theme && typeof template.event_theme === "object") {
        setEventTheme(template.event_theme as EventTheme)
      }
    })
  }

  async function uploadAndAddAsset(file: File, onProgress?: (percent: number) => void) {
    try {
      setSaveMessage("Uploading media...")
      const uploaded = await uploadMediaFile(file, onProgress)
      const asset: EditorAsset = {
        id: String(uploaded.id ?? uploaded.url ?? createElementId()),
        path: String(uploaded.path),
        url: String(uploaded.url),
        name: String(uploaded.fileName ?? file.name),
        type: String(uploaded.contentType ?? file.type),
      }
      setEditorAssets((current) => [...current.filter((item) => item.id !== asset.id), asset])
      addAssetElement(asset)
      setSaveMessage("Media added")
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "Upload failed")
      throw error
    }
  }

  async function deleteUploadedAsset(asset: EditorAsset) {
    if (!eventAdminId) return
    const referencedCount = elements.filter((element) => {
      const props = element.props ?? {}
      return props.src === asset.url || props.url === asset.url || props.posterUrl === asset.url
    }).length + (eventTheme.pageBackgroundImageUrl === asset.url ? 1 : 0)
    if (referencedCount) {
      setSaveMessage(`Remove the ${referencedCount} placed instance${referencedCount === 1 ? "" : "s"} from this page and wait for Saved before deleting the library asset.`)
      return
    }
    const warning = `Move “${asset.name}” to Trash? You can restore it later.`
    if (!window.confirm(warning)) return
    const response = await fetch("/api/admin/page-editor/upload-media", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: eventAdminId, path: asset.path, url: asset.url }),
    })
    const data = await response.json().catch((): null => null) as { error?: string } | null
    if (!response.ok) { setSaveMessage(data?.error || "Delete failed"); return }
    setEditorAssets((current) => current.map((item) => item.path === asset.path ? { ...item, path: String((data as { path?: string } | null)?.path ?? item.path), trashed: true, originalPath: item.path } : item))
    setSaveMessage("Asset moved to Trash")
  }

  async function restoreUploadedAsset(asset: EditorAsset) {
    if (!eventAdminId || !asset.originalPath) return
    const response = await fetch("/api/admin/page-editor/upload-media", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event_id: eventAdminId, path: asset.path, original_path: asset.originalPath }) })
    const data = await response.json().catch((): null => null) as { error?: string; path?: string; url?: string } | null
    if (!response.ok) { setSaveMessage(data?.error || "Restore failed"); return }
    setEditorAssets((current) => current.map((item) => item.path === asset.path ? { ...item, path: data?.path ?? asset.originalPath!, url: data?.url ?? item.url, trashed: false, originalPath: undefined } : item))
    setSaveMessage("Asset restored")
  }

  async function permanentlyDeleteUploadedAsset(asset: EditorAsset) {
    if (!eventAdminId || !asset.trashed || !window.confirm(`Permanently delete “${asset.name}”? This cannot be undone.`)) return
    const response = await fetch("/api/admin/page-editor/upload-media", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event_id: eventAdminId, path: asset.path, url: asset.url, permanent: true }) })
    const data = await response.json().catch((): null => null) as { error?: string } | null
    if (!response.ok) { setSaveMessage(data?.error || "Permanent delete failed"); return }
    setEditorAssets((current) => current.filter((item) => item.path !== asset.path))
    setSaveMessage("Asset permanently deleted")
  }

  function addAppSection(componentKey: SystemComponentKey) {
    const block = createSystemBlock(componentKey)
    const sectionId = `app-${componentKey}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const label = componentKey.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase())
    const section: EventPageSection = {
      id: sectionId,
      type: "system",
      config: {
        ...getSafeDefaultSectionConfig("system"),
        adminLabel: label,
        title: label,
        body: `Jupiter ${label} experience.`,
      },
      blocks: [block],
    }
    setHasUnsavedChanges(true)
    setSections((current) => normalizeSectionIds([...current, section]))
    setSelectedSectionId(sectionId)
    setSelectedBlockId(block.id)
    setSelectedId(null)
    setSelectedIds([])
    setRightRailTab("inspect")
  }

  function addAssetElement(asset: { id: string; url: string; name: string; type: string }) {
    const id = createElementId()
    const highestZ = elements.reduce((max, el) => Math.max(max, el.z_index ?? 0), 0)

    let nextElement: EditorElement

    if (asset.type.startsWith("video/")) {
      nextElement = {
        id,
        element_type: "video",
        content: asset.name,
        x: 96,
        y: 120,
        width: 320,
        height: 184,
        z_index: highestZ + 1,
        props: {
          src: asset.url,
          source: "upload",
          controls: true,
          autoplay: false,
          loop: false,
          muted: true,
          hideOnMobile: false,
        },
      }
    } else if (asset.type === "application/pdf") {
      nextElement = {
        id,
        element_type: "pdf",
        content: asset.name,
        x: 96,
        y: 120,
        width: 240,
        height: 120,
        z_index: highestZ + 1,
        props: {
          url: asset.url,
          hideOnMobile: false,
        },
      }
    } else {
      nextElement = {
        id,
        element_type: "image",
        content: asset.name,
        x: 96,
        y: 120,
        width: 320,
        height: 184,
        z_index: highestZ + 1,
        props: {
          src: asset.url,
          alt: asset.name,
          hideOnMobile: false,
          imageFit: "cover",
          imagePosition: "center",
        },
      }
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
    setEditingElementId(null)
    setRightRailTab("inspect")
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
      elements: elements.map((element) => getResponsiveElement(element, previewDevice)).map((element) => ({
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
        return update ? applyResponsiveFramePatch(element, update, previewDevice) : element
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
    const name = await promptNotice({ title: "Save page template", message: "Give this reusable Jupiter template a clear name.", placeholder: "Template name", confirmLabel: "Save template" })
    if (!name) return

    const response = await fetch("/api/admin/page-editor/templates", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        sections,
        elements,
        eventTheme,
      }),
    })
    const data = await response.json().catch((): null => null)
    if (!response.ok || !data?.template) {
      await showNotice({ title: "Template not saved", message: String(data?.error ?? "The template service did not accept this page."), tone: "danger" })
      return
    }
    setTemplates((current) => [data.template as PageEditorTemplate, ...current.filter((template) => template.id !== data.template.id)])

    await showNotice({ title: "Template saved", message: `“${name}” is now available in the page editor.`, tone: "success" })
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
    } catch (err: unknown) {
      setSaveMessage(err instanceof Error ? err.message : "Image upload failed")
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
    } catch (err: unknown) {
      setSaveMessage(err instanceof Error ? err.message : "PDF upload failed")
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
    } catch (err: unknown) {
      setSaveMessage(err instanceof Error ? err.message : "Video upload failed")
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
    } catch (err: unknown) {
      setSaveMessage(err instanceof Error ? err.message : "Poster upload failed")
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
    : previewDevice === "mobile"
      ? "mx-auto w-[390px] max-w-full"
      : previewDevice === "tablet"
        ? "mx-auto w-[768px] max-w-full"
        : "w-full"

  const canvasScale = previewDevice === "desktop" ? canvasZoom : 1
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

  function downloadRecoveryBackup() {
    const payload = JSON.stringify({
      eventSlug: slug,
      pageKey: selectedPageKey,
      revision: documentRevision,
      savedAt: new Date().toISOString(),
      document: { sections, elements, eventTheme },
    }, null, 2)
    const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }))
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `${slug}-${selectedPageKey}-recovery.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className={EXPERIENCE_EDITOR_ROOT_CLASS}>
      {!isEmbedded && (
        <PageEditorToolbar
          isEmbedded={isEmbedded}
          eventTitle={eventInfo.title}
          eventAdminHref={eventAdminId ? `/admin/events/${eventAdminId}` : null}
          selectedPageKey={selectedPageKey}
          pages={editorPages}
          templates={documentReady ? templates : []}
          canUndo={documentReady && canUndo}
          canRedo={documentReady && canRedo}
          canvasZoom={canvasZoom}
          isMobilePreview={isMobilePreview}
          previewDevice={previewDevice}
          isEditing={isEditing && documentReady}
          isCodeEditorOpen={isCodeEditorOpen}
          selectedElementCount={documentReady ? selectedElementCount : 0}
          canGroupElements={documentReady && canGroupElements}
          canUngroupElements={documentReady && canUngroupElements}
          showGrid={showGrid}
          showRulers={showRulers}
          canCopyStyle={documentReady && Boolean(selectedElement)}
          canPasteStyle={documentReady && Boolean(copiedElementStyle) && Boolean(selectedElement || selectedIds.length > 0)}
          saveStatus={saveStatusMessage}
          eventStage={eventStage}
          onSelectPage={(pageKey) => {
            void selectPage(pageKey)
          }}
          onSelectTemplate={(templateId) => {
            applyPageTemplate(templateId)
          }}
          onUndo={() => restoreHistorySnapshot("undo")}
          onRedo={() => restoreHistorySnapshot("redo")}
          onChangeZoom={setCanvasZoom}
          onChangePreviewDevice={setPreviewDevice}
          onToggleEditing={toggleEditing}
          onToggleCodeEditor={() => {
            setIsCodeEditorOpen((value) => !value)
            setIsEditing(false)
            clearSelection()
          }}
          onAlignElements={executeElementAlignmentCommand}
          onGroupElements={groupSelectedElements}
          onUngroupElements={ungroupSelectedElements}
          onPreview={() => window.open(getPublicEditorPageUrl(slug, selectedPageKey), "_blank", "noopener,noreferrer")}
          onShare={() => setCollaborationOpen(true)}
          onPublish={() => {
            void flushCurrentPage().then((saved) => {
              if (!saved || !eventAdminId) return
              window.location.assign(`/admin/events/${eventAdminId}/publishing`)
            })
          }}
          onToggleGrid={() => setShowGrid((value) => !value)}
          onToggleRulers={() => setShowRulers((value) => !value)}
          onCopyStyle={() => {
            if (selectedElement) {
              setCopiedElementStyle(structuredClone(selectedElement.props ?? {}))
            }
          }}
          onPasteStyle={() => {
            if (copiedElementStyle && (selectedId || selectedIds.length > 0)) {
              const targetIds = selectedIds.length > 0 ? selectedIds : [selectedId!]
              setElements((prev) =>
                prev.map((el) =>
                  targetIds.includes(el.id)
                    ? { ...el, props: { ...(el.props ?? {}), ...copiedElementStyle } }
                    : el
                )
              )
            }
          }}
        />
      )}

      {!isEmbedded && (activePageSaveState.status === "conflict" || activePageSaveState.status === "failed") ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-300/18 bg-amber-400/10 px-5 py-3 text-sm text-amber-50">
          <div>
            <strong>{activePageSaveState.status === "conflict" ? "A newer version exists" : "This page has not saved"}</strong>
            <span className="ml-2 text-amber-100/64">Your local work is still available in this editor.</span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={downloadRecoveryBackup} className="rounded-lg border border-amber-100/20 px-3 py-1.5 text-xs font-bold hover:bg-white/10">Download backup</button>
            {activePageSaveState.status === "failed" ? (
              <button type="button" onClick={() => { void flushCurrentPage() }} className="rounded-lg bg-amber-200 px-3 py-1.5 text-xs font-bold text-amber-950 hover:bg-amber-100">Retry save</button>
            ) : (
              <button type="button" onClick={() => {
                if (!window.confirm("Reload the server version? Download a backup first if you need to preserve local changes.")) return
                setLoadAttempt((attempt) => attempt + 1)
              }} className="rounded-lg bg-amber-200 px-3 py-1.5 text-xs font-bold text-amber-950 hover:bg-amber-100">Reload latest</button>
            )}
          </div>
        </div>
      ) : null}

            <div className="relative flex min-h-0 flex-1 overflow-hidden">
              {!isEmbedded && !isCodeEditorOpen ? (
                <EditorToolDock
                  activePanel={activeToolPanel}
                  saveStatus={activePageSaveState.status}
                  onSaveAction={() => {
                    if (activePageSaveState.status === "conflict") {
                      downloadRecoveryBackup()
                      return
                    }
                    void flushCurrentPage()
                  }}
                  onChangePanel={(panel) => {
                    setToolPanelOpen((open) => panel === activeToolPanel ? !open : true)
                    setActiveToolPanel(panel)
                    setIsEditing(true)
                  }}
                />
              ) : null}
              {!isEmbedded && !isCodeEditorOpen && toolPanelOpen ? (
                <EditorToolPanelContent
                  activePanel={activeToolPanel}
                  templates={templates}
                  assets={editorAssets}
                  eventTheme={eventTheme}
                  onApplyTemplate={applyPageTemplate}
                  onAddElement={(type) => addElement(type)}
                  onAddTextPreset={(preset) => addElement("text", preset)}
                  onUpload={uploadAndAddAsset}
                  onAddAsset={addAssetElement}
                  onSetBackground={(asset) => updateEventTheme({ pageBackgroundImageUrl: asset?.url ?? "", pageBackgroundImageFit: "cover", pageBackgroundImagePosition: "center", pageBackgroundOverlay: 0.28 })}
                  onDeleteAsset={deleteUploadedAsset}
                  onRestoreAsset={restoreUploadedAsset}
                  onPermanentlyDeleteAsset={permanentlyDeleteUploadedAsset}
                  onUpdateTheme={updateEventTheme}
                  onAddApp={addAppSection}
                  onAddSection={(type, label) => {
                    const appByLabel: Partial<Record<string, SystemComponentKey>> = { Agenda: "agenda", Speakers: "speaker_cards", Sponsors: "sponsors", Resources: "resource_library" }
                    const app = appByLabel[label]
                    if (app) addAppSection(app)
                    else addSectionTemplate(type, label)
                  }}
                  onClose={() => setToolPanelOpen(false)}
                />
              ) : null}
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
                  {isEditing && selectedElement?.element_type === "text" ? (
                    <TextContextToolbar
                      element={selectedElement}
                      onUpdate={(props) => updateElementProps(selectedElement.id, props)}
                      onDuplicate={duplicateSelectedElement}
                      onToggleLock={() => updateElement(selectedElement.id, { locked: !selectedElement.locked })}
                      onDelete={deleteSelectedElement}
                    />
                  ) : null}
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
                      data-editor-canvas="true"
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
                    <CanvasGridOverlay
                      showGrid={showGrid}
                      showRulers={showRulers}
                      gridSize={GRID_SIZE}
                      scale={canvasZoom}
                    />
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

                    {isEditing && isDraggingRef.current && displaySelectedElement && (
                      <>
                        <div
                          className="pointer-events-none absolute inset-y-0 border-l border-cyan-400/70 border-dashed"
                          style={{
                            left: displaySelectedElement.x,
                            zIndex: 9998,
                          }}
                        />
                        <div
                          className="pointer-events-none absolute inset-x-0 border-t border-cyan-400/70 border-dashed"
                          style={{
                            top: displaySelectedElement.y,
                            zIndex: 9998,
                          }}
                        />
                        <div
                          className="pointer-events-none absolute rounded-md bg-cyan-400/90 px-2 py-1 text-[11px] font-semibold text-slate-950"
                          style={{
                            left: displaySelectedElement.x + 8,
                            top: Math.max(8, displaySelectedElement.y - 28),
                            zIndex: 9999,
                          }}
                        >
                          {displaySelectedElement.x}, {displaySelectedElement.y}
                        </div>
                      </>
                    )}

                                {normalizedElements
                    .map((el) => getResponsiveElement(el, previewDevice))
                    .filter((el) => el.visible !== false)
                    .filter((el) => !((previewDevice === "mobile" && Boolean(el.props?.hideOnMobile)) || (previewDevice === "tablet" && Boolean(el.props?.hideOnTablet)) || (previewDevice === "desktop" && Boolean(el.props?.hideOnDesktop))))
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

                                elements.map((item) => getResponsiveElement(item, previewDevice)).forEach((item) => {
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
                            style={{ ...getElementFrameStyle(el), ...getElementIntroAnimationStyle(el) }}
                          >
                                                        {isLocked && (
                              <div className="pointer-events-none absolute right-2 top-2 z-30 flex h-6 w-6 items-center justify-center rounded-full border border-amber-300/30 bg-amber-500/12 text-[10px] font-black text-amber-100/70 shadow-[0_0_18px_rgba(251,191,36,0.18)] backdrop-blur-sm">
                                L
                              </div>
                            )}
                            {showInlineEditor ? (
                              <div className="h-full w-full p-2">
                                {el.element_type === "text" ? (
                                  <RichTextInlineEditor content={el.content} runs={Array.isArray(el.props?.richTextRuns) ? el.props.richTextRuns as RichTextRun[] : []} onCommit={(value, runs) => commitRichTextEdit(el.id, value, runs)} onCancel={() => setEditingElementId(null)} />
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
                                <RichTextContent content={el.content} runs={el.props?.richTextRuns} />
                              </div>
                            )}

                            {isEditing && !showInlineEditor && !isLocked && (
                              <ResizeHandles
                                handles={
                                  groupMemberIds.length > 1
                                    ? ["se"]
                                    : ["nw", "n", "ne", "w", "e", "sw", "s", "se"]
                                }
                                onResizeStart={(e, handle) =>
                                  startResize(
                                    e,
                                    el.id,
                                    handle,
                                    el.x,
                                    el.y,
                                    el.width,
                                    el.height
                                  )
                                }
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
            previewDevice,
            moveRegistrationFieldInSelectedBlock,
            moveSelectedBlock,
            moveSelectedSection,
            onUploadAsset: async (file) => {
              try {
                setSaveMessage("Uploading...")
                const data = await uploadMediaFile(file)
                setSaveMessage("Upload complete")
                return {
                  url: data.url,
                  name: data.fileName ?? file.name,
                  type: data.contentType ?? file.type,
                }
              } catch (err) {
                setSaveMessage(err instanceof Error ? err.message : "Upload failed")
                return null
              }
            },
            onInsertAsset: addAssetElement,
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
      {!isEmbedded && documentReady && !isCodeEditorOpen ? (
        <PageFilmstrip
          selectedPageKey={selectedPageKey}
          pages={editorPages}
          onSelectPage={(pageKey) => {
            void selectPage(pageKey)
          }}
          onAddPage={() => { void createEditorPage() }}
          onRenamePage={(page) => { void renameEditorPage(page) }}
          onDuplicatePage={(page) => { void createEditorPage(page.pageKey) }}
          onDeletePage={(page) => { void deleteEditorPage(page) }}
          onReorderPages={(pages) => { void persistPageOrder(pages) }}
          thumbnailDocuments={pageThumbnails}
          currentDocument={{ elements: normalizedElements, sections, eventTheme }}
        />
      ) : null}
      {collaborationOpen && !isEmbedded ? <EditorCollaborationPanel slug={slug} pageKey={selectedPageKey} selectedElementId={selectedElement?.id ?? null} publicUrl={getPublicEditorPageUrl(slug, selectedPageKey)} teamHref={eventAdminId ? `/admin/events/${eventAdminId}/settings` : null} onClose={() => setCollaborationOpen(false)} /> : null}
  </div>
  )
}
