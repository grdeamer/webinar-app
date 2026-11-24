"use client"

import { getSectionIntro } from "@/lib/page-editor/experienceLayout"
import type { LiveTimelineProps } from "@/components/events/LiveTimeline"
import { cloneElement, isValidElement, type DragEvent, type ReactNode } from "react"
import type {
  EventPageSection,
  SectionBlock,
  SystemComponentKey,
  EventTheme,
  ExperienceNode,
} from "@/lib/page-editor/sectionTypes"
import { getPageBackgroundStyle } from "@/lib/page-editor/themeBackground"
import RegistrationFlowPreview from "./RegistrationFlowPreview"
import { getRenderableSections } from "@/lib/page-editor/customCode"

import { isLiveAgendaSection, materializeLiveAgendaSection } from "@/lib/page-editor/liveAgendaLayout"
import type { LetsLiveAgendaProps } from "@/components/events/LetsLiveAgendaExperience"

type EventLike = {
  title: string
  description?: string | null
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

const SECTION_BLOCK_STACK_CLASS = "relative z-10 space-y-6"
const SECTION_BLOCK_STACK_WITH_HEADER_CLASS = "relative z-10 mt-8 space-y-6"

const SYSTEM_COMPONENT_CONTENT_CLASS = "relative z-10"

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

type CanvasTextField = "title" | "body"
type CanvasTextTarget = { id: string; field: CanvasTextField; blockId?: string }

function renderBlock(
  block: SectionBlock,
  systemComponents: SystemComponentsMap,
  editText: (field: CanvasTextField) => Partial<React.ComponentProps<typeof SectionText>>,
): ReactNode {
  if (block.type === "rich_text") {
    return (
      <div
        key={block.id}
        className={block.props.align === "center" ? "text-center" : "text-left"}
      >
        {block.props.title ? (
          <SectionText as="h3" value={block.props.title} className={RICH_TEXT_TITLE_CLASS} {...editText("title")} />
        ) : null}

        {block.props.body ? (
          <SectionText as="p" value={block.props.body}
            className={block.props.title ? `mt-4 ${RICH_TEXT_BODY_CLASS}` : RICH_TEXT_BODY_CLASS}
            {...editText("body")} />
        ) : null}
      </div>
    )
  }

  if (block.type === "system_component") {
    const componentKey = block.props.componentKey
    const registrationProps = block.props as typeof block.props & {
      ctaLabel?: unknown
      confirmationTitle?: unknown
      confirmationBody?: unknown
      registrationFields?: unknown
      previewRegistrationState?: unknown
      variant?: unknown
    }
    const baseNode =
      componentKey === "registration_form" ? (
        <RegistrationFlowPreview
          renderTitle={(title) => <SectionText as="h2" value={title} className="text-2xl font-semibold" {...editText("title")} />}
          registrationSettings={block.props.registrationSettings}
          title={typeof block.props.title === "string" ? block.props.title : undefined}
          body={typeof block.props.body === "string" ? block.props.body : undefined}
          ctaLabel={typeof registrationProps.ctaLabel === "string" ? registrationProps.ctaLabel : undefined}
          confirmationTitle={typeof registrationProps.confirmationTitle === "string" ? registrationProps.confirmationTitle : undefined}
          confirmationBody={typeof registrationProps.confirmationBody === "string" ? registrationProps.confirmationBody : undefined}
          initialFields={Array.isArray(registrationProps.registrationFields) ? registrationProps.registrationFields : undefined}
          previewState={
            typeof registrationProps.previewRegistrationState === "string"
              ? (registrationProps.previewRegistrationState as
                  | "open"
                  | "waitlist"
                  | "closed"
                  | "registered"
                  | "success")
              : "open"
          }
variant={
  registrationProps.variant === "minimal"
    ? "minimal"
    : "editorial"
}
        />
      ) : (
        systemComponents[componentKey]
      )
    const node = componentKey === "live_timeline" && isValidElement<LiveTimelineProps>(baseNode) ? cloneElement(baseNode, { timelineTrack: String(block.props.timelineTrack || ""), showRemaining: block.props.showRemaining !== false, accentColor: String(block.props.accentColor || "#eb1700") }) : baseNode
    if (!node) return null

    if (componentKey === "registration_form") return <div key={block.id}>{node}</div>

    const title = block.props.title ?? (componentKey === "agenda" ? "Event Agenda" : undefined)
    const body = block.props.body ?? (componentKey === "agenda" ? "Browse the event schedule." : undefined)
    const cardClass = getCardClass(block.props.containerStyle ?? "panel")

    return (
      <div key={block.id} className={cardClass || undefined}>
        {cardClass ? (
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.09] to-transparent" />
        ) : null}
        <div className={SYSTEM_COMPONENT_CONTENT_CLASS}>
          {title ? (
            <SectionText as="h3" value={title} className="text-xl font-semibold tracking-[-0.03em] text-white" {...editText("title")} />
          ) : null}

          {body ? (
            <SectionText as="p" value={body}
              className={title ? "mt-2 text-sm leading-7 text-white/56" : "text-sm leading-7 text-white/56"}
              {...editText("body")} />
          ) : null}

          <div className={title || body ? "mt-4" : ""}>
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

function SectionText({
  as: Tag,
  value,
  className,
  color,
  onCommit,
  editing,
  onEditingChange,
  sectionId,
  blockId,
}: {
  as: "h1" | "h2" | "h3" | "p"
  value: string
  className: string
  color?: string
  onCommit?: (value: string) => void
  editing?: boolean
  onEditingChange?: (editing: boolean) => void
  sectionId?: string
  blockId?: string
}) {
  const multiline = Tag === "p"
  const label = `${blockId ? "Block" : "Section"} ${multiline ? "body" : "title"}`

  if (editing && onCommit) {
    const Field = multiline ? "textarea" : "input"

    return (
      <Field
        autoFocus
        aria-label={label}
        defaultValue={value}
        className={`${className} block w-full rounded-sm bg-slate-950 outline outline-2 outline-sky-400`}
        style={{ color }}
        onPointerDown={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
        onBlur={(event) => {
          const next = event.currentTarget.value
          if (next !== value) onCommit(next)
          onEditingChange?.(false)
        }}
        onKeyDown={(event) => {
          event.stopPropagation()
          if (event.nativeEvent.isComposing) return
          if (event.key === "Escape") {
            event.preventDefault()
            event.currentTarget.value = value
            event.currentTarget.blur()
          }
          if (event.key === "Enter" && (!multiline || event.metaKey || event.ctrlKey)) {
            event.preventDefault()
            event.currentTarget.blur()
          }
        }}
      />
    )
  }

  return (
    <Tag
      className={onCommit ? `${className} cursor-text` : className}
      style={{ color }}
      title={onCommit ? `Double-click to edit ${label.toLowerCase()}` : undefined}
      tabIndex={onCommit ? 0 : undefined}
      onDoubleClick={onCommit ? (event) => {
        event.preventDefault()
        event.stopPropagation()
        onEditingChange?.(true)
      } : undefined}
      onKeyDown={onCommit ? (event) => {
        if (event.key !== "Enter") return
        event.preventDefault()
        event.stopPropagation()
        onEditingChange?.(true)
      } : undefined}
    >
      {onCommit ? (
        <span data-canvas-section-id={sectionId} data-canvas-block-id={blockId} data-canvas-section-field={multiline ? "body" : "title"}>
          {value}
        </span>
      ) : value}
    </Tag>
  )
}

export default function EditorEventPageRenderer({
  event,
  sections,
  isEditing = false,
  selectedSectionId = null,
  draggingSectionId = null,
  dragOverSectionId = null,
  onSelectSection,
  onEditSectionText,
  onEditBlockText,
  agendaAdminHref,
  activeSectionText,
  onActiveSectionTextChange,
  selectedBlockId, onSelectBlock, onMoveBlock,
  onSectionDragStart,
  onSectionDragOver,
  onSectionDrop,
  onSectionDragEnd,
  systemComponents,
  eventTheme,
  experienceNodeCount,
  isMobilePreview = false,
}: {
  event: EventLike
  sections?: EventPageSection[]
  isEditing?: boolean
  selectedSectionId?: string | null
  draggingSectionId?: string | null
  dragOverSectionId?: string | null
  selectedBlockId?: string | null
  onSelectBlock?: (sectionId: string, blockId: string) => void
  onMoveBlock?: (sectionId: string, source: string, target: string) => void
  activeSectionText?: CanvasTextTarget | null
  onActiveSectionTextChange?: (target: CanvasTextTarget | null) => void
  onEditBlockText?: (sectionId: string, blockId: string, field: CanvasTextField, value: string) => void
  agendaAdminHref?: string
  onEditSectionText?: (id: string, field: "title" | "body", value: string) => void
  onSelectSection?: (id: string | null) => void
  onSectionDragStart?: (id: string) => void
  onSectionDragOver?: (event: DragEvent<HTMLElement>, id: string) => void
  onSectionDrop?: (event: DragEvent<HTMLElement>, id: string) => void
  onSectionDragEnd?: () => void
  systemComponents: SystemComponentsMap
  eventTheme?: EventTheme
  experienceNodeCount?: number
  isMobilePreview?: boolean
}) {
  const visualSections = getRenderableSections(sections)
  const resolvedSections = sections ? visualSections : getFallbackSections(event)

  const experienceNodes: RendererExperienceNode[] = [
    ...resolvedSections.map((section, index) => sectionToExperienceNode(section, index)),
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
        ...getPageBackgroundStyle(resolvedEventTheme),
        borderColor: resolvedEventTheme.panelBorderColor,
        color: resolvedEventTheme.textColor,
      }}
      data-experience-node-count={experienceNodeCount ?? experienceNodes.length}
    >
      <div className={RENDERER_TEXTURE_CLASS} />
      <div className={RENDERER_TOP_GLOW_CLASS} />
      {resolvedSections.map((section, index) => {
        const config = section.config ?? {}

        if (config.visible === false) return null
        if (isMobilePreview && config.hideOnMobile) return null

        const liveNode = systemComponents.lets_live_agenda
        if (isLiveAgendaSection(section) && isValidElement<LetsLiveAgendaProps>(liveNode)) {
          const layout = materializeLiveAgendaSection(section)
          return <div key={section.id} data-page-section-id={section.id}>{cloneElement(liveNode, {
            blocks: layout.blocks ?? [],
            selectedBlockId: selectedSectionId === section.id ? selectedBlockId : null,
            onSelectBlock: isEditing && onSelectBlock ? (id: string) => onSelectBlock(section.id, id) : undefined,
            onMoveBlock: isEditing && onMoveBlock ? (source: string, target: string) => onMoveBlock(section.id, source, target) : undefined,
          })}</div>
        }

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
        const intro = getSectionIntro(section)
        const hasHeader = Boolean(intro.title || intro.body)
        const editText = (field: CanvasTextField, blockId?: string) => ({
          sectionId: section.id,
          blockId,
          editing: activeSectionText?.id === section.id && activeSectionText.field === field && activeSectionText.blockId === blockId,
          onCommit: isEditing ? (value: string) => {
            if (blockId) onEditBlockText?.(section.id, blockId, field, value)
            else onEditSectionText?.(section.id, field, value)
          } : undefined,
          onEditingChange: (editing: boolean) => {
            if (editing) {
              if (blockId) onSelectBlock?.(section.id, blockId)
              else onSelectSection?.(section.id)
            }
            onActiveSectionTextChange?.(editing ? { id: section.id, field, blockId } : null)
          },
        })
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
            <div
              className={`relative z-20 mx-auto ${widthClass}`}
              style={isEditing && activeSectionText?.id === section.id ? { zIndex: 2147483647 } : undefined}
            >
              {section.type === "hero" && hasHeader ? (
                <div className={headerAlignmentClass} data-editor-hero-intro>
                  <div className={HERO_KICKER_CLASS}>
                    Jupiter Experience
                  </div>

                  {intro.title ? (
                    <SectionText as="h1" value={intro.title} className={HERO_TITLE_CLASS}
                      color={sectionTextColor} {...editText("title")} />
                  ) : null}

                  {intro.body ? (
                    <SectionText as="p" value={intro.body}
                      className={`${HERO_BODY_CLASS} ${config.textAlign === "center" ? "mx-auto max-w-3xl" : "max-w-3xl"}`}
                      color={sectionTextColor} {...editText("body")} />
                  ) : null}
                </div>
              ) : hasHeader ? (
                <div className={headerAlignmentClass}>
                  {intro.title ? (
                    <SectionText as="h2" value={intro.title} className={SECTION_TITLE_CLASS}
                      color={sectionTextColor} {...editText("title")} />
                  ) : null}

                  {intro.body ? (
                    <SectionText as="p" value={intro.body}
                      className={intro.title ? SECTION_BODY_CLASS : SECTION_BODY_CLASS.replace("mt-4 ", "")}
                      color={sectionTextColor} {...editText("body")} />
                  ) : null}
                </div>
              ) : null}

              {section.blocks?.length ? (
                <div className={hasHeader ? SECTION_BLOCK_STACK_WITH_HEADER_CLASS : SECTION_BLOCK_STACK_CLASS}>
                  {section.blocks.map((block) => (
                    <div key={block.id} className={isEditing ? "relative" : undefined}>
                      {isEditing && onSelectBlock ? (
                        <div className="absolute right-0 top-0 z-20 flex -translate-y-full flex-wrap items-center gap-3 rounded-t bg-slate-950 px-2 text-xs text-slate-300">
                          <button type="button" className="rounded border border-white/20 px-2 py-1 hover:bg-white/10"
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={() => onSelectBlock(section.id, block.id)}>
                            {block.type === "rich_text" ? "Edit text block settings" :
                              `Edit ${block.props.componentKey.replaceAll("_", " ")} settings`}
                          </button>
                          {block.type === "system_component" && block.props.componentKey === "agenda" && agendaAdminHref ? (
                            <a className="underline" href={agendaAdminHref} target="_blank" rel="noreferrer"
                              onPointerDown={(event) => event.stopPropagation()}>
                              Manage agenda items
                            </a>
                          ) : null}
                        </div>
                      ) : null}
                      {renderBlock(block, systemComponents, (field) => editText(field, block.id))}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </section>
        )
      })}

    </div>
  )
}
