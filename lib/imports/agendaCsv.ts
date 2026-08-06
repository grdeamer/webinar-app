import Papa from "papaparse"
import type { CsvRow } from "@/lib/types"
import {
  AGENDA_ICON_OPTIONS,
  isAgendaIconKey,
  type AgendaIconKey,
} from "@/lib/agendaIcons"

export const AGENDA_CSV_HEADERS = [
  "title",
  "start_at",
  "end_at",
  "speaker",
  "speaker_title",
  "speaker_bio",
  "speaker_photo_url",
  "track",
  "location",
  "status",
  "icon_key",
  "button_text",
  "button_url",
  "is_visible",
  "sort_index",
  "description",
] as const

export type AgendaCsvPayload = {
  title: string
  start_at: string | null
  end_at: string | null
  speaker: string | null
  speaker_title: string | null
  speaker_bio: string | null
  speaker_photo_url: string | null
  track: string | null
  location: string | null
  status: "upcoming" | "live" | "complete" | "cancelled"
  icon_key: AgendaIconKey | null
  button_text: string | null
  button_url: string | null
  is_visible: boolean
  sort_index: number
  description: string | null
}

export type ParsedAgendaCsvRow = {
  rowNumber: number
  payload: AgendaCsvPayload
  errors: string[]
}

export type ParsedAgendaCsv = {
  headers: string[]
  rows: ParsedAgendaCsvRow[]
}

const agendaStatuses = new Set(["upcoming", "live", "complete", "cancelled"])

function stringValue(row: CsvRow, key: string) {
  const value = row[key]
  return value == null ? "" : String(value).trim()
}

function nullableValue(row: CsvRow, key: string) {
  return stringValue(row, key) || null
}

function dateValue(value: string, label: string, errors: string[]) {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    errors.push(`${label} must be a valid date/time`)
    return null
  }
  return parsed.toISOString()
}

function booleanValue(value: string, errors: string[]) {
  if (!value) return true
  const normalized = value.toLowerCase()
  if (["true", "yes", "1"].includes(normalized)) return true
  if (["false", "no", "0"].includes(normalized)) return false
  errors.push("is_visible must be true/false, yes/no, or 1/0")
  return true
}

export function createAgendaSampleCsv() {
  return Papa.unparse({
    fields: [...AGENDA_CSV_HEADERS],
    data: [
      [
        "Opening Keynote",
        "2026-09-24T09:00:00-04:00",
        "2026-09-24T10:00:00-04:00",
        "Dr. Jane Smith",
        "Chief Medical Officer",
        "Opening keynote speaker and program host.",
        "https://example.com/speakers/jane-smith.webp",
        "General Session",
        "Main Stage",
        "upcoming",
        "keynote",
        "Enter Session",
        "https://example.com/live",
        "true",
        "0",
        "Welcome and opening remarks.",
      ],
      [
        "Lunch",
        "2026-09-24T12:00:00-04:00",
        "2026-09-24T13:00:00-04:00",
        "",
        "",
        "",
        "",
        "Hospitality",
        "Dining Room",
        "upcoming",
        "lunch",
        "",
        "",
        "true",
        "1",
        "Lunch break.",
      ],
    ],
  })
}

export function parseAgendaCsv(csvText: string): ParsedAgendaCsv {
  const parsed = Papa.parse<CsvRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().toLowerCase(),
  })

  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors[0]?.message || "CSV parse error")
  }

  const headers = parsed.meta.fields || []
  if (!headers.includes("title")) {
    throw new Error("CSV must include a title column")
  }

  const rows = parsed.data.map((row, index): ParsedAgendaCsvRow => {
    const rowNumber = index + 2
    const errors: string[] = []
    const title = stringValue(row, "title")
    const statusValue = stringValue(row, "status").toLowerCase() || "upcoming"
    const iconValue = stringValue(row, "icon_key").toLowerCase()
    const sortIndexValue = stringValue(row, "sort_index")
    const sortIndex = sortIndexValue ? Number(sortIndexValue) : index

    if (!title) errors.push("title is required")
    if (!agendaStatuses.has(statusValue)) {
      errors.push("status must be upcoming, live, complete, or cancelled")
    }
    if (iconValue && !isAgendaIconKey(iconValue)) {
      errors.push(
        `icon_key must be one of: ${AGENDA_ICON_OPTIONS.map((option) => option.key).join(", ")}`
      )
    }
    if (!Number.isFinite(sortIndex)) {
      errors.push("sort_index must be a number")
    }

    const startAt = dateValue(stringValue(row, "start_at"), "start_at", errors)
    const endAt = dateValue(stringValue(row, "end_at"), "end_at", errors)
    if (startAt && endAt && new Date(endAt).getTime() < new Date(startAt).getTime()) {
      errors.push("end_at must be after start_at")
    }

    return {
      rowNumber,
      errors,
      payload: {
        title,
        start_at: startAt,
        end_at: endAt,
        speaker: nullableValue(row, "speaker"),
        speaker_title: nullableValue(row, "speaker_title"),
        speaker_bio: nullableValue(row, "speaker_bio"),
        speaker_photo_url: nullableValue(row, "speaker_photo_url"),
        track: nullableValue(row, "track"),
        location: nullableValue(row, "location"),
        status: agendaStatuses.has(statusValue)
          ? (statusValue as AgendaCsvPayload["status"])
          : "upcoming",
        icon_key: isAgendaIconKey(iconValue) ? iconValue : null,
        button_text: nullableValue(row, "button_text"),
        button_url: nullableValue(row, "button_url"),
        is_visible: booleanValue(stringValue(row, "is_visible"), errors),
        sort_index: Number.isFinite(sortIndex) ? sortIndex : index,
        description: nullableValue(row, "description"),
      },
    }
  })

  return { headers, rows }
}
