import type {
  EventPageSection,
  SectionBlock,
  SectionType,
  SystemComponentKey,
} from "@/lib/page-editor/sectionTypes"

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function normalizeSectionType(value: unknown): SectionType {
  switch (value) {
    case "hero":
    case "content":
    case "system":
    case "grid":
      return value
    default:
      return "content"
  }
}

function normalizeBlock(
  input: unknown,
  sectionIndex: number,
  blockIndex: number,
): SectionBlock | null {
  if (!isRecord(input)) return null

  const props = isRecord(input.props) ? input.props : {}
  const id =
    typeof input.id === "string" && input.id.trim().length > 0
      ? input.id
      : `block-${sectionIndex + 1}-${blockIndex + 1}`

  if (input.type === "rich_text") {
    const body = props.body
    let normalizedBody: string | null | undefined

    if (typeof body === "string") {
      normalizedBody = body
    } else if (body === null) {
      normalizedBody = null
    }

    return {
      id,
      type: "rich_text",
      props: {
        title: typeof props.title === "string" ? props.title : undefined,
        body: normalizedBody,
        align: props.align === "center" ? "center" : "left",
      },
    }
  }

  if (
    input.type === "system_component" &&
    typeof props.componentKey === "string" &&
    props.componentKey.trim().length > 0
  ) {
    return {
      id,
      type: "system_component",
      props: {
        ...props,
        componentKey: props.componentKey as SystemComponentKey,
      },
    } as SectionBlock
  }

  return null
}

export function normalizeEventPageSections(input: unknown): EventPageSection[] {
  if (!Array.isArray(input)) return []

  return input.flatMap((value, sectionIndex) => {
    if (!isRecord(value)) return []

    const section = value
    const config = isRecord(section.config) ? section.config : {}
    const blocks = Array.isArray(section.blocks)
      ? section.blocks
          .map((block, blockIndex) =>
            normalizeBlock(block, sectionIndex, blockIndex),
          )
          .filter((block): block is SectionBlock => block !== null)
      : []

    return [{
      id:
        typeof section.id === "string" && section.id.trim().length > 0
          ? section.id
          : `section-${sectionIndex + 1}`,
      type: normalizeSectionType(section.type),
      config,
      blocks,
    } as EventPageSection]
  })
}

export function hasSystemComponent(
  sections: EventPageSection[],
  componentKey: SystemComponentKey,
): boolean {
  return sections.some((section) => {
    const explicitComponent = (
      section.config as EventPageSection["config"] & {
        systemComponent?: SystemComponentKey
      }
    ).systemComponent

    if (explicitComponent === componentKey) return true

    return (section.blocks ?? []).some(
      (block) =>
        block.type === "system_component" &&
        block.props.componentKey === componentKey,
    )
  })
}

export function withRequiredSystemComponent(
  sections: EventPageSection[],
  componentKey: SystemComponentKey,
  {
    sectionId,
    adminLabel,
    title = "",
    body = null,
    containerStyle = "none",
  }: {
    sectionId: string
    adminLabel: string
    title?: string
    body?: string | null
    containerStyle?: "none" | "panel" | "subtle"
  },
): EventPageSection[] {
  if (hasSystemComponent(sections, componentKey)) return sections

  return [
    ...sections,
    {
      id: sectionId,
      type: "content",
      config: {
        visible: true,
        title,
        body,
        adminLabel,
        backgroundStyle: "transparent",
        contentWidth: "xl",
        paddingY: "md",
        textAlign: "left",
        divider: "none",
        hideOnMobile: false,
      },
      blocks: [
        {
          id: `${sectionId}-block`,
          type: "system_component",
          props: {
            componentKey,
            containerStyle,
          },
        },
      ],
    },
  ]
}
