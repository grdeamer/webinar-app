import { getSessionById } from "@/lib/repos/sessionsRepo"

export type SessionLiveContext = {
  sessionId: string
  eventId: string
  title: string
  deliveryMode: "external" | "livekit" | "video" | "rtmp"
  liveProvider: "livekit" | null
  liveRoomName: string | null
  runtimeStatus: "scheduled" | "holding" | "live" | "paused" | "ended"
  isGeneralSession: boolean
}

export async function getSessionLiveContext(eventId: string, sessionId: string) {
  const session = await getSessionById(eventId, sessionId)

  if (!session) return null

  const result: SessionLiveContext = {
    sessionId: session.id,
    eventId: session.eventId,
    title: session.title,
    deliveryMode: session.deliveryMode,
    liveProvider: session.liveProvider,
    liveRoomName: session.liveRoomName,
    runtimeStatus: session.runtimeStatus,
    isGeneralSession: session.isGeneralSession,
  }

  return result
}