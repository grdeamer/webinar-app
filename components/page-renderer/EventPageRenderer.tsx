import type { CSSProperties, ReactNode } from "react"
import PersistedPageElementLayer from "@/components/page-renderer/PersistedPageElementLayer"
import { getSectionResponsiveVisibilityClass } from "@/lib/page-editor/elementPresentation"
import type {
  EventPageElement,
  EventPageSection,
  SectionBlock,
  EventTheme,
} from "@/lib/page-editor/sectionTypes"

type EventLike = {
  title: string
  description?: string | null
}

export type AttendeeSystemComponentsMap = Readonly<
  Record<string, ReactNode | undefined>
>

export type AttendeeSectionLayout = "full-bleed" | "card-stack"

function getPublicHeroBody(body?: string | null) {
  const value = body?.trim()
  if (!value) return "Welcome to the live event experience. Stay tuned — the main stage will open here when programming begins."

  const lower = value.toLowerCase()
  const isEditorPlaceholder =
    lower.includes("renderer mode is now active") ||
    lower.includes("inside the page editor") ||
    lower.includes("page editor")

  if (isEditorPlaceholder) {
    return "Welcome to the live event experience. Stay tuned — the main stage will open here when programming begins."
  }

  return value
}

function getPublicTitle(title?: string | null) {
  const value = title?.trim()
  if (!value) return ""

  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => {
      const lower = word.toLowerCase()
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join(" ")
}

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

function getTextAlignClass(textAlign?: EventPageSection["config"]["textAlign"]) {
  return textAlign === "center" ? "text-center" : "text-left"
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
        return "bg-white/10"
      case "subtle":
      default:
        return "bg-white/5"
    }
  }

  switch (backgroundStyle) {
    case "subtle":
      return "bg-white/[0.02]"
    case "panel":
      return "bg-white/[0.03]"
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
      return "rounded-3xl border border-white/10 bg-white/[0.03] p-6"
    case "panel":
    default:
      return "rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-xl shadow-black/20"
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
  systemComponents: AttendeeSystemComponentsMap,
  layout: AttendeeSectionLayout,
): ReactNode {
  if (block.type === "rich_text") {
    if (layout === "card-stack") {
      return (
        <div
          key={block.id}
          className={`rounded-2xl border border-white/10 bg-white/[0.03] p-6 ${
            block.props.align === "center" ? "text-center" : "text-left"
          }`}
        >
          {block.props.title ? (
            <h3 className="text-lg font-semibold">{block.props.title}</h3>
          ) : null}
          {block.props.body ? (
            <p className="mt-2 whitespace-pre-wrap text-white/70">
              {block.props.body}
            </p>
          ) : null}
        </div>
      )
    }

    return (
      <div
        key={block.id}
        className={block.props.align === "center" ? "text-center" : "text-left"}
      >
        {block.props.title ? (
          <h3 className="text-2xl font-semibold text-white">{block.props.title}</h3>
        ) : null}

        {block.props.body ? (
          <div
            className={
              block.props.title
                ? "mt-4 whitespace-pre-wrap text-white/70"
                : "whitespace-pre-wrap text-white/70"
            }
          >
            {block.props.body}
          </div>
        ) : null}
      </div>
    )
  }

  if (block.type === "system_component") {
    const componentKey = block.props.componentKey
    const node = systemComponents[componentKey]

    if (!node) {
      if (layout === "card-stack") {
        return (
          <div
            key={block.id}
            className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-6 text-sm text-white/45"
          >
            {String(componentKey)} preview is not enabled on this page yet.
          </div>
        )
      }

      const cardClass = getCardClass(block.props.containerStyle ?? "panel")

      return (
        <div key={block.id} className={cardClass || undefined}>
          <div className="text-lg font-semibold text-white">
            {componentKey === "stage_player" ? "Main stage" : "System component"}
          </div>
          <p className="mt-2 text-sm text-red-200/80">
            {componentKey === "stage_player"
              ? "StagePlayer is not wired into this page renderer yet."
              : `Missing system component: ${componentKey}`}
          </p>
        </div>
      )
    }

    if (layout === "card-stack") {
      return <div key={block.id}>{node}</div>
    }

    const cardClass = getCardClass(block.props.containerStyle ?? "panel")

    return (
      <div key={block.id} className={cardClass || undefined}>
        {block.props.title ? (
          <h3 className="text-lg font-semibold text-white">{block.props.title}</h3>
        ) : null}

        {block.props.body ? (
          <p
            className={
              block.props.title
                ? "mt-2 text-sm text-white/60"
                : "text-sm text-white/60"
            }
          >
            {block.props.body}
          </p>
        ) : null}

        <div className={block.props.title || block.props.body ? "mt-4" : ""}>
          {node}
        </div>
      </div>
    )
  }

  return null
}

