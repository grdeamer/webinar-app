import type { SystemComponentKey } from "@/lib/page-editor/sectionTypes"

export type SystemComponentDefinition = {
  key: SystemComponentKey
  label: string
  description?: string
}

export const SYSTEM_COMPONENTS: SystemComponentDefinition[] = [
  { key: "access_gate", label: "Access Gate" },
  { key: "stage_player", label: "Stage Player" },
  { key: "live_state", label: "Live Status" },
  { key: "countdown", label: "Countdown" },
  { key: "speaker_spotlight", label: "Speaker Spotlight" },
  { key: "speaker_cards", label: "Speaker Grid" },
  { key: "schedule_rail", label: "Schedule Rail" },
  { key: "sessions_list", label: "Sessions List" },
  { key: "featured_breakouts", label: "Featured Breakouts" },
  { key: "chat", label: "Chat" },
  { key: "qa", label: "Q&A" },
] 