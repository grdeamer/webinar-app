export const ATTENDEE_COMPONENT_KEYS = ["countdown", "next_up", "agenda"] as const

export type AttendeeComponentKey = (typeof ATTENDEE_COMPONENT_KEYS)[number]
export type CountdownMode = "next_session" | "current_session_end" | "event_start"

export type AttendeeComponentState = Record<AttendeeComponentKey, boolean> & {
  countdown_mode: CountdownMode
}

export const DEFAULT_ATTENDEE_COMPONENT_STATE: AttendeeComponentState = {
  countdown: true,
  next_up: true,
  agenda: true,
  countdown_mode: "next_session",
}

export function normalizeAttendeeComponentState(value: unknown): AttendeeComponentState {
  const input = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
  const countdownMode = input.countdown_mode
  return {
    countdown: input.countdown !== false,
    next_up: input.next_up !== false,
    agenda: input.agenda !== false,
    countdown_mode:
      countdownMode === "current_session_end" || countdownMode === "event_start"
        ? countdownMode
        : "next_session",
  }
}

export function componentIsVisible(
  state: AttendeeComponentState,
  componentKey: string,
): boolean {
  if (componentKey === "countdown") return state.countdown
  if (componentKey === "agenda") return state.agenda
  if (componentKey === "next_up") return state.next_up
  return true
}
