export type EventLiveMode =
  | "idle"
  | "announcement"
  | "session_redirect"
  | "multi_session"

export type ResolvedEventLiveDestination =
  | {
      kind: "none"
      mode: EventLiveMode | null
      headline: string | null
      message: string | null
      forceRedirect: false
      sessionId: null
      href: null
    }
  | {
      kind: "session"
      mode: EventLiveMode
      headline: string | null
      message: string | null
      forceRedirect: boolean
      sessionId: string
      href: string
    }