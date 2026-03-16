import type { SectionConfig, SectionType } from "@/lib/page-editor/sectionTypes"

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

type EventPageSection = {
  id: string
  type: SectionType
  config: SectionConfig
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
  switch (textAlign) {
    case "center":
      return "text-center"
    case "left":
    default:
      return "text-left"
  }
}

function getSectionOuterBackgroundClass(
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
    case "transparent":
    case "panel":
    default:
      return "bg-transparent"
  }
}

function getContentCardClass(backgroundStyle?: EventPageSection["config"]["backgroundStyle"]) {
  switch (backgroundStyle) {
    case "transparent":
      return ""
    case "subtle":
      return "rounded-3xl border border-white/10 bg-white/[0.03] p-10"
    case "panel":
    default:
      return "rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-10"
  }
}

function hasTopDivider(divider?: EventPageSection["config"]["divider"]) {
  return divider === "top" || divider === "both"
}

function hasBottomDivider(divider?: EventPageSection["config"]["divider"]) {
  return divider === "bottom" || divider === "both"
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
    },
    {
      id: "content",
      type: "content",
      config: {
        visible: true,
        title: "Main Content",
        body: "Built-in event sections will move here next.",
        adminLabel: "Main Content",
        backgroundStyle: "panel",
        contentWidth: "xl",
        paddingY: "md",
        textAlign: "left",
        divider: "none",
        hideOnMobile: false,
      },
    },
  ]
}

export default function EventPageRenderer({
  event,
  elements,
  mode = "live",
  sections,
  isEditing = false,
  selectedSectionId = null,
  onSelectSection,
  isMobilePreview = false,
}: {
  event: EventLike
  elements: EditorElement[]
  mode?: "live" | "editor"
  sections?: EventPageSection[]
  isEditing?: boolean
  selectedSectionId?: string | null
  onSelectSection?: (id: string | null) => void
  isMobilePreview?: boolean
}) {
  const resolvedSections = sections && sections.length > 0 ? sections : getFallbackSections(event)

  return (
    <div className="relative min-h-[900px] overflow-hidden rounded-3xl border border-white/10 bg-slate-950 text-white">
      {resolvedSections.map((section) => {
        const config = section.config ?? {}

        if (config.visible === false) return null
        if (isMobilePreview && config.hideOnMobile) return null

        const widthClass = getWidthClass(config.contentWidth)
        const paddingYClass = getPaddingYClass(config.paddingY)
        const textAlignClass = getTextAlignClass(config.textAlign)
        const isSelected = selectedSectionId === section.id
        const isEditorClickable = isEditing || mode === "editor"
        const showTopDivider = hasTopDivider(config.divider)
        const showBottomDivider = hasBottomDivider(config.divider)

        if (section.type === "hero") {
          return (
            <div
              key={section.id}
              data-section-id={section.id}
              onClick={(e) => {
                e.stopPropagation()
                if (isEditorClickable) onSelectSection?.(section.id)
              }}
              className={`${getSectionOuterBackgroundClass(
                config.backgroundStyle,
                section.type
              )} px-8 ${paddingYClass} ${
                isEditorClickable ? "cursor-pointer" : ""
              } ${isSelected ? "ring-2 ring-inset ring-sky-400" : ""} ${
                showTopDivider ? "border-t border-white/10" : ""
              } ${showBottomDivider ? "border-b border-white/10" : ""}`}
            >
              <div className={`mx-auto ${widthClass} ${textAlignClass}`}>
                <div className="text-xs uppercase tracking-[0.22em] text-white/40">
                  Event Page
                </div>

                <h1 className="mt-3 text-4xl font-bold">{config.title || event.title}</h1>

                {config.body ? (
                  <p
                    className={`mt-4 whitespace-pre-wrap text-white/70 ${
                      config.textAlign === "center" ? "mx-auto max-w-3xl" : "max-w-3xl"
                    }`}
                  >
                    {config.body}
                  </p>
                ) : null}
              </div>
            </div>
          )
        }

        const cardClass = getContentCardClass(config.backgroundStyle)

        return (
          <div
            key={section.id}
            data-section-id={section.id}
            onClick={(e) => {
              e.stopPropagation()
              if (isEditorClickable) onSelectSection?.(section.id)
            }}
            className={`px-8 ${paddingYClass} ${
              isEditorClickable ? "cursor-pointer" : ""
            } ${isSelected ? "ring-2 ring-inset ring-sky-400" : ""} ${getSectionOuterBackgroundClass(
              config.backgroundStyle,
              section.type
            )} ${showTopDivider ? "border-t border-white/10" : ""} ${
              showBottomDivider ? "border-b border-white/10" : ""
            }`}
          >
            <div className={`mx-auto ${widthClass}`}>
              <div className={cardClass || undefined}>
                <div className={textAlignClass}>
                  {config.title ? (
                    <h2 className="text-2xl font-semibold text-white">{config.title}</h2>
                  ) : null}

                  <div
                    className={
                      config.title
                        ? "mt-4 whitespace-pre-wrap text-white/70"
                        : "whitespace-pre-wrap text-white/50"
                    }
                  >
                    {config.body || "Built-in event sections will move here next."}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })}

      {elements
        .filter((el) => !(isMobilePreview && Boolean(el.props?.hideOnMobile)))
        .map((el) => (
          <div
            key={el.id}
            className={`absolute overflow-hidden rounded-xl shadow-lg ${
              el.element_type === "image"
                ? "bg-white"
                : el.element_type === "pdf"
                ? "bg-red-950/90 text-white"
                : el.element_type === "button"
                ? "bg-transparent"
                : el.element_type === "spacer"
                ? "border border-dashed border-white/20 bg-white/5"
                : "bg-amber-400 text-black"
            } ${mode === "editor" ? "pointer-events-none" : ""}`}
            style={{
              left: el.x,
              top: el.y,
              zIndex: el.z_index ?? 1,
              width: el.width ?? "auto",
              height: el.height ?? "auto",
            }}
          >
            {el.element_type === "image" ? (
              <img
                src={String(el.props?.src ?? "https://placehold.co/800x450/png")}
                alt={String(el.props?.alt ?? "Image block")}
                className="h-full w-full object-cover"
                draggable={false}
              />
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
                  className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white no-underline"
                >
                  {el.content || "Button"}
                </a>
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
          </div>
        ))}
    </div>
  )
}