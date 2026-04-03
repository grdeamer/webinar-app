import type { ViewerContext } from "@/lib/domain/access"
import type { ResolvedEventLiveDestination } from "@/lib/domain/live"
import { canViewerAccessSession } from "@/lib/domain/access"
import { getEventLiveState } from "@/lib/repos/liveStateRepo"
import { getSessionById } from "@/lib/repos/sessionsRepo"

function normalizeMode(value: string | null): ResolvedEventLiveDestination["mode"] {
  if (
    value === "idle" ||
    value === "announcement" ||
    value === "session_redirect" ||
    value === "multi_session"
  ) {
    return value
  }
  return null
}

export async function getEventLiveDestination(
  slug: string,
  eventId: string,
  viewer: ViewerContext
): Promise<ResolvedEventLiveDestination> {
  const liveState = await getEventLiveState(eventId)

  if (!liveState) {
    return {
      kind: "none",
      mode: null,
      headline: null,
      message: null,
      forceRedirect: false,
      sessionId: null,
      href: null,
    }
  }

  const mode = normalizeMode(liveState.mode)
  const headline = liveState.headline ?? null
  const message = liveState.message ?? null
  const forceRedirect = !!liveState.force_redirect

  if (!liveState.active_breakout_id) {
    return {
      kind: "none",
      mode,
      headline,
      message,
      forceRedirect: false,
      sessionId: null,
      href: null,
    }
  }

  const targetSession = await getSessionById(eventId, liveState.active_breakout_id)

  if (!targetSession) {
    return {
      kind: "none",
      mode,
      headline,
      message,
      forceRedirect: false,
      sessionId: null,
      href: null,
    }
  }

  const access = canViewerAccessSession(targetSession, viewer)

  if (!access.canView) {
    return {
      kind: "none",
      mode,
      headline,
      message,
      forceRedirect: false,
      sessionId: null,
      href: null,
    }
  }

  return {
    kind: "session",
    mode: mode ?? "session_redirect",
    headline,
    message,
    forceRedirect,
    sessionId: targetSession.id,
    href: `/events/${slug}/sessions/${targetSession.id}`,
  }
}