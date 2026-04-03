import type { AppSession } from "@/lib/domain/sessions"

export type ViewerType = "guest" | "attendee" | "admin"

export type ViewerContext = {
  type: ViewerType
  email: string | null
  userId: string | null
  eventId: string | null
  assignedSessionIds: string[]
}

export type SessionAccessReason =
  | "ok"
  | "login_required"
  | "not_registered"
  | "not_assigned"
  | "hidden"

export type SessionAccessResult = {
  canView: boolean
  reason: SessionAccessReason
}

export function canViewerAccessSession(
  session: AppSession,
  viewer: ViewerContext
): SessionAccessResult {
  if (viewer.type === "admin") {
    return { canView: true, reason: "ok" }
  }

  if (session.visibilityMode === "hidden") {
    return { canView: false, reason: "hidden" }
  }

  if (session.visibilityMode === "all" || session.visibilityMode === "public") {
    return { canView: true, reason: "ok" }
  }

  if (!viewer.email) {
    return { canView: false, reason: "login_required" }
  }

  if (session.visibilityMode === "registered") {
    return { canView: true, reason: "ok" }
  }

  if (session.visibilityMode === "assigned") {
    return viewer.assignedSessionIds.includes(session.id)
      ? { canView: true, reason: "ok" }
      : { canView: false, reason: "not_assigned" }
  }

  return { canView: false, reason: "not_registered" }
}