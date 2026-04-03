import type { ViewerContext } from "@/lib/domain/access"
import { getSessionLiveContext } from "@/lib/services/sessions/getSessionLiveContext"

export type SessionBackstageAccessResult =
  | {
      allowed: false
      reason: "session_not_found" | "not_livekit" | "not_authenticated"
      liveContext: null
    }
  | {
      allowed: true
      reason: "ok"
      liveContext: Awaited<ReturnType<typeof getSessionLiveContext>>
    }

export async function getSessionBackstageAccess(
  eventId: string,
  sessionId: string,
  viewer: ViewerContext
): Promise<SessionBackstageAccessResult> {
  const liveContext = await getSessionLiveContext(eventId, sessionId)

  if (!liveContext) {
    return {
      allowed: false,
      reason: "session_not_found",
      liveContext: null,
    }
  }

  if (liveContext.deliveryMode !== "livekit" || !liveContext.liveRoomName) {
    return {
      allowed: false,
      reason: "not_livekit",
      liveContext: null,
    }
  }

  if (viewer.type === "guest") {
    return {
      allowed: false,
      reason: "not_authenticated",
      liveContext: null,
    }
  }

  return {
    allowed: true,
    reason: "ok",
    liveContext,
  }
}