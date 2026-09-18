export const EVENT_FEATURES = [
  { key: "event_details", label: "Event details", description: "Dates, identity, access, and core settings." },
  { key: "people", label: "People", description: "Attendees, presenters, and assignments." },
  { key: "program", label: "Program", description: "Sessions, schedule, and speaker details." },
  { key: "districts", label: "Districts", description: "District tree and attendee routing." },
  { key: "experience", label: "Experience", description: "Attendee pages, theme, and reusable components." },
  { key: "communications", label: "Communications", description: "Event emails and presenter links." },
  { key: "publishing", label: "Publishing", description: "Publish and deployment controls." },
  { key: "analytics", label: "Analytics", description: "Event reporting and exports." },
  { key: "run_of_show", label: "Run of show", description: "Live schedule and attendee display controls." },
  { key: "producer_room", label: "Producer room", description: "Backstage, stage, media, and broadcast tools." },
] as const

export type EventFeature = (typeof EVENT_FEATURES)[number]["key"]
export type EventTeamRole = "event_admin" | "producer" | "viewer"

export const ALL_EVENT_FEATURES = EVENT_FEATURES.map((feature) => feature.key) as EventFeature[]

export const EVENT_ROLE_FEATURES: Record<EventTeamRole, EventFeature[]> = {
  event_admin: [...ALL_EVENT_FEATURES],
  producer: ["people", "program", "analytics", "run_of_show", "producer_room"],
  viewer: ["analytics"],
}

export function normalizeEventFeatures(value: unknown): EventFeature[] {
  if (!Array.isArray(value)) return []
  const allowed = new Set<EventFeature>(ALL_EVENT_FEATURES)
  return [...new Set(value.filter((item): item is EventFeature => typeof item === "string" && allowed.has(item as EventFeature)))]
}

export function featuresForEventRole(role: EventTeamRole, custom: unknown): EventFeature[] {
  return custom === null || custom === undefined
    ? [...EVENT_ROLE_FEATURES[role]]
    : normalizeEventFeatures(custom)
}

