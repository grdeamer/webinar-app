import type { ViewerContext } from "@/lib/domain/access"
import { getEventEmailFromCookies, getEventUserOrNull } from "@/lib/eventAuth"
import { getAssignedSessionIdsForRegistrantEmail } from "@/lib/repos/sessionsRepo"

export async function buildEventViewerContext(
  slug: string,
  eventId: string
): Promise<ViewerContext> {
  const authedUser = await getEventUserOrNull({ slug })

  if (authedUser?.user) {
    return {
      type: authedUser.user.role === "admin" ? "admin" : "attendee",
      email: authedUser.user.email ?? null,
      userId: authedUser.user.id,
      eventId,
      assignedSessionIds: [],
    }
  }

  const email = await getEventEmailFromCookies(slug)

  if (!email) {
    return {
      type: "guest",
      email: null,
      userId: null,
      eventId,
      assignedSessionIds: [],
    }
  }

  const assignedSessionIds = await getAssignedSessionIdsForRegistrantEmail(eventId, email)

  return {
    type: "attendee",
    email,
    userId: null,
    eventId,
    assignedSessionIds,
  }
}