import type { SystemComponentKey } from "./sectionTypes"

export const SYSTEM_COMPONENTS: Array<{
  key: SystemComponentKey
  label: string
}> = [
  { key: "live_state", label: "Live Status" },
  { key: "stage_player", label: "Stage Player (Main Video)" },
  { key: "countdown", label: "Countdown Timer" },

  // 🔥 Speakers
  { key: "speaker_spotlight", label: "Speaker Spotlight" },
  { key: "speaker_cards", label: "Speaker Grid" },

  // 🔥 Agenda / Sessions (important for next step)
  { key: "agenda", label: "Agenda (Full Schedule)" },
  { key: "schedule_rail", label: "Schedule Rail (Sidebar)" },
  { key: "sessions_list", label: "Sessions List" },

  // 🔥 Event flow
  { key: "featured_breakouts", label: "Featured Sessions" },
  { key: "breakouts", label: "All Sessions / Breakouts" },

  // 🔥 Engagement (future-ready)
  { key: "chat", label: "Chat" },
  { key: "qa", label: "Q&A Panel" },

  // 🔐 Access
  { key: "access_gate", label: "Access Gate / Login" },
  { key: "join_button", label: "Join Button" },

  // 💰 Monetization / branding
  { key: "sponsors", label: "Sponsors" },
]