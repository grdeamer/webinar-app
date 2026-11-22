import type { EventFeature, EventTeamRole } from "./eventPermissions"

type Destination = {
  route: string
  label: string
  feature: EventFeature
  aliases?: readonly string[]
}

type Section = {
  id: string
  label: string
  description: string
  destinations: readonly Destination[]
}

export const eventWorkspaceSections: readonly Section[] = [
  {
    id: "overview",
    label: "Overview",
    description: "See event status and what needs your attention.",
    destinations: [],
  },
  {
    id: "setup",
    label: "Event setup",
    description: "Set event details, locations, and districts.",
    destinations: [
      { route: "settings", label: "Event details", feature: "event_details" },
      { route: "districts", label: "Districts", feature: "districts" },
    ],
  },
  {
    id: "people",
    label: "People",
    description: "Manage attendees, presenters, and your team.",
    destinations: [
      { route: "attendees", label: "Attendees & presenters", feature: "people", aliases: ["import-attendees"] },
      { route: "registrations", label: "Registration approvals", feature: "people" },
    ],
  },
  {
    id: "program",
    label: "Schedule",
    description: "Set the event schedule and decide how attendees join each session.",
    destinations: [
      { route: "sessions", label: "Schedule & sessions", feature: "program", aliases: ["breakouts"] },
      { route: "page-editor", label: "Experience", feature: "experience", aliases: ["studio"] },
    ],
  },
  {
    id: "communications",
    label: "Communications",
    description: "Create and send event messages.",
    destinations: [{ route: "emails", label: "Event emails", feature: "communications" }],
  },
  {
    id: "production",
    label: "Production",
    description: "Coordinate the run of show and live operations.",
    destinations: [
      { route: "agenda", label: "Run of Show", feature: "run_of_show", aliases: ["director", "command-center"] },
      { route: "producer/room", label: "Producer Room", feature: "producer_room", aliases: ["producer"] },
      { route: "routing", label: "Audience Flow", feature: "run_of_show" },
      { route: "infrastructure", label: "Infrastructure readiness", feature: "event_details" },
    ],
  },
  {
    id: "analytics",
    label: "Analytics",
    description: "Track registration and event performance.",
    destinations: [{ route: "analytics", label: "Event reports", feature: "analytics" }],
  },
]

export type WorkspaceNavigationAccess = {
  isGlobalAdmin: boolean
  teamRole: "owner" | "administrator" | EventTeamRole
  features: readonly EventFeature[]
}

export function canOpenWorkspaceDestination(
  access: WorkspaceNavigationAccess | null,
  destination: Pick<Destination, "route" | "feature">,
) {
  if (!access) return false
  if (access.isGlobalAdmin) return true
  if (!access.features.includes(destination.feature)) return false

  // Match proxy.ts's restricted event-member page routes as well as page-level feature checks.
  if (access.teamRole === "viewer") return destination.route === "analytics"
  if (access.teamRole === "producer") {
    return ["analytics", "agenda", "routing", "producer/room"].includes(destination.route)
  }
  return access.teamRole === "event_admin"
}

export function resolveWorkspaceSection(route: string) {
  if (route === "publishing" || route.startsWith("publishing/")) return null
  if (/^sessions\/[^/]+\/producer(?:\/|$)/.test(route)) {
    return { section: eventWorkspaceSections.find(({ id }) => id === "production")!, selected: "producer/room" }
  }

  for (const section of eventWorkspaceSections) {
    const destination = section.destinations.find(({ route: target, aliases = [] }) =>
      [target, ...aliases].some((path) => route === path || route.startsWith(path + "/"))
    )
    if (destination) return { section, selected: destination.route }
  }
  return { section: eventWorkspaceSections[0], selected: "" }
}
