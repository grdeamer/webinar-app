export type SessionKind =
  | "general"
  | "breakout"
  | "meeting"
  | "broadcast"
  | "on_demand"
  | "session"

export type SessionDeliveryMode =
  | "external"
  | "livekit"
  | "video"
  | "rtmp"

export type SessionVisibilityMode =
  | "all"
  | "public"
  | "registered"
  | "assigned"
  | "hidden"

export type SessionRuntimeStatus =
  | "scheduled"
  | "holding"
  | "live"
  | "paused"
  | "ended"

export type ExternalPlatform =
  | "zoom"
  | "teams"
  | "webex"
  | "custom"

export type PlaybackType = "mp4" | "m3u8" | "hls"

export type LiveProvider = "livekit"

export type SessionCapability = {
  chat: boolean
  qa: boolean
  lowerPanel: boolean
  live: boolean
  playback: boolean
  external: boolean
}

export type AppSession = {
  id: string
  eventId: string

  code: string | null
  slug: string | null

  title: string
  description: string | null

  startsAt: string | null
  endsAt: string | null

  presenter: string | null
  speakerName: string | null

  /**
   * Canonical session identity.
   * Use this as the primary branch point in new code.
   */
  kind: SessionKind

  visibilityMode: SessionVisibilityMode
  deliveryMode: SessionDeliveryMode
  runtimeStatus: SessionRuntimeStatus

  /**
   * Legacy compatibility flag.
   * Prefer `kind === "general"` in new code.
   */
  isGeneralSession: boolean

  externalPlatform: ExternalPlatform | null
  externalJoinUrl: string | null
  joinLink: string | null

  liveProvider: LiveProvider | null
  liveRoomName: string | null

  playbackType: PlaybackType | null
  playbackMp4Url: string | null
  playbackM3u8Url: string | null

  chatEnabled: boolean
  qaEnabled: boolean
  lowerPanelEnabled: boolean

  sortOrder: number | null

  createdAt: string | null
  updatedAt: string | null
}

export function isGeneralSession(session: AppSession): boolean {
  return session.kind === "general" || session.isGeneralSession
}

export function isBreakoutSession(session: AppSession): boolean {
  return session.kind === "breakout"
}

export function isOnDemandSession(session: AppSession): boolean {
  return session.kind === "on_demand"
}

export function usesLiveKit(session: AppSession): boolean {
  return session.deliveryMode === "livekit"
}

export function usesExternalJoin(session: AppSession): boolean {
  return session.deliveryMode === "external"
}

export function hasPlayback(session: AppSession): boolean {
  return Boolean(session.playbackMp4Url || session.playbackM3u8Url)
}

export function hasChat(session: AppSession): boolean {
  return session.chatEnabled
}

export function hasQa(session: AppSession): boolean {
  return session.qaEnabled
}

export function hasLowerPanel(session: AppSession): boolean {
  return session.lowerPanelEnabled
}

export function getSessionCapability(session: AppSession): SessionCapability {
  return {
    chat: hasChat(session),
    qa: hasQa(session),
    lowerPanel: hasLowerPanel(session),
    live: usesLiveKit(session),
    playback: hasPlayback(session),
    external: usesExternalJoin(session),
  }
}

export function getSessionPrimaryExperience(
  session: AppSession
): "live" | "playback" | "external" | "details" {
  if (usesLiveKit(session)) return "live"
  if (hasPlayback(session)) return "playback"
  if (usesExternalJoin(session)) return "external"
  return "details"
}