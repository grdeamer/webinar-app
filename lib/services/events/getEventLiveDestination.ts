import type { ViewerContext } from "@/lib/domain/access"
import type {
  EventLiveDestinationType,
  ResolvedEventLiveDestination,
} from "@/lib/domain/live"
import { canViewerAccessSession } from "@/lib/domain/access"
import { isGeneralSession } from "@/lib/domain/sessions"
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

function normalizeDestinationType(value: unknown): EventLiveDestinationType {
  if (value === "session") return "session"
  if (value === "general_session") return "general_session"
  return "none"
}

function resolveTargetSessionId(liveState: Record<string, any> | null): string | null {
  if (!liveState) return null

  if (
    typeof liveState.destination_session_id === "string" &&
    liveState.destination_session_id.trim().length > 0
  ) {
    return liveState.destination_session_id
  }

  if (
    typeof liveState.active_breakout_id === "string" &&
    liveState.active_breakout_id.trim().length > 0
  ) {
    return liveState.active_breakout_id
  }

  return null
}

type TransitionDestinationFields = {
  transition_active: boolean
  transition_type: string | null
}

function withTransition<T extends object>(
  value: T,
  transitionActive: boolean,
  transitionType: string | null
): T & TransitionDestinationFields {
  return {
    ...value,
    transition_active: transitionActive,
    transition_type: transitionType,
  }
}

function noneDestination(
  mode: ResolvedEventLiveDestination["mode"],
  headline: string | null,
  message: string | null,
  transitionActive = false,
  transitionType: string | null = null
): ResolvedEventLiveDestination & TransitionDestinationFields {
  return withTransition(
    {
      kind: "none",
      mode,
      destinationType: "none",
      headline,
      message,
      forceRedirect: false,
      sessionId: null,
      href: null,
    },
    transitionActive,
    transitionType
  )
}

function sessionDestination(args: {
  slug: string
  sessionId: string
  destinationType: "session" | "general_session"
  mode: ResolvedEventLiveDestination["mode"]
  headline: string | null
  message: string | null
  forceRedirect: boolean
  transitionActive?: boolean
  transitionType?: string | null
}): ResolvedEventLiveDestination & TransitionDestinationFields {
  return withTransition(
    {
      kind: "session",
      mode: args.mode ?? "session_redirect",
      destinationType: args.destinationType,
      headline: args.headline,
      message: args.message,
      forceRedirect: args.forceRedirect,
      sessionId: args.sessionId,
      href: `/events/${args.slug}/sessions/${args.sessionId}`,
    },
    args.transitionActive ?? false,
    args.transitionType ?? null
  )
}

export async function getEventLiveDestination(
  slug: string,
  eventId: string,
  viewer: ViewerContext
): Promise<ResolvedEventLiveDestination & TransitionDestinationFields> {
  const liveState = await getEventLiveState(eventId)

  if (!liveState) {
    return noneDestination(null, null, null)
  }

  const liveStateWithTransitions = liveState as typeof liveState & {
    transition_active?: boolean | null
    transition_type?: string | null
  }

  const mode = normalizeMode(liveState.mode)
  const headline = liveState.headline ?? null
  const message = liveState.message ?? null
  const forceRedirect = !!liveState.force_redirect
  const transitionActive = !!liveStateWithTransitions.transition_active
  const transitionType = liveStateWithTransitions.transition_type ?? null

  const destinationType = normalizeDestinationType(liveState.destination_type)
  const targetSessionId = resolveTargetSessionId(liveState)

  if (!targetSessionId) {
    return noneDestination(mode, headline, message, transitionActive, transitionType)
  }

  const targetSession = await getSessionById(eventId, targetSessionId)

  if (!targetSession) {
    return noneDestination(mode, headline, message, transitionActive, transitionType)
  }

  const access = canViewerAccessSession(targetSession, viewer)

  if (!access.canView) {
    return noneDestination(mode, headline, message, transitionActive, transitionType)
  }

  if (destinationType === "general_session") {
    return sessionDestination({
      slug,
      sessionId: targetSession.id,
      destinationType: "general_session",
      mode,
      headline,
      message,
      forceRedirect,
      transitionActive,
      transitionType,
    })
  }

  if (destinationType === "session") {
    return sessionDestination({
      slug,
      sessionId: targetSession.id,
      destinationType: "session",
      mode,
      headline,
      message,
      forceRedirect,
      transitionActive,
      transitionType,
    })
  }

  if (isGeneralSession(targetSession)) {
    return sessionDestination({
      slug,
      sessionId: targetSession.id,
      destinationType: "general_session",
      mode,
      headline,
      message,
      forceRedirect,
      transitionActive,
      transitionType,
    })
  }

  return sessionDestination({
    slug,
    sessionId: targetSession.id,
    destinationType: "session",
    mode,
    headline,
    message,
    forceRedirect,
    transitionActive,
    transitionType,
  })
}