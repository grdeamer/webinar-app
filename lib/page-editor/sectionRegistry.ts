import type {
  SectionBlock,
  SectionConfig,
  SectionRegistryItem,
  SectionType,
  SystemComponentKey,
  EventPageSection,
} from "@/lib/page-editor/sectionTypes"

const sharedFields = [
  {
    key: "adminLabel",
    label: "Admin Label",
    type: "text",
    placeholder: "Internal section name",
  },
  {
    key: "visible",
    label: "Visible",
    type: "checkbox",
  },
  {
    key: "hideOnMobile",
    label: "Hide on Mobile",
    type: "checkbox",
  },
  {
    key: "title",
    label: "Title",
    type: "text",
  },
  {
    key: "body",
    label: "Body",
    type: "textarea",
  },
  {
    key: "backgroundStyle",
    label: "Background",
    type: "select",
    options: [
      { label: "Transparent", value: "transparent" },
      { label: "Subtle", value: "subtle" },
      { label: "Panel", value: "panel" },
    ],
  },
  {
    key: "sectionBackgroundFillType",
    label: "Section Fill Type",
    type: "select",
    options: [
      { label: "Solid", value: "solid" },
      { label: "Linear Gradient", value: "linear-gradient" },
      { label: "Radial Gradient", value: "radial-gradient" },
    ],
  },
  {
    key: "sectionBackgroundColor",
    label: "Section Background Color",
    type: "text",
    placeholder: "#0f172a",
  },
  {
    key: "sectionBorderColor",
    label: "Section Border Color",
    type: "text",
    placeholder: "rgba(255,255,255,0.12)",
  },
  {
    key: "sectionTextColor",
    label: "Section Text Color",
    type: "text",
    placeholder: "#ffffff",
  },
  {
    key: "sectionGradientColorA",
    label: "Gradient Color A",
    type: "text",
    placeholder: "#0f172a",
  },
  {
    key: "sectionGradientColorB",
    label: "Gradient Color B",
    type: "text",
    placeholder: "#1d4ed8",
  },
  {
    key: "sectionGradientAngle",
    label: "Gradient Angle",
    type: "text",
    placeholder: "135deg",
  },
  {
    key: "contentWidth",
    label: "Width",
    type: "select",
    options: [
      { label: "Medium", value: "md" },
      { label: "Large", value: "lg" },
      { label: "Extra Large", value: "xl" },
      { label: "Full", value: "full" },
    ],
  },
  {
    key: "paddingY",
    label: "Vertical Padding",
    type: "select",
    options: [
      { label: "Small", value: "sm" },
      { label: "Medium", value: "md" },
      { label: "Large", value: "lg" },
    ],
  },
  {
    key: "textAlign",
    label: "Text Align",
    type: "select",
    options: [
      { label: "Left", value: "left" },
      { label: "Center", value: "center" },
    ],
  },
  {
    key: "divider",
    label: "Divider",
    type: "select",
    options: [
      { label: "None", value: "none" },
      { label: "Top", value: "top" },
      { label: "Bottom", value: "bottom" },
      { label: "Top + Bottom", value: "both" },
    ],
  },
] as const

function makeConfig(config: SectionConfig): SectionConfig {
  return {
    visible: true,
    hideOnMobile: false,
    backgroundStyle: "panel",
    contentWidth: "xl",
    paddingY: "md",
    textAlign: "left",
    divider: "none",
    columns: 1,
    sectionBackgroundFillType: "solid",
    sectionGradientColorA: "#0f172a",
    sectionGradientColorB: "#1d4ed8",
    sectionGradientAngle: "135deg",
    ...config,
  }
}

function makeSystemBlock(
  componentKey: SystemComponentKey,
  options?: {
    title?: string
    body?: string | null
    variant?: string
    containerStyle?: "none" | "panel" | "subtle"
  }
): SectionBlock {
  return {
    id: `block-${componentKey}-${Math.random().toString(36).slice(2, 8)}`,
    type: "system_component",
    props: {
      componentKey,
      title: options?.title,
      body: options?.body ?? null,
      variant: options?.variant,
      containerStyle: options?.containerStyle ?? "panel",
    },
  }
}

