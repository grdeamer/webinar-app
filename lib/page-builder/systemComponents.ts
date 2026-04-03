import type { ReactNode } from "react"

export type SystemComponentKey =
  | "live_state"
  | "stage_player"
  | "sessions_list"
  | "agenda"
  | "countdown"
  | "speaker_cards"
  | "speaker_spotlight"
  | "schedule_rail"
  | "chat"
  | "qa"
  | "join_button"
  | "access_gate"
  | "sponsors"
  | "breakouts"
  | "featured_breakouts"

export type SystemComponentsMap = Partial<Record<SystemComponentKey, ReactNode>>