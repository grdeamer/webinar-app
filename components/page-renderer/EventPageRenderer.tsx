import type { ReactNode } from "react"
import type {
  EventPageSection,
  SectionBlock,
  SystemComponentKey,
  EventTheme,
} from "@/lib/page-editor/sectionTypes"

type EventLike = {
  title: string
  description?: string | null
}

type SystemComponentsMap = Partial<Record<SystemComponentKey, ReactNode>>

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
  systemComponents: SystemComponentsMap
): ReactNode {
  if (block.type === "rich_text") {
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
    const node = systemComponents[block.props.componentKey]
    if (!node) return null

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
  sections,
  systemComponents,
  eventTheme,
}: {
  event: EventLike
  sections?: EventPageSection[]
  systemComponents: SystemComponentsMap
  eventTheme?: EventTheme
}) {
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

  return (
    <div
      className="relative overflow-hidden rounded-3xl border text-white"
      style={{
        backgroundColor: resolvedEventTheme.pageBackgroundColor,
        borderColor: resolvedEventTheme.panelBorderColor,
        color: resolvedEventTheme.textColor,
      }}
    >
      {resolvedSections.map((section, index) => {
        const config = section.config ?? {}

        if (config.visible === false) return null
        if (config.hideOnMobile) return null

        const explicitSystemComponent = (config as { systemComponent?: SystemComponentKey })
          .systemComponent

        if (explicitSystemComponent) {
          const node = systemComponents[explicitSystemComponent]
          if (node) {
            return <div key={`${section.id}-${index}`}>{node}</div>
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
            ? typeof config.sectionBackgroundColor === "string" && config.sectionBackgroundColor.trim()
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
            ? typeof config.sectionGradientColorA === "string" && config.sectionGradientColorA.trim()
              ? config.sectionGradientColorA
              : resolvedEventTheme.gradientColorA || "#0f172a"
            : resolvedEventTheme.gradientColorA || "#0f172a"

        const sectionGradientColorB =
          themeMode === "custom"
            ? typeof config.sectionGradientColorB === "string" && config.sectionGradientColorB.trim()
              ? config.sectionGradientColorB
              : resolvedEventTheme.gradientColorB || "#1d4ed8"
            : resolvedEventTheme.gradientColorB || "#1d4ed8"

        const sectionGradientAngle =
          themeMode === "custom"
            ? typeof config.sectionGradientAngle === "string" && config.sectionGradientAngle.trim()
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
        const textAlignClass = getTextAlignClass(config.textAlign)
        const showTopDivider = hasTopDivider(config.divider)
        const showBottomDivider = hasBottomDivider(config.divider)

        const hasHeader = Boolean(config.title || config.body)

        return (
          <section
            key={`${section.id}-${index}`}
            className={`px-8 ${paddingYClass} ${getOuterBg(
              config.backgroundStyle,
              section.type
            )} ${showTopDivider ? "border-t border-white/10" : ""} ${
              showBottomDivider ? "border-b border-white/10" : ""
            }`}
            style={{
              backgroundColor: fillType === "solid" ? sectionBackgroundColor : undefined,
              backgroundImage: sectionBackgroundImage,
              borderColor: sectionBorderColor,
              color: sectionTextColor,
            }}
          >
            <div className={`mx-auto ${widthClass}`}>
              {section.type === "hero" && hasHeader ? (
                <div className={textAlignClass}>
                  <div className="text-xs uppercase tracking-[0.22em] text-white/40">
                    Event Page
                  </div>

                  {config.title ? (
                    <h1
                      className="mt-3 text-4xl font-bold"
                      style={{ color: sectionTextColor }}
                    >
                      {config.title}
                    </h1>
                  ) : null}

                  {config.body ? (
                    <p
                      className={`mt-4 whitespace-pre-wrap ${
                        config.textAlign === "center" ? "mx-auto max-w-3xl" : "max-w-3xl"
                      }`}
                      style={{ color: sectionTextColor }}
                    >
                      {config.body}
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
                      {config.title}
                    </h2>
                  ) : null}

                  {config.body ? (
                    <p
                      className={
                        config.title
                          ? "mt-4 whitespace-pre-wrap"
                          : "whitespace-pre-wrap"
                      }
                      style={{ color: sectionTextColor }}
                    >
                      {config.body}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {section.blocks?.length ? (
                <div className={hasHeader ? "mt-6 space-y-6" : "space-y-6"}>
                  {section.blocks.map((block) => renderBlock(block, systemComponents))}
                </div>
              ) : null}
            </div>
          </section>
        )
      })}
    </div>
  )
}