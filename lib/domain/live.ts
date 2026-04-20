export type EventLiveMode =
  | "idle"
  | "announcement"
  | "session_redirect"
  | "multi_session"

export type EventLiveDestinationKind = "none" | "session"

export type EventLiveDestinationType = "none" | "session" | "general_session"

export type ResolvedEventLiveDestination =
  | {
      kind: "none"
      mode: EventLiveMode | null
      destinationType: "none"
      headline: string | null
      message: string | null
      forceRedirect: false
      sessionId: null
      href: null
    }
  | {
      kind: "session"
      mode: EventLiveMode | null
      destinationType: "session" | "general_session"
      headline: string | null
      message: string | null
      forceRedirect: boolean
      sessionId: string
      href: string
    }