"use client"

import type { DragEvent, ReactNode } from "react"
import type {
  EventPageSection,
  SectionBlock,
  SystemComponentKey,
  EventTheme,
  ExperienceNode,
} from "@/lib/page-editor/sectionTypes"

type EventLike = {
  title: string
  description?: string | null
}

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

type RendererExperienceNode = ExperienceNode & {
  sourceType: "section" | "element"
}

type SystemComponentsMap = Partial<Record<SystemComponentKey, ReactNode>>

function sectionToExperienceNode(
  section: EventPageSection,
  index: number
): RendererExperienceNode {
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

function elementToExperienceNode(element: EditorElement): RendererExperienceNode {
  return {
    id: element.id,
    nodeType:
      element.element_type === "image" || element.element_type === "video" || element.element_type === "pdf"
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
    visible: true,
    locked: false,
    props: {
      elementType: element.element_type,
      content: element.content,
      ...element.props,
    },
  }
}

const RENDERER_ROOT_CLASS =
  "relative overflow-hidden rounded-[30px] border text-white shadow-[0_24px_90px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.040)]"

const RENDERER_TEXTURE_CLASS =
  "pointer-events-none absolute inset-0 opacity-[0.018] bg-[repeating-linear-gradient(to_bottom,rgba(255,255,255,0.018)_0px,rgba(255,255,255,0.018)_1px,transparent_1px,transparent_18px)]"

const RENDERER_TOP_GLOW_CLASS =
  "pointer-events-none absolute inset-x-[10%] top-0 h-px bg-gradient-to-r from-transparent via-violet-100/[0.12] to-transparent"

const SECTION_BASE_CLASS =
  "group/section relative overflow-hidden px-8 transition-all duration-300"

const SECTION_SELECTED_CLASS =
  "ring-2 ring-sky-300/80 ring-inset shadow-[inset_0_0_0_1px_rgba(125,211,252,0.24),0_0_38px_rgba(56,189,248,0.12)]"

const SECTION_EDITABLE_CLASS =
  "hover:bg-white/[0.018] hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.035)]"

const SECTION_SELECTION_BADGE_CLASS =
  "pointer-events-none absolute left-4 top-4 z-30 rounded-full border border-sky-200/20 bg-sky-300/[0.105] px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-sky-50/70 shadow-[0_0_18px_rgba(56,189,248,0.12)] backdrop-blur-md"


const SECTION_WORKSPACE_DRAG_BADGE_CLASS =
  "absolute right-4 top-4 z-30 rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white/42 shadow-[0_0_18px_rgba(0,0,0,0.18)] backdrop-blur-md transition group-hover/section:text-white/70"

const SECTION_ACTION_HUD_CLASS =
  "pointer-events-none absolute bottom-4 left-4 z-30 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/42 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/44 opacity-0 shadow-[0_18px_42px_rgba(0,0,0,0.24)] backdrop-blur-xl transition group-hover/section:opacity-100"

const SECTION_ACTION_HUD_ACTIVE_CLASS =
  "opacity-100 border-sky-200/18 bg-sky-400/[0.105] text-sky-50/66"

const SECTION_ACTION_DOT_CLASS =
  "h-1.5 w-1.5 rounded-full bg-white/24"

const SECTION_HOVER_EDGE_CLASS =
  "pointer-events-none absolute inset-x-[12%] top-0 z-20 h-px bg-gradient-to-r from-transparent via-sky-100/[0.11] to-transparent opacity-0 transition group-hover/section:opacity-100"

const SECTION_SELECTED_GLOW_CLASS =
  "pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.065),transparent_34%)]"

const SECTION_TOP_EDGE_CLASS =
  "pointer-events-none absolute inset-x-[8%] top-0 h-px bg-gradient-to-r from-transparent via-white/[0.070] to-transparent"

const SECTION_BOTTOM_EDGE_CLASS =
  "pointer-events-none absolute inset-x-[8%] bottom-0 h-px bg-gradient-to-r from-transparent via-white/[0.050] to-transparent"

const HERO_KICKER_CLASS =
  "inline-flex items-center rounded-full border border-violet-200/[0.14] bg-violet-300/[0.075] px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-violet-50/66 shadow-[0_0_18px_rgba(168,85,247,0.08)]"

const HERO_TITLE_CLASS =
  "mt-4 text-5xl font-semibold tracking-[-0.055em] leading-[0.95] md:text-6xl"

const HERO_BODY_CLASS =
  "mt-5 whitespace-pre-wrap text-base leading-8 text-white/62"

const SECTION_TITLE_CLASS =
  "text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl"

const SECTION_BODY_CLASS =
  "mt-4 whitespace-pre-wrap text-sm leading-7 text-white/58 md:text-[15px]"

const RICH_TEXT_TITLE_CLASS =
  "text-2xl font-semibold tracking-[-0.03em] text-white"

const RICH_TEXT_BODY_CLASS =
  "whitespace-pre-wrap text-sm leading-7 text-white/62 md:text-[15px]"

const ELEMENT_BASE_CLASS =
  "absolute overflow-hidden rounded-[18px] border border-white/[0.08] shadow-[0_18px_50px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.030)]"

const ELEMENT_SELECTION_CHROME_CLASS =
  "pointer-events-none absolute inset-0 rounded-[18px] border border-sky-200/38 shadow-[0_0_20px_rgba(56,189,248,0.14)]"

const SECTION_BLOCK_STACK_CLASS = "relative z-10 space-y-6"
const SECTION_BLOCK_STACK_WITH_HEADER_CLASS = "relative z-10 mt-8 space-y-6"

const SYSTEM_COMPONENT_CONTENT_CLASS = "relative z-10"

const ELEMENT_BUTTON_CLASS =
  "rounded-[14px] border border-blue-200/20 bg-blue-600 px-5 py-3 text-sm font-semibold text-white no-underline shadow-[0_12px_34px_rgba(37,99,235,0.24)] transition hover:bg-blue-500"

const EMPTY_VIDEO_BLOCK_CLASS =
  "flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.10),transparent_40%),#020617] text-sm font-semibold uppercase tracking-[0.16em] text-white/42"

const SPACER_BLOCK_CLASS =
  "flex h-full w-full items-center justify-center text-xs font-black uppercase tracking-[0.18em] text-white/34"

function getWidthClass(width?: EventPageSection["config"]["contentWidth"]) {
  switch (width) {
    case "md":
      return "max-w-3xl"
    case "lg":
      return "max-w-4xl"
    case "full":
      return "max-w-none"
    case "xl":
    default:
      return "max-w-6xl"
  }
}

function getPaddingYClass(paddingY?: EventPageSection["config"]["paddingY"]) {
  switch (paddingY) {
    case "sm":
      return "py-6"
    case "lg":
      return "py-14"
    case "md":
    default:
      return "py-8"
  }
}

function getSectionMinHeightClass(
  sectionType?: EventPageSection["type"],
  paddingY?: EventPageSection["config"]["paddingY"]
) {
  if (sectionType === "hero") return "min-h-[420px]"
  if (paddingY === "lg") return "min-h-[300px]"
  return "min-h-[220px]"
}

function getHeaderAlignmentClass(textAlign?: EventPageSection["config"]["textAlign"]) {
  return textAlign === "center" ? "mx-auto max-w-4xl text-center" : "max-w-4xl text-left"
}

function getOuterBg(
  backgroundStyle?: EventPageSection["config"]["backgroundStyle"],
  sectionType?: EventPageSection["type"]
) {
  if (sectionType === "hero") {
    switch (backgroundStyle) {
      case "transparent":
        return "bg-transparent"
      case "panel":
        return "bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.14),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.020))]"
      case "subtle":
      default:
        return "bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.10),transparent_32%),radial-gradient(circle_at_82%_20%,rgba(168,85,247,0.12),transparent_30%)]"
    }
  }

  switch (backgroundStyle) {
    case "subtle":
      return "bg-white/[0.018]"
    case "panel":
      return "bg-[linear-gradient(180deg,rgba(255,255,255,0.040),rgba(255,255,255,0.014))]"
    case "transparent":
    default:
      return "bg-transparent"
  }
}

function getCardClass(style?: "none" | "panel" | "subtle") {
  switch (style) {
    case "none":
      return ""
    case "subtle":
      return "relative overflow-hidden rounded-[24px] border border-white/[0.07] bg-white/[0.025] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]"
    case "panel":
    default:
      return "relative overflow-hidden rounded-[26px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.020))] p-6 shadow-[0_18px_58px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.035)]"
  }
}

function hasTopDivider(divider?: EventPageSection["config"]["divider"]) {
  return divider === "top" || divider === "both"
}

function hasBottomDivider(divider?: EventPageSection["config"]["divider"]) {
  return divider === "bottom" || divider === "both"
}

function renderBlock(
  block: SectionBlock,
  systemComponents: SystemComponentsMap
): ReactNode {
  if (block.type === "rich_text") {
    return (
      <div
        key={block.id}
        className={block.props.align === "center" ? "text-center" : "text-left"}
      >
        {block.props.title ? (
          <h3 className={RICH_TEXT_TITLE_CLASS}>{block.props.title}</h3>
        ) : null}

        {block.props.body ? (
          <div
            className={
              block.props.title ? `mt-4 ${RICH_TEXT_BODY_CLASS}` : RICH_TEXT_BODY_CLASS
            }
          >
            {block.props.body}
          </div>
        ) : null}
      </div>
    )
  }

  if (block.type === "system_component") {
    const node = systemComponents[block.props.componentKey]
    if (!node) return null

    const cardClass = getCardClass(block.props.containerStyle ?? "panel")

    return (
      <div key={block.id} className={cardClass || undefined}>
        {cardClass ? (
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.09] to-transparent" />
        ) : null}
        <div className={SYSTEM_COMPONENT_CONTENT_CLASS}>
          {block.props.title ? (
            <h3 className="text-xl font-semibold tracking-[-0.03em] text-white">{block.props.title}</h3>
          ) : null}

          {block.props.body ? (
            <p
              className={
                block.props.title
                  ? "mt-2 text-sm leading-7 text-white/56"
                  : "text-sm leading-7 text-white/56"
              }
            >
              {block.props.body}
            </p>
          ) : null}

          <div className={block.props.title || block.props.body ? "mt-4" : ""}>
            {node}
          </div>
        </div>
      </div>
    )
  }

  return null
}

