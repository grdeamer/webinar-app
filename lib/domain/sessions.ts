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

  kind: SessionKind
  visibilityMode: SessionVisibilityMode
  deliveryMode: SessionDeliveryMode
  runtimeStatus: SessionRuntimeStatus

  isGeneralSession: boolean

  externalPlatform: ExternalPlatform | null
  externalJoinUrl: string | null
  joinLink: string | null

  liveProvider: "livekit" | null
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