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

const PUBLIC_PAGE_PATHS: Record<string, string> = {
  event_home: "",
  agenda: "/agenda",
  breakouts: "/breakouts",
  lobby: "/lobby",
  on_demand: "/on-demand",
  sessions: "/sessions",
  sponsors: "/sponsors",
  chat: "/chat",
  networking: "/networking",
}

export function getPublicEditorPageUrl(slug: string, pageKey: string) {
  const suffix = PUBLIC_PAGE_PATHS[pageKey]
  return suffix !== undefined
    ? `/events/${encodeURIComponent(slug)}${suffix}`
    : `/events/${encodeURIComponent(slug)}/pages/${encodeURIComponent(pageKey)}`
}