function getFallbackSections(event: EventLike): EventPageSection[] {
  return [
    {
      id: "hero",
      type: "hero",
      config: {
        visible: true,
        title: event.title,
        body: event.description ?? null,
        adminLabel: "Hero",
        backgroundStyle: "subtle",
        contentWidth: "xl",
        paddingY: "lg",
        textAlign: "left",
        divider: "bottom",
        hideOnMobile: false,
      },
      blocks: [],
    },
    {
      id: "live-state",
      type: "content",
      config: {
        visible: true,
        title: "Live Status",
        body: null,
        adminLabel: "Live State",
        backgroundStyle: "transparent",
        contentWidth: "xl",
        paddingY: "md",
        textAlign: "left",
        divider: "none",
        hideOnMobile: false,
      },
      blocks: [
        {
          id: "live-state-block",
          type: "system_component",
          props: {
            componentKey: "live_state",
            containerStyle: "panel",
          },
        },
      ],
    },
    {
      id: "player",
      type: "content",
      config: {
        visible: true,
        title: "Main Stage",
        body: null,
        adminLabel: "Stage Player",
        backgroundStyle: "transparent",
        contentWidth: "xl",
        paddingY: "md",
        textAlign: "left",
        divider: "none",
        hideOnMobile: false,
      },
      blocks: [
        {
          id: "player-block",
          type: "system_component",
          props: {
            componentKey: "stage_player",
            containerStyle: "panel",
          },
        },
      ],
    },
  ]
}