function getCardStackPageStyle(theme: EventTheme): CSSProperties {
  const colorA = theme.gradientColorA || "#020617"
  const colorB = theme.gradientColorB || "#020617"
  const angle = theme.gradientAngle || "135deg"

  return {
    color: theme.textColor || "#ffffff",
    backgroundColor: theme.pageBackgroundColor || "#020617",
    backgroundImage: `linear-gradient(${angle}, ${colorA}, ${colorB})`,
  }
}

function getCardStackPaddingClass(
  sectionType: EventPageSection["type"],
  paddingY?: EventPageSection["config"]["paddingY"],
) {
  if (sectionType === "hero") {
    switch (paddingY) {
      case "sm":
        return "px-8 py-6 md:px-10"
      case "lg":
        return "px-8 py-10 md:px-10 md:py-14"
      case "md":
      default:
        return "p-8 md:p-10"
    }
  }

  switch (paddingY) {
    case "sm":
      return "px-6 py-6 md:px-8"
    case "lg":
      return "px-6 py-10 md:px-8 md:py-14"
    case "md":
    default:
      return "p-6 md:p-8"
  }
}

function getCardStackSectionStyle(
  section: EventPageSection,
  theme: EventTheme,
): CSSProperties {
  const config = section.config ?? {}
  const themeMode = config.themeMode ?? "inherit"
  const fillType = config.sectionBackgroundFillType ?? "solid"

  if (themeMode !== "custom") {
    return {
      backgroundColor:
        theme.panelBackgroundColor || "rgba(255,255,255,0.04)",
      borderColor:
        theme.panelBorderColor || "rgba(255,255,255,0.10)",
      color: theme.textColor || "#ffffff",
    }
  }

  const backgroundColor =
    config.sectionBackgroundColor ||
    theme.panelBackgroundColor ||
    "rgba(255,255,255,0.04)"
  const borderColor =
    config.sectionBorderColor ||
    theme.panelBorderColor ||
    "rgba(255,255,255,0.10)"
  const textColor =
    config.sectionTextColor || theme.textColor || "#ffffff"
  const gradientColorA =
    config.sectionGradientColorA || theme.gradientColorA || "#0f172a"
  const gradientColorB =
    config.sectionGradientColorB || theme.gradientColorB || "#1d4ed8"
  const gradientAngle =
    config.sectionGradientAngle || theme.gradientAngle || "135deg"

  return {
    backgroundColor: fillType === "solid" ? backgroundColor : undefined,
    backgroundImage:
      fillType === "linear-gradient"
        ? `linear-gradient(${gradientAngle}, ${gradientColorA}, ${gradientColorB})`
        : fillType === "radial-gradient"
          ? `radial-gradient(circle at center, ${gradientColorA}, ${gradientColorB})`
          : undefined,
    borderColor,
    color: textColor,
  }
}

function renderCardStackSection(
  section: EventPageSection,
  index: number,
  event: EventLike,
  theme: EventTheme,
  systemComponents: AttendeeSystemComponentsMap,
): ReactNode {
  const config = section.config ?? {}
  if (config.visible === false) return null

  const responsiveVisibilityClass =
    getSectionResponsiveVisibilityClass(config)
  const explicitSystemComponent = (
    config as EventPageSection["config"] & { systemComponent?: string }
  ).systemComponent

  if (explicitSystemComponent) {
    const node = systemComponents[explicitSystemComponent]
    if (node) {
      return (
        <div
          key={`${section.id}-${index}`}
          data-page-section-id={section.id}
          data-page-section-type={section.type}
          className={responsiveVisibilityClass || undefined}
        >
          {node}
        </div>
      )
    }
  }

  const title = config.title || ""
  const body = config.body || ""
  const textAlignClass = getTextAlignClass(config.textAlign)
  const widthClass = getWidthClass(config.contentWidth)
  const contentWidthClass =
    section.type === "hero" && config.textAlign !== "center"
      ? "max-w-3xl"
      : `mx-auto ${widthClass}`

  return (
    <section
      key={`${section.id}-${index}`}
      data-page-section-id={section.id}
      data-page-section-type={section.type}
      data-page-section-label={config.adminLabel || undefined}
      className={`${responsiveVisibilityClass} rounded-3xl border ${getCardStackPaddingClass(
        section.type,
        config.paddingY,
      )}`}
      style={getCardStackSectionStyle(section, theme)}
    >
      <div
        className={`${contentWidthClass} ${textAlignClass}`}
      >
        {section.type === "hero" ? (
          <>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              {title || event.title}
            </h1>
            {body ? (
              <p className="mt-3 whitespace-pre-wrap text-base text-white/70 md:text-lg">
                {body}
              </p>
            ) : null}
          </>
        ) : (
          <>
            {title ? (
              <h2 className="text-2xl font-semibold">{title}</h2>
            ) : null}
            {body ? (
              <p className="mt-2 whitespace-pre-wrap text-white/70">{body}</p>
            ) : null}
          </>
        )}

        {section.blocks?.length ? (
          <div className="mt-6 space-y-6">
            {section.blocks.map((block) =>
              renderBlock(block, systemComponents, "card-stack"),
            )}
          </div>
        ) : null}
      </div>
    </section>
  )
}

