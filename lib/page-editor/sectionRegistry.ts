import type {
  SectionConfig,
  SectionRegistryItem,
  SectionType,
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
    ...config,
  }
}

export const SECTION_REGISTRY: Record<SectionType, SectionRegistryItem> = {
  hero: {
    type: "hero",
    label: "Hero",
    description: "Top hero section for the event page.",
    defaultConfig: makeConfig({
      adminLabel: "Hero",
      title: "Event Title",
      body: "Event description goes here.",
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
    description: "Generic text/content section.",
    defaultConfig: makeConfig({
      adminLabel: "Content",
      title: "Content Section",
      body: "Add content here.",
      backgroundStyle: "panel",
      contentWidth: "xl",
      paddingY: "md",
      textAlign: "left",
      divider: "none",
    }),
    fields: [...sharedFields],
  },

  agenda: {
    type: "agenda",
    label: "Agenda",
    description: "Agenda/timeline layout starter.",
    defaultConfig: makeConfig({
      adminLabel: "Agenda",
      title: "Agenda",
      body:
        "9:00 AM — Welcome\n10:00 AM — General Session\n11:00 AM — Breakout Sessions\n12:00 PM — Closing Remarks",
      backgroundStyle: "panel",
      contentWidth: "xl",
      paddingY: "md",
      textAlign: "left",
      divider: "top",
    }),
    fields: [...sharedFields],
  },

  speakers: {
    type: "speakers",
    label: "Speakers",
    description: "Speaker roster starter section.",
    defaultConfig: makeConfig({
      adminLabel: "Speakers",
      title: "Featured Speakers",
      body:
        "Speaker One — Title, Company\nSpeaker Two — Title, Company\nSpeaker Three — Title, Company",
      backgroundStyle: "subtle",
      contentWidth: "xl",
      paddingY: "md",
      textAlign: "left",
      divider: "top",
    }),
    fields: [...sharedFields],
  },

  resources: {
    type: "resources",
    label: "Resources",
    description: "Downloads, PDFs, and links.",
    defaultConfig: makeConfig({
      adminLabel: "Resources",
      title: "Resources",
      body:
        "Download slides\nView agenda PDF\nAccess support materials\nReview follow-up links",
      backgroundStyle: "panel",
      contentWidth: "lg",
      paddingY: "md",
      textAlign: "left",
      divider: "top",
    }),
    fields: [...sharedFields],
  },

  cta: {
    type: "cta",
    label: "CTA",
    description: "Centered call-to-action section.",
    defaultConfig: makeConfig({
      adminLabel: "CTA",
      title: "Ready to Join?",
      body: "Register now, access your materials, and join the session when it begins.",
      backgroundStyle: "subtle",
      contentWidth: "md",
      paddingY: "lg",
      textAlign: "center",
      divider: "both",
    }),
    fields: [...sharedFields],
  },
}

export const SECTION_TEMPLATE_OPTIONS = [
  {
    key: "content" as SectionType,
    title: "Content",
    body: "Generic text/content section.",
  },
  {
    key: "agenda" as SectionType,
    title: "Agenda",
    body: "Agenda/timeline layout starter.",
  },
  {
    key: "speakers" as SectionType,
    title: "Speakers",
    body: "Speaker roster starter section.",
  },
  {
    key: "resources" as SectionType,
    title: "Resources",
    body: "Downloads, PDFs, and links.",
  },
  {
    key: "cta" as SectionType,
    title: "CTA",
    body: "Centered call-to-action section.",
  },
]

export function getSectionRegistryItem(type: SectionType) {
  return SECTION_REGISTRY[type]
}

export function getDefaultSectionConfig(type: SectionType) {
  return { ...SECTION_REGISTRY[type].defaultConfig }
}