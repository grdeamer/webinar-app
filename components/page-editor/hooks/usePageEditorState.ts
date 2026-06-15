import { useCallback, useMemo, useState } from "react"

import { SYSTEM_COMPONENTS } from "@/lib/page-editor/systemComponentRegistry"
import {
  createDefaultEventHomeSections,
  getDefaultSectionConfig,
  getSectionRegistryItem,
} from "@/lib/page-editor/sectionRegistry"
import type {
  EventTheme,
  SectionBlock,
  SectionConfig,
  SectionType,
  SystemComponentKey,
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

type UsePageEditorStateParams = {
  initialPageKey?: string
  eventInfo: {
    title: string
    description?: string | null
  }
}

const DEFAULT_EVENT_THEME: EventTheme = {
  pageBackgroundColor: "#020617",
  panelBackgroundColor: "#0f172a",
  panelBorderColor: "rgba(255,255,255,0.10)",
  textColor: "#ffffff",
  gradientColorA: "#0f172a",
  gradientColorB: "#1d4ed8",
  gradientAngle: "135deg",
}

function toTitleCase(value: string): string {
  return value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
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

export function getSafeSectionLabel(type: string): string {
  return getSafeSectionRegistryItem(type).label
}

export function getSystemComponentLabel(componentKey: SystemComponentKey): string {
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
  },
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

function normalizeSectionIds(inputSections: EventPageSection[]): EventPageSection[] {
  const used = new Set<string>()

  return inputSections.map((section, index) => {
    const baseId = section.id?.trim() || (section.type === "hero" ? "hero" : "content")
    let nextId = baseId

    if (used.has(nextId)) {
      nextId = `${baseId}-${index + 1}`
    }

    used.add(nextId)

    return {
      ...section,
      id: nextId,
    }
  })
}

export default function usePageEditorState({
  initialPageKey = "event_home",
  eventInfo,
}: UsePageEditorStateParams) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [editingElementId, setEditingElementId] = useState<string | null>(null)
  const [selectedPageKey, setSelectedPageKey] = useState<string>(initialPageKey)
  const [pageStates, setPageStates] = useState<
    Record<
      string,
      {
        sections: EventPageSection[]
        elements: EditorElement[]
        eventTheme: EventTheme
      }
    >
  >({})
  const [elements, setElements] = useState<EditorElement[]>([])
  const [sections, setSections] = useState<EventPageSection[]>(() =>
    getDefaultSections(initialPageKey, eventInfo),
  )
  const [eventTheme, setEventTheme] = useState<EventTheme>(DEFAULT_EVENT_THEME)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [historyIndex, setHistoryIndex] = useState(0)
  const [historySnapshots, setHistorySnapshots] = useState<
    Array<{
      sections: EventPageSection[]
      elements: EditorElement[]
      eventTheme: EventTheme
    }>
  >([])

  const selectedElement = useMemo(() => {
    if (!selectedId) return null
    return elements.find((element) => element.id === selectedId) ?? null
  }, [elements, selectedId])

  const selectedSection = useMemo(() => {
    if (!selectedSectionId) return null
    return sections.find((section) => section.id === selectedSectionId) ?? null
  }, [sections, selectedSectionId])

  const selectedBlock = useMemo(() => {
    if (!selectedSection || !selectedBlockId) return null
    return selectedSection.blocks?.find((block) => block.id === selectedBlockId) ?? null
  }, [selectedBlockId, selectedSection])

  const clearSelection = useCallback((): void => {
    setSelectedId(null)
    setSelectedIds([])
    setSelectedSectionId(null)
    setSelectedBlockId(null)
    setEditingElementId(null)
  }, [])

  const selectElement = useCallback((elementId: string): void => {
    setSelectedId(elementId)
    setSelectedIds([elementId])
    setSelectedSectionId(null)
    setSelectedBlockId(null)
  }, [])

  const selectSection = useCallback((sectionId: string): void => {
    setSelectedSectionId(sectionId)
    setSelectedBlockId(null)
    setSelectedId(null)
    setSelectedIds([])
    setEditingElementId(null)
  }, [])

  const selectBlock = useCallback((sectionId: string, blockId: string): void => {
    setSelectedSectionId(sectionId)
    setSelectedBlockId(blockId)
    setSelectedId(null)
    setSelectedIds([])
    setEditingElementId(null)
  }, [])

  const updateElement = useCallback((id: string, patch: Partial<EditorElement>): void => {
    setHasUnsavedChanges(true)
    setElements((current) =>
      current.map((element) => (element.id === id ? { ...element, ...patch } : element)),
    )
  }, [])

  const updateElementProps = useCallback(
    (id: string, patch: Record<string, unknown>): void => {
      setHasUnsavedChanges(true)
      setElements((current) =>
        current.map((element) =>
          element.id === id
            ? {
                ...element,
                props: {
                  ...(element.props ?? {}),
                  ...patch,
                },
              }
            : element,
        ),
      )
    },
    [],
  )

  const updateSectionConfig = useCallback(
    (id: string, patch: Partial<SectionConfig>): void => {
      setHasUnsavedChanges(true)
      setSections((current) =>
        current.map((section) =>
          section.id === id
            ? {
                ...section,
                config: {
                  ...section.config,
                  ...patch,
                },
              }
            : section,
        ),
      )
    },
    [],
  )

  const getNextContentId = useCallback((): string => {
    const contentCount = sections.filter((section) => section.type !== "hero").length
    return contentCount === 0 ? "content" : `content-${contentCount + 1}`
  }, [sections])

  const addSectionPreset = useCallback(
    (type: SectionType): void => {
      if (type === "hero") {
        const existingHero = sections.find((section) => section.type === "hero")
        if (existingHero) {
          selectSection(existingHero.id)
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

      const nextSection: EventPageSection = {
        id: nextId,
        type,
        config: getSafeDefaultSectionConfig(type),
        blocks: [],
      }

      setHasUnsavedChanges(true)
      setSections((current) => normalizeSectionIds([...current, nextSection]))
      selectSection(nextId)
    },
    [getNextContentId, sections, selectSection],
  )

  const deleteSelectedSection = useCallback((): void => {
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
  }, [sections, selectedSectionId])

  const duplicateSelectedSection = useCallback((): void => {
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
    setSections((current) => {
      const next = [...current]
      next.splice(selectedIndex + 1, 0, duplicatedSection)
      return normalizeSectionIds(next)
    })

    setSelectedSectionId(nextId)
    setSelectedBlockId(null)
    setSelectedId(null)
  }, [getNextContentId, sections, selectedSectionId])
  const moveSelectedSection = useCallback(
    (direction: "up" | "down"): void => {
      if (!selectedSectionId) return

      setSections((current) => {
        const currentIndex = current.findIndex(
          (section) => section.id === selectedSectionId,
        )

        if (currentIndex === -1) {
          return current
        }

        const targetIndex =
          direction === "up"
            ? Math.max(0, currentIndex - 1)
            : Math.min(current.length - 1, currentIndex + 1)

        if (targetIndex === currentIndex) {
          return current
        }

        const next = [...current]
        const [movedSection] = next.splice(currentIndex, 1)

        if (!movedSection) {
          return current
        }

        next.splice(targetIndex, 0, movedSection)

        setHasUnsavedChanges(true)

        return next
      })
    },
    [selectedSectionId],
  )
  const reorderSections = useCallback(
    (nextSectionIds: string[]): void => {
      setHasUnsavedChanges(true)

      setSections((current) => {
        const sectionMap = new Map(current.map((section) => [section.id, section]))

        const reordered = nextSectionIds
          .map((id) => sectionMap.get(id))
          .filter((section): section is EventPageSection => Boolean(section))

        const missingSections = current.filter(
          (section) => !nextSectionIds.includes(section.id),
        )

        return [...reordered, ...missingSections]
      })
    },
    [],
  )

  const updateBlock = useCallback(
    (
      sectionId: string,
      blockId: string,
      patch: Partial<SectionBlock>,
    ): void => {
      setHasUnsavedChanges(true)

      setSections((current) =>
        current.map((section) => {
          if (section.id !== sectionId) {
            return section
          }

          return {
            ...section,
            blocks: (section.blocks ?? []).map((block) =>
              block.id === blockId
                ? ({
                    ...block,
                    ...patch,
                  } as SectionBlock)
                : block,
            ),
          }
        }),
      )
    },
    [],
  )

  const updateBlockProps = useCallback(
    (
      sectionId: string,
      blockId: string,
      patch: Record<string, unknown>,
    ): void => {
      setHasUnsavedChanges(true)

      setSections((current) =>
        current.map((section) => {
          if (section.id !== sectionId) {
            return section
          }

          return {
            ...section,
            blocks: (section.blocks ?? []).map((block) =>
              block.id === blockId
                ? ({
                    ...block,
                    props: {
                      ...(block.props ?? {}),
                      ...patch,
                    },
                  } as SectionBlock)
                : block,
            ),
          }
        }),
      )
    },
    [],
  )

  const addBlockToSection = useCallback(
    (sectionId: string, block: SectionBlock): void => {
      setHasUnsavedChanges(true)

      setSections((current) =>
        current.map((section) => {
          if (section.id !== sectionId) {
            return section
          }

          return {
            ...section,
            blocks: [...(section.blocks ?? []), block],
          }
        }),
      )
    },
    [],
  )

  const removeBlockFromSection = useCallback(
    (sectionId: string, blockId: string): void => {
      setHasUnsavedChanges(true)

      setSections((current) =>
        current.map((section) => {
          if (section.id !== sectionId) {
            return section
          }

          return {
            ...section,
            blocks: (section.blocks ?? []).filter((block) => block.id !== blockId),
          }
        }),
      )

      if (selectedBlockId === blockId) {
        setSelectedBlockId(null)
      }
    },
    [selectedBlockId],
  )
  const createHistorySnapshot = useCallback((): void => {
    setHistorySnapshots((current) => {
      const nextSnapshot = {
        sections,
        elements,
        eventTheme,
      }

      const trimmed = current.slice(0, historyIndex + 1)

      return [...trimmed, nextSnapshot].slice(-40)
    })

    setHistoryIndex((current) => Math.min(current + 1, 39))
  }, [elements, eventTheme, historyIndex, sections])

  const restoreHistorySnapshot = useCallback(
    (direction: "undo" | "redo"): void => {
      setHistorySnapshots((currentSnapshots) => {
        if (currentSnapshots.length === 0) {
          return currentSnapshots
        }

        const nextIndex =
          direction === "undo"
            ? Math.max(0, historyIndex - 1)
            : Math.min(currentSnapshots.length - 1, historyIndex + 1)

        const snapshot = currentSnapshots[nextIndex]

        if (!snapshot) {
          return currentSnapshots
        }

        setSections(snapshot.sections)
        setElements(snapshot.elements)
        setEventTheme(snapshot.eventTheme)
        setHasUnsavedChanges(true)
        setHistoryIndex(nextIndex)

        return currentSnapshots
      })
    },
    [historyIndex],
  )

  const switchPageState = useCallback(
    (pageKey: string): void => {
      setPageStates((current) => {
        const existingPageState = current[pageKey]

        if (existingPageState) {
          setSections(existingPageState.sections)
          setElements(existingPageState.elements)
          setEventTheme(existingPageState.eventTheme)
        } else {
          setSections(getDefaultSections(pageKey, eventInfo))
          setElements([])
          setEventTheme(DEFAULT_EVENT_THEME)
        }

        return {
          ...current,
          [selectedPageKey]: {
            sections,
            elements,
            eventTheme,
          },
        }
      })

      clearSelection()
      setSelectedPageKey(pageKey)
      setHasUnsavedChanges(false)
    },
    [
      clearSelection,
      elements,
      eventInfo,
      eventTheme,
      sections,
      selectedPageKey,
    ],
  )
  const markSaved = useCallback((): void => {
    setHasUnsavedChanges(false)
  }, [])

  return {
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
    setSelectedPageKey,
    pageStates,
    switchPageState,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    clearSelection,
    selectElement,
    selectSection,
    selectBlock,
    updateElement,
    updateElementProps,
    updateSectionConfig,
    addSectionPreset,
    deleteSelectedSection,
    duplicateSelectedSection,
    moveSelectedSection,
    reorderSections,
    updateBlock,
    updateBlockProps,
    addBlockToSection,
    removeBlockFromSection,
    historyIndex,
    historySnapshots,
    canUndo: historySnapshots.length > 0 && historyIndex > 0,
    canRedo: historySnapshots.length > 0 && historyIndex < historySnapshots.length - 1,
    createHistorySnapshot,
    restoreHistorySnapshot,
    markSaved,
  }
}