export default function EditorEventPageRenderer({
  event,
  elements = [],
  sections,
  isEditing = false,
  selectedSectionId = null,
  draggingSectionId = null,
  dragOverSectionId = null,
  onSelectSection,
  onSectionDragStart,
  onSectionDragOver,
  onSectionDrop,
  onSectionDragEnd,
  systemComponents,
  eventTheme,
}: {
  event: EventLike
  elements?: EditorElement[]
  sections?: EventPageSection[]
  isEditing?: boolean
  selectedSectionId?: string | null
  draggingSectionId?: string | null
  dragOverSectionId?: string | null
  onSelectSection?: (id: string | null) => void
  onSectionDragStart?: (id: string) => void
  onSectionDragOver?: (event: DragEvent<HTMLElement>, id: string) => void
  onSectionDrop?: (event: DragEvent<HTMLElement>, id: string) => void
  onSectionDragEnd?: () => void
  systemComponents: SystemComponentsMap
  eventTheme?: EventTheme
}) {
  const resolvedSections =
    sections && sections.length > 0 ? sections : getFallbackSections(event)

  const experienceNodes: RendererExperienceNode[] = [
    ...resolvedSections.map((section, index) => sectionToExperienceNode(section, index)),
    ...elements.map((element) => elementToExperienceNode(element)),
  ]

  const resolvedEventTheme: EventTheme = {
    pageBackgroundColor: eventTheme?.pageBackgroundColor || "#020617",
    panelBackgroundColor: eventTheme?.panelBackgroundColor || "#0f172a",
    panelBorderColor: eventTheme?.panelBorderColor || "rgba(255,255,255,0.10)",
    textColor: eventTheme?.textColor || "#ffffff",
    gradientColorA: eventTheme?.gradientColorA || "#0f172a",
    gradientColorB: eventTheme?.gradientColorB || "#1d4ed8",
    gradientAngle: eventTheme?.gradientAngle || "135deg",
  }

  return (
    <div
      className={RENDERER_ROOT_CLASS}
      style={{
        backgroundColor: resolvedEventTheme.pageBackgroundColor,
        borderColor: resolvedEventTheme.panelBorderColor,
        color: resolvedEventTheme.textColor,
      }}
      data-experience-node-count={experienceNodes.length}
    >
      <div className={RENDERER_TEXTURE_CLASS} />
      <div className={RENDERER_TOP_GLOW_CLASS} />
      {resolvedSections.map((section, index) => {
        const config = section.config ?? {}

        if (config.visible === false) return null
        if (config.hideOnMobile) return null

        const isHeroSection = section.type === "hero"
        const isSectionDragging = draggingSectionId === section.id
        const isSectionDragOver = dragOverSectionId === section.id
        const canDragSection = isEditing && !isHeroSection

        const explicitSystemComponent = (config as { systemComponent?: SystemComponentKey })
          .systemComponent

        if (explicitSystemComponent) {
          const node = systemComponents[explicitSystemComponent]
          if (node) {
            return (
              <div
                key={`${section.id}-${index}`}
                data-editor-section="true"
                draggable={canDragSection}
                onDragStart={(e) => {
                  if (!canDragSection) return
                  e.dataTransfer.effectAllowed = "move"
                  e.dataTransfer.setData("text/plain", section.id)
                  onSectionDragStart?.(section.id)
                }}
                onDragOver={(e) => onSectionDragOver?.(e, section.id)}
                onDrop={(e) => onSectionDrop?.(e, section.id)}
                onDragEnd={onSectionDragEnd}
                onPointerDown={(e) => {
                  if (!isEditing) return
                  e.stopPropagation()
                  onSelectSection?.(section.id)
                }}
                onDoubleClick={(e) => {
                  if (!isEditing) return
                  e.preventDefault()
                  e.stopPropagation()
                  onSelectSection?.(section.id)
                }}
                className={`group/section relative overflow-hidden transition-all duration-300 ${
                  canDragSection ? `cursor-grab active:cursor-grabbing ${SECTION_EDITABLE_CLASS}` : isEditing ? `cursor-pointer ${SECTION_EDITABLE_CLASS}` : ""
                } ${selectedSectionId === section.id ? SECTION_SELECTED_CLASS : ""} ${
                  isSectionDragging ? "scale-[0.995] opacity-55" : ""
                } ${isSectionDragOver ? "ring-2 ring-emerald-300/70 ring-inset" : ""}`}
              >
                {isEditing ? <div className={SECTION_HOVER_EDGE_CLASS} /> : null}
                {isEditing ? (
                  <div className={SECTION_WORKSPACE_DRAG_BADGE_CLASS}>
                    {isHeroSection ? "Pinned" : "Drag Section"}
                  </div>
                ) : null}
                {isSectionDragOver && !isSectionDragging ? (
                  <div className="pointer-events-none absolute inset-x-6 top-0 z-40 h-1 rounded-full bg-emerald-300 shadow-[0_0_22px_rgba(110,231,183,0.45)]" />
                ) : null}
                {selectedSectionId === section.id ? (
                  <>
                    <div className={SECTION_SELECTED_GLOW_CLASS} />
                    <div className={SECTION_SELECTION_BADGE_CLASS}>Selected Section</div>
                  </>
                ) : null}

                {isEditing ? (
                  <div
                    className={`${SECTION_ACTION_HUD_CLASS} ${
                      selectedSectionId === section.id ? SECTION_ACTION_HUD_ACTIVE_CLASS : ""
                    }`}
                  >
                    <span>{config.adminLabel || section.type}</span>
                    <span className={SECTION_ACTION_DOT_CLASS} />
                    <span>{isHeroSection ? "Pinned" : "Move"}</span>
                    <span className={SECTION_ACTION_DOT_CLASS} />
                    <span>{section.blocks?.length ?? 0} blocks</span>
                  </div>
                ) : null}

                {node}
              </div>
            )
          }
        }

        const themeMode =
          typeof config.themeMode === "string" && config.themeMode.trim()
            ? config.themeMode
            : "inherit"

        const fillType =
          themeMode === "custom" &&
          typeof config.sectionBackgroundFillType === "string" &&
          config.sectionBackgroundFillType.trim()
            ? config.sectionBackgroundFillType
            : "solid"

        const sectionBackgroundColor =
          themeMode === "custom"
            ? typeof config.sectionBackgroundColor === "string" &&
              config.sectionBackgroundColor.trim()
              ? config.sectionBackgroundColor
              : undefined
            : resolvedEventTheme.panelBackgroundColor

        const sectionBorderColor =
          themeMode === "custom"
            ? typeof config.sectionBorderColor === "string" && config.sectionBorderColor.trim()
              ? config.sectionBorderColor
              : undefined
            : resolvedEventTheme.panelBorderColor

        const sectionTextColor =
          themeMode === "custom"
            ? typeof config.sectionTextColor === "string" && config.sectionTextColor.trim()
              ? config.sectionTextColor
              : undefined
            : resolvedEventTheme.textColor

        const sectionGradientColorA =
          themeMode === "custom"
            ? typeof config.sectionGradientColorA === "string" &&
              config.sectionGradientColorA.trim()
              ? config.sectionGradientColorA
              : resolvedEventTheme.gradientColorA || "#0f172a"
            : resolvedEventTheme.gradientColorA || "#0f172a"

        const sectionGradientColorB =
          themeMode === "custom"
            ? typeof config.sectionGradientColorB === "string" &&
              config.sectionGradientColorB.trim()
              ? config.sectionGradientColorB
              : resolvedEventTheme.gradientColorB || "#1d4ed8"
            : resolvedEventTheme.gradientColorB || "#1d4ed8"

        const sectionGradientAngle =
          themeMode === "custom"
            ? typeof config.sectionGradientAngle === "string" &&
              config.sectionGradientAngle.trim()
              ? config.sectionGradientAngle
              : resolvedEventTheme.gradientAngle || "135deg"
            : resolvedEventTheme.gradientAngle || "135deg"

        const sectionBackgroundImage =
          themeMode === "custom"
            ? fillType === "linear-gradient"
              ? `linear-gradient(${sectionGradientAngle}, ${sectionGradientColorA}, ${sectionGradientColorB})`
              : fillType === "radial-gradient"
                ? `radial-gradient(circle at center, ${sectionGradientColorA}, ${sectionGradientColorB})`
                : undefined
            : undefined

        const widthClass = getWidthClass(config.contentWidth)
        const paddingYClass = getPaddingYClass(config.paddingY)
        const sectionMinHeightClass = getSectionMinHeightClass(section.type, config.paddingY)
        const headerAlignmentClass = getHeaderAlignmentClass(config.textAlign)
        const showTopDivider = hasTopDivider(config.divider)
        const showBottomDivider = hasBottomDivider(config.divider)
        const hasHeader = Boolean(config.title || config.body)
        const isSelected = isEditing && selectedSectionId === section.id

        return (
          <section
            key={`${section.id}-${index}`}
            data-editor-section="true"
            draggable={canDragSection}
            onDragStart={(e) => {
              if (!canDragSection) return
              e.dataTransfer.effectAllowed = "move"
              e.dataTransfer.setData("text/plain", section.id)
              onSectionDragStart?.(section.id)
            }}
            onDragOver={(e) => onSectionDragOver?.(e, section.id)}
            onDrop={(e) => onSectionDrop?.(e, section.id)}
            onDragEnd={onSectionDragEnd}
            onPointerDown={(e) => {
              if (!isEditing) return
              e.stopPropagation()
              onSelectSection?.(section.id)
            }}
            onDoubleClick={(e) => {
              if (!isEditing) return
              e.preventDefault()
              e.stopPropagation()
              onSelectSection?.(section.id)
            }}
            className={`${SECTION_BASE_CLASS} ${sectionMinHeightClass} ${paddingYClass} ${getOuterBg(
              config.backgroundStyle,
              section.type
            )} ${showTopDivider ? "border-t border-white/[0.075]" : ""} ${
              showBottomDivider ? "border-b border-white/[0.055]" : ""
            } ${canDragSection ? `cursor-grab active:cursor-grabbing ${SECTION_EDITABLE_CLASS}` : isEditing ? `cursor-pointer ${SECTION_EDITABLE_CLASS}` : ""} ${
              isSelected ? SECTION_SELECTED_CLASS : ""
            } ${isSectionDragging ? "scale-[0.995] opacity-55" : ""} ${
              isSectionDragOver ? "ring-2 ring-emerald-300/70 ring-inset" : ""
            }`}
            style={{
              backgroundColor: fillType === "solid" ? sectionBackgroundColor : undefined,
              backgroundImage: sectionBackgroundImage,
              borderColor: sectionBorderColor,
              color: sectionTextColor,
            }}
          >
            {isEditing ? <div className={SECTION_HOVER_EDGE_CLASS} /> : null}
            {isEditing ? (
              <div className={SECTION_WORKSPACE_DRAG_BADGE_CLASS}>
                {isHeroSection ? "Pinned" : "Drag Section"}
              </div>
            ) : null}
            {isSectionDragOver && !isSectionDragging ? (
              <div className="pointer-events-none absolute inset-x-6 top-0 z-40 h-1 rounded-full bg-emerald-300 shadow-[0_0_22px_rgba(110,231,183,0.45)]" />
            ) : null}
            {isSelected ? (
              <>
                <div className={SECTION_SELECTED_GLOW_CLASS} />
                <div className={SECTION_SELECTION_BADGE_CLASS}>Selected Section</div>
              </>
            ) : null}

            {isEditing ? (
              <div
                className={`${SECTION_ACTION_HUD_CLASS} ${
                  isSelected ? SECTION_ACTION_HUD_ACTIVE_CLASS : ""
                }`}
              >
                <span>{config.adminLabel || section.type}</span>
                <span className={SECTION_ACTION_DOT_CLASS} />
                <span>{isHeroSection ? "Pinned" : "Move"}</span>
                <span className={SECTION_ACTION_DOT_CLASS} />
                <span>{section.blocks?.length ?? 0} blocks</span>
              </div>
            ) : null}

            {showTopDivider ? <div className={SECTION_TOP_EDGE_CLASS} /> : null}
            {showBottomDivider ? <div className={SECTION_BOTTOM_EDGE_CLASS} /> : null}
            <div className={`relative z-20 mx-auto ${widthClass}`}>
              {section.type === "hero" && hasHeader ? (
                <div className={headerAlignmentClass}>
                  <div className={HERO_KICKER_CLASS}>
                    Jupiter Experience
                  </div>

                  {config.title ? (
                    <h1
                      className={HERO_TITLE_CLASS}
                      style={{ color: sectionTextColor }}
                    >
                      {config.title}
                    </h1>
                  ) : null}

                  {config.body ? (
                    <p
                      className={`${HERO_BODY_CLASS} ${
                        config.textAlign === "center" ? "mx-auto max-w-3xl" : "max-w-3xl"
                      }`}
                      style={{ color: sectionTextColor }}
                    >
                      {config.body}
                    </p>
                  ) : null}
                </div>
              ) : hasHeader ? (
                <div className={headerAlignmentClass}>
                  {config.title ? (
                    <h2
                      className={SECTION_TITLE_CLASS}
                      style={{ color: sectionTextColor }}
                    >
                      {config.title}
                    </h2>
                  ) : null}

                  {config.body ? (
                    <p
                      className={
                        config.title ? SECTION_BODY_CLASS : SECTION_BODY_CLASS.replace("mt-4 ", "")
                      }
                      style={{ color: sectionTextColor }}
                    >
                      {config.body}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {section.blocks?.length ? (
                <div className={hasHeader ? SECTION_BLOCK_STACK_WITH_HEADER_CLASS : SECTION_BLOCK_STACK_CLASS}>
                  {section.blocks.map((block) => renderBlock(block, systemComponents))}
                </div>
              ) : null}
            </div>
          </section>
        )
      })}

      {elements.length > 0
        ? elements.map((el) => (
            <div
              key={el.id}
              className={`${ELEMENT_BASE_CLASS} ${
                el.element_type === "image"
                  ? "bg-white/90"
                  : el.element_type === "video"
                    ? "bg-black/90"
                    : el.element_type === "pdf"
                      ? "bg-red-950/80 text-white"
                      : el.element_type === "button"
                        ? "bg-transparent"
                        : el.element_type === "spacer"
                          ? "border-dashed border-white/20 bg-white/5"
                          : "bg-amber-300 text-black"
              }`}
              style={{
                left: el.x,
                top: el.y,
                zIndex: el.z_index ?? 1,
                width: el.width ?? "auto",
                height: el.height ?? "auto",
              }}
            >
              {isEditing ? <div className={ELEMENT_SELECTION_CHROME_CLASS} /> : null}
              {el.element_type === "image" ? (
                <img
                  src={String(el.props?.src ?? "https://placehold.co/800x450/png")}
                  alt={String(el.props?.alt ?? "Image block")}
                  className="h-full w-full object-cover"
                  draggable={false}
                />
              ) : el.element_type === "video" ? (
                String(el.props?.posterUrl ?? "") ? (
                  <img
                    src={String(el.props?.posterUrl ?? "")}
                    alt={el.content || "Video poster"}
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <div className={EMPTY_VIDEO_BLOCK_CLASS}>
                    Video block
                  </div>
                )
              ) : el.element_type === "pdf" ? (
                <div className="flex h-full w-full flex-col justify-between p-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-white/50">PDF</div>
                    <div className="mt-2 text-base font-semibold">{el.content}</div>
                  </div>
                  <div className="mt-4 break-all text-xs text-white/70">
                    {String(el.props?.url ?? "")}
                  </div>
                </div>
              ) : el.element_type === "button" ? (
                <div className="flex h-full w-full items-center justify-center">
                  <a
                    href={String(el.props?.href ?? "#")}
                    className={ELEMENT_BUTTON_CLASS}
                  >
                    {el.content || "Button"}
                  </a>
                </div>
              ) : el.element_type === "spacer" ? (
                <div className={SPACER_BLOCK_CLASS}>
                  Spacer
                </div>
              ) : (
                <div className="px-4 py-2 text-sm font-medium whitespace-pre-wrap">
                  {el.content}
                </div>
              )}
            </div>
          ))
        : null}
    </div>
  )
}