export type SectionType = "hero" | "content" | "system" | "grid"

export type SystemComponentKey =
  | "live_state"
  | "stage_player"
  | "sessions_list"
  | "agenda"
  | "countdown"
  | "speaker_cards"
  | "speaker_spotlight"
  | "schedule_rail"
  | "chat"
  | "qa"
  | "join_button"
  | "access_gate"
  | "sponsors"
  | "breakouts"
  | "featured_breakouts"

export type SectionFieldDefinition = {
  key: string
  label: string
  type: "text" | "textarea" | "select" | "toggle" | "checkbox" | "number"
  placeholder?: string
  options?: ReadonlyArray<{
    readonly label: string
    readonly value: string
  }>
}

export type SectionBlock =
  | {
      id: string
      type: "rich_text"
      props: {
        title?: string
        body?: string | null
        align?: "left" | "center"
      }
    }
  | {
      id: string
      type: "system_component"
      props: {
        componentKey: SystemComponentKey
        variant?: string
        title?: string
        body?: string | null
        containerStyle?: "none" | "panel" | "subtle"
      }
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
  columns?: 1 | 2
  sectionBackgroundColor?: string
  sectionBorderColor?: string
  sectionTextColor?: string
}

export type EventPageSection = {
  id: string
  type: SectionType
  config: SectionConfig
  blocks?: SectionBlock[]
}

export type SectionRegistryItem = {
  type: SectionType
  label: string
  description: string
  defaultConfig: SectionConfig
  fields: SectionFieldDefinition[]
}