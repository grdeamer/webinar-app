export const AGENDA_ICON_OPTIONS = [
  { key: "calendar", label: "Session" },
  { key: "presentation", label: "Presentation" },
  { key: "meeting", label: "Meeting" },
  { key: "keynote", label: "Keynote" },
  { key: "workshop", label: "Workshop" },
  { key: "breakout", label: "Breakout" },
  { key: "lunch", label: "Lunch" },
  { key: "break", label: "Break" },
  { key: "networking", label: "Networking" },
  { key: "qa", label: "Q&A" },
  { key: "video", label: "Video" },
  { key: "training", label: "Training" },
  { key: "award", label: "Awards" },
  { key: "celebration", label: "Celebration" },
] as const

export type AgendaIconKey = (typeof AGENDA_ICON_OPTIONS)[number]["key"]

const agendaIconKeys = new Set<string>(
  AGENDA_ICON_OPTIONS.map((option) => option.key)
)

export function isAgendaIconKey(value: unknown): value is AgendaIconKey {
  return typeof value === "string" && agendaIconKeys.has(value)
}

export function normalizeAgendaIconKey(value: unknown): AgendaIconKey | null {
  if (value == null || value === "") return null
  const normalized = String(value).trim().toLowerCase()
  return isAgendaIconKey(normalized) ? normalized : null
}
