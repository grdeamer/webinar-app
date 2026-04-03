import type { ViewerContext } from "@/lib/domain/access"
import type { AppSession } from "@/lib/domain/sessions"
import { listEventSessions } from "@/lib/repos/sessionsRepo"
import { canViewerAccessSession } from "@/lib/domain/access"

export async function getEventSessions(
  eventId: string,
  viewer: ViewerContext
): Promise<AppSession[]> {
  const sessions = await listEventSessions(eventId)

  return sessions.filter((session) => {
    const access = canViewerAccessSession(session, viewer)
    return access.canView
  })
}