export const SECTION_REGISTRY: Record<SectionType, SectionRegistryItem> = {
  hero: {
    type: "hero",
    label: "Hero",
    description: "Top hero section for the event page.",
    defaultConfig: makeConfig({
      adminLabel: "Hero",
      title: "Welcome",
      body: "Join the live experience, explore the agenda, and access your event areas.",
      backgroundStyle: "subtle",
      contentWidth: "xl",
      paddingY: "lg",
      textAlign: "left",
      divider: "bottom",
    }),
    fields: [...sharedFields],
  },

  content: {
    type: "content",
    label: "Content",
    description: "Flexible single-column content section.",
    defaultConfig: makeConfig({
      adminLabel: "Content Section",
      title: "Content Section",
      body: "Add content here.",
      backgroundStyle: "panel",
      contentWidth: "xl",
      paddingY: "md",
      textAlign: "left",
      divider: "none",
      columns: 1,
    }),
    fields: [...sharedFields],
  },

  grid: {
    type: "grid",
    label: "Grid",
    description: "Multi-card or multi-block section.",
    defaultConfig: makeConfig({
      adminLabel: "Grid Section",
      title: "Grid Section",
      body: "",
      backgroundStyle: "panel",
      contentWidth: "xl",
      paddingY: "md",
      textAlign: "left",
      divider: "none",
      columns: 2,
    }),
    fields: [...sharedFields],
  },

  system: {
    type: "system",
    label: "System",
    description: "Section intended to hold injected system components.",
    defaultConfig: makeConfig({
      adminLabel: "System Section",
      title: "System Section",
      body: "",
      backgroundStyle: "panel",
      contentWidth: "xl",
      paddingY: "md",
      textAlign: "left",
      divider: "none",
      columns: 1,
    }),
    fields: [...sharedFields],
  },
}

export const SECTION_TEMPLATE_OPTIONS = [
  {
    key: "content" as SectionType,
    title: "Content",
    body: "Flexible single-column content section.",
  },
  {
    key: "grid" as SectionType,
    title: "Grid",
    body: "Multi-card or multi-block section.",
  },
  {
    key: "system" as SectionType,
    title: "System",
    body: "Section intended to hold injected system components.",
  },
]

export function getSectionRegistryItem(type: SectionType) {
  return SECTION_REGISTRY[type]
}

export function getDefaultSectionConfig(type: SectionType) {
  return { ...SECTION_REGISTRY[type].defaultConfig }
}

export function createDefaultEventHomeSections(event: {
  title: string
  description?: string | null
}): EventPageSection[] {
  return [
    {
      id: "hero",
      type: "hero",
      config: {
        ...getDefaultSectionConfig("hero"),
        adminLabel: "Hero",
        title: event.title || "Welcome",
        body:
          event.description ||
          "Join the live experience, explore the agenda, and access your event areas.",
      },
      blocks: [],
    },

    {
      id: "access",
      type: "system",
      config: {
        ...getDefaultSectionConfig("system"),
        adminLabel: "Access Gate",
        title: "Attendee Access",
        body: "Use the email assigned to your event registration to continue.",
      },
      blocks: [makeSystemBlock("access_gate")],
    },

    {
      id: "live",
      type: "system",
      config: {
        ...getDefaultSectionConfig("system"),
        adminLabel: "Broadcast Status",
        title: "Broadcast status",
        body: "This area reflects the current live routing and destination.",
      },
      blocks: [makeSystemBlock("live_state")],
    },

    {
      id: "stage",
      type: "system",
      config: {
        ...getDefaultSectionConfig("system"),
        adminLabel: "Main Stage",
        title: "Main stage",
        body: "Your live or upcoming main video experience appears here.",
      },
      blocks: [makeSystemBlock("stage_player")],
    },

    {
      id: "countdown",
      type: "system",
      config: {
        ...getDefaultSectionConfig("system"),
        adminLabel: "Countdown",
        title: "What is next",
        body: "",
      },
      blocks: [makeSystemBlock("countdown")],
    },

    {
      id: "agenda",
      type: "system",
      config: {
        ...getDefaultSectionConfig("system"),
        adminLabel: "Agenda",
        title: "Event Agenda",
        body: "Explore the full schedule of sessions.",
      },
      blocks: [makeSystemBlock("agenda")],
    },

    {
      id: "sessions",
      type: "system",
      config: {
        ...getDefaultSectionConfig("system"),
        adminLabel: "Sessions",
        title: "All Sessions",
        body: "Browse available sessions and content.",
      },
      blocks: [makeSystemBlock("sessions_list")],
    },

    {
      id: "speakers",
      type: "system",
      config: {
        ...getDefaultSectionConfig("system"),
        adminLabel: "Speaker Spotlight",
        title: "Speaker spotlight",
        body: "",
      },
      blocks: [makeSystemBlock("speaker_spotlight")],
    },

    {
      id: "breakouts",
      type: "system",
      config: {
        ...getDefaultSectionConfig("system"),
        adminLabel: "Featured Breakouts",
        title: "Featured breakouts",
        body: "",
      },
      blocks: [makeSystemBlock("featured_breakouts")],
    },
  ]
}