function renderFullBleedSection(
  section: EventPageSection,
  index: number,
  eventTheme: EventTheme,
  systemComponents: AttendeeSystemComponentsMap,
): ReactNode {
  const config = section.config ?? {}

  if (config.visible === false) return null
  const responsiveVisibilityClass =
    getSectionResponsiveVisibilityClass(config)

  const explicitSystemComponent = (
    config as EventPageSection["config"] & { systemComponent?: string }
  ).systemComponent

  if (explicitSystemComponent) {
    const node = systemComponents[explicitSystemComponent]
    if (node) {
      return (
        <div
          key={`${section.id}-${index}`}
          data-page-section-id={section.id}
          data-page-section-type={section.type}
          data-page-section-label={config.adminLabel || undefined}
          className={responsiveVisibilityClass || undefined}
        >
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
      : eventTheme.panelBackgroundColor

  const sectionBorderColor =
    themeMode === "custom"
      ? typeof config.sectionBorderColor === "string" &&
        config.sectionBorderColor.trim()
        ? config.sectionBorderColor
        : undefined
      : eventTheme.panelBorderColor

  const sectionTextColor =
    themeMode === "custom"
      ? typeof config.sectionTextColor === "string" &&
        config.sectionTextColor.trim()
        ? config.sectionTextColor
        : undefined
      : eventTheme.textColor

  const sectionGradientColorA =
    themeMode === "custom"
      ? typeof config.sectionGradientColorA === "string" &&
        config.sectionGradientColorA.trim()
        ? config.sectionGradientColorA
        : eventTheme.gradientColorA || "#0f172a"
      : eventTheme.gradientColorA || "#0f172a"

  const sectionGradientColorB =
    themeMode === "custom"
      ? typeof config.sectionGradientColorB === "string" &&
        config.sectionGradientColorB.trim()
        ? config.sectionGradientColorB
        : eventTheme.gradientColorB || "#1d4ed8"
      : eventTheme.gradientColorB || "#1d4ed8"

  const sectionGradientAngle =
    themeMode === "custom"
      ? typeof config.sectionGradientAngle === "string" &&
        config.sectionGradientAngle.trim()
        ? config.sectionGradientAngle
        : eventTheme.gradientAngle || "135deg"
      : eventTheme.gradientAngle || "135deg"

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
  const textAlignClass = getTextAlignClass(config.textAlign)
  const showTopDivider = hasTopDivider(config.divider)
  const showBottomDivider = hasBottomDivider(config.divider)
  const hasHeader = Boolean(config.title || config.body)

  return (
    <section
      key={`${section.id}-${index}`}
      data-page-section-id={section.id}
      data-page-section-type={section.type}
      data-page-section-label={config.adminLabel || undefined}
      className={`${responsiveVisibilityClass} px-8 ${paddingYClass} ${getOuterBg(
        config.backgroundStyle,
        section.type,
      )} ${showTopDivider ? "border-t border-white/10" : ""} ${
        showBottomDivider ? "border-b border-white/10" : ""
      }`}
      style={{
        backgroundColor:
          fillType === "solid" ? sectionBackgroundColor : undefined,
        backgroundImage: sectionBackgroundImage,
        borderColor: sectionBorderColor,
        color: sectionTextColor,
      }}
    >
      <div className={`mx-auto ${widthClass}`}>
        {section.type === "hero" && hasHeader ? (
          <div className={textAlignClass}>
            <div className="text-xs uppercase tracking-[0.22em] text-white/40">
              Live Event
            </div>

            {config.title ? (
              <h1
                className="mt-3 text-4xl font-bold"
                style={{ color: sectionTextColor }}
              >
                {getPublicTitle(config.title)}
              </h1>
            ) : null}

            {getPublicHeroBody(config.body) ? (
              <p
                className={`mt-4 whitespace-pre-wrap ${
                  config.textAlign === "center"
                    ? "mx-auto max-w-3xl"
                    : "max-w-3xl"
                }`}
                style={{ color: sectionTextColor }}
              >
                {getPublicHeroBody(config.body)}
              </p>
            ) : null}
          </div>
        ) : hasHeader ? (
          <div className={textAlignClass}>
            {config.title ? (
              <h2
                className="text-2xl font-semibold"
                style={{ color: sectionTextColor }}
              >
                {getPublicTitle(config.title)}
              </h2>
            ) : null}

            {getPublicHeroBody(config.body) ? (
              <p
                className={
                  config.title
                    ? "mt-4 whitespace-pre-wrap"
                    : "whitespace-pre-wrap"
                }
                style={{ color: sectionTextColor }}
              >
                {getPublicHeroBody(config.body)}
              </p>
            ) : null}
          </div>
        ) : null}

        {section.blocks?.length ? (
          <div className={hasHeader ? "mt-6 space-y-6" : "space-y-6"}>
            {section.blocks.map((block) =>
              renderBlock(block, systemComponents, "full-bleed"),
            )}
          </div>
        ) : null}
      </div>
    </section>
  )
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

export default function EventPageRenderer({
  event,
  elements = [],
  mode = "live",
  sections,
  isEditing = false,
  selectedSectionId = null,
  onSelectSection,
  isMobilePreview = false,
  generalSession = null,
  systemComponents,
  eventTheme,
  layout = "full-bleed",
  stackedPadding = "default",
  standalone = false,
  beforeSections,
  afterSections,
}: {
  event: EventLike
  elements?: EventPageElement[]
  mode?: "live" | "editor"
  sections?: EventPageSection[]
  isEditing?: boolean
  selectedSectionId?: string | null
  onSelectSection?: (id: string | null) => void
  isMobilePreview?: boolean
  generalSession?: unknown
  systemComponents: AttendeeSystemComponentsMap
  eventTheme?: EventTheme
  layout?: AttendeeSectionLayout
  stackedPadding?: "default" | "spacious"
  standalone?: boolean
  beforeSections?: ReactNode
  afterSections?: ReactNode
}) {
  void mode
  void isEditing
  void selectedSectionId
  void onSelectSection
  void isMobilePreview
  void generalSession

  const resolvedSections =
    sections && sections.length > 0 ? sections : getFallbackSections(event)

  const resolvedEventTheme: EventTheme = {
    pageBackgroundColor: eventTheme?.pageBackgroundColor || "#020617",
    panelBackgroundColor: eventTheme?.panelBackgroundColor || "#0f172a",
    panelBorderColor: eventTheme?.panelBorderColor || "rgba(255,255,255,0.10)",
    textColor: eventTheme?.textColor || "#ffffff",
    gradientColorA: eventTheme?.gradientColorA || "#0f172a",
    gradientColorB: eventTheme?.gradientColorB || "#1d4ed8",
    gradientAngle: eventTheme?.gradientAngle || "135deg",
  }

  if (layout === "card-stack") {
    const cardStackTheme = eventTheme ?? {}

    return (
      <main
        className="relative min-h-screen text-white"
        style={getCardStackPageStyle(cardStackTheme)}
      >
        {beforeSections}
        <div
          className={`relative mx-auto max-w-6xl px-6 ${
            stackedPadding === "spacious" ? "py-12" : "py-10"
          }`}
        >
          <div className="space-y-8">
            {resolvedSections.map((section, index) =>
              renderCardStackSection(
                section,
                index,
                event,
                cardStackTheme,
                systemComponents,
              ),
            )}
            {afterSections}
          </div>
        </div>
        <PersistedPageElementLayer elements={elements} />
      </main>
    )
  }

  const fullBleedContent = (
    <div
      className="relative overflow-hidden rounded-3xl border text-white"
      style={{
        backgroundColor: resolvedEventTheme.pageBackgroundColor,
        borderColor: resolvedEventTheme.panelBorderColor,
        color: resolvedEventTheme.textColor,
      }}
    >
      {beforeSections}
      {resolvedSections.map((section, index) =>
        renderFullBleedSection(
          section,
          index,
          resolvedEventTheme,
          systemComponents,
        ),
      )}

      <PersistedPageElementLayer elements={elements} />
    </div>
  )

  if (standalone) {
    return (
      <main className="relative min-h-screen bg-[#050816] text-white">
        {fullBleedContent}
        {afterSections}
      </main>
    )
  }

  return (
    <>
      {fullBleedContent}
      {afterSections}
    </>
  )
}
