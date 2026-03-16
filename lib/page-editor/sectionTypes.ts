export type SectionType = "hero" | "content" | "agenda" | "speakers" | "resources" | "cta"

export type SectionFieldType =
  | "text"
  | "textarea"
  | "select"
  | "checkbox"

export type SectionFieldOption = {
  label: string
  value: string
}

export type SectionFieldDefinition =
  | {
      key: string
      label: string
      type: "text" | "textarea"
      placeholder?: string
    }
  | {
      key: string
      label: string
      type: "checkbox"
    }
  | {
      key: string
      label: string
      type: "select"
      options: readonly SectionFieldOption[]
    }

export type SectionConfig = {
  title?: string
  body?: string | null
  visible?: boolean
  adminLabel?: string
  backgroundStyle?: "transparent" | "subtle" | "panel"
  contentWidth?: "md" | "lg" | "xl" | "full"
  paddingY?: "sm" | "md" | "lg"
  textAlign?: "left" | "center"
  divider?: "none" | "top" | "bottom" | "both"
  hideOnMobile?: boolean
}

export type EventPageSection = {
  id: string
  type: SectionType
  config: SectionConfig
}

export type SectionRegistryItem = {
  type: SectionType
  label: string
  description: string
  defaultConfig: SectionConfig
  fields: SectionFieldDefinition[]
}