export const EDITOR_PAGES = [
  { label: "Home", value: "event_home", description: "Hero and registration" },
  { label: "Agenda", value: "agenda", description: "Schedule and tracks" },
  { label: "Districts", value: "breakouts", description: "District access" },
  { label: "Lobby", value: "lobby", description: "Arrival experience" },
  { label: "Resources", value: "on_demand", description: "On-demand library" },
  { label: "Sessions", value: "sessions", description: "Session catalog" },
  { label: "Sponsors", value: "sponsors", description: "Sponsor showcase" },
  { label: "Engage", value: "chat", description: "Audience conversation" },
  { label: "Networking", value: "networking", description: "Peer connections" },
] as const

export type EditorPageKey = (typeof EDITOR_PAGES)[number]["value"]
