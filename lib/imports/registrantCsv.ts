import Papa from "papaparse"
import type { CsvRow } from "@/lib/types"
import {
  normalizeEmail,
  normalizeNullableString,
  normalizeSessionCode,
  normalizeString,
} from "@/lib/imports/normalize"
import { isValidEmail } from "@/lib/imports/validators"

export type ParsedRegistrantImportRow = {
  rowNumber: number
  eventSlug: string | null
  email: string
  firstName: string | null
  lastName: string | null
  tag: string | null
  notes: string | null
  districtCode: string | null
  districtName: string | null
  districtManager: string | null
  districtMeetingLink: string | null
  sessionCodes: string[]
  errors: string[]
}

export type ParsedRegistrantCsv = {
  headers: string[]
  rows: ParsedRegistrantImportRow[]
}

function getCell(row: CsvRow, key: string) {
  return row[key]
}

function getFirstValue(row: CsvRow, keys: string[]) {
  for (const key of keys) {
    const value = getCell(row, key)
    const s = normalizeString(value)
    if (s) return s
  }
  return ""
}

function getSessionHeaders(headers: string[]) {
  return headers.filter(
    (h) => /^session_code(_\d+)?$/i.test(h) || /^session_code_\d+$/i.test(h)
  )
}

export function parseRegistrantCsv(csvText: string): ParsedRegistrantCsv {
  const parsed = Papa.parse<CsvRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  })

  if (parsed.errors?.length) {
    const first = parsed.errors[0]
    throw new Error(first?.message || "CSV parse error")
  }

  const headers = (parsed.meta.fields || []).map((h) => h.trim())
  const sessionHeaders = getSessionHeaders(headers)
  const districtHeadersPresent = headers.some((header) =>
    [
      "district_code",
      "districtcode",
      "district_name",
      "districtname",
      "district_manager",
      "district_manager_name",
      "districtmanager",
      "district_meeting_link",
      "district_link",
      "districtmeetinglink",
    ].includes(header.toLowerCase())
  )

  const rows: ParsedRegistrantImportRow[] = (parsed.data || []).map((rawRow, idx) => {
    const rowNumber = idx + 2
    const eventSlugRaw = getFirstValue(rawRow, ["event_slug", "event", "eventSlug"])
    const email = normalizeEmail(
      getFirstValue(rawRow, ["email", "Email", "user_email", "userEmail"])
    )
    const firstName = normalizeNullableString(
      getFirstValue(rawRow, ["first_name", "firstName"])
    )
    const lastName = normalizeNullableString(
      getFirstValue(rawRow, ["last_name", "lastName"])
    )
    const tag = normalizeNullableString(getFirstValue(rawRow, ["tag"]))
    const notes = normalizeNullableString(getFirstValue(rawRow, ["notes"]))
    const districtCode = normalizeNullableString(
      getFirstValue(rawRow, ["district_code", "districtCode"])
    )
    const districtName = normalizeNullableString(
      getFirstValue(rawRow, ["district_name", "districtName"])
    )
    const districtManager = normalizeNullableString(
      getFirstValue(rawRow, [
        "district_manager",
        "district_manager_name",
        "districtManager",
      ])
    )
    const districtMeetingLink = normalizeNullableString(
      getFirstValue(rawRow, [
        "district_meeting_link",
        "district_link",
        "districtMeetingLink",
      ])
    )

    const sessionCodes = Array.from(
      new Set(
        [
          ...sessionHeaders.map((header) => normalizeSessionCode(rawRow[header])),
          districtCode ? normalizeSessionCode(districtCode) : "",
        ]
          .filter(Boolean)
      )
    )

    const errors: string[] = []

    if (!email) {
      errors.push("Missing email")
    } else if (!isValidEmail(email)) {
      errors.push("Invalid email")
    }

    if (!eventSlugRaw) {
      errors.push("Missing event_slug")
    }

    if (districtHeadersPresent) {
      if (!districtCode) errors.push("Missing district_code")
      if (!districtName) errors.push("Missing district_name")
      if (!districtManager) errors.push("Missing district_manager")
      if (!districtMeetingLink) {
        errors.push("Missing district_meeting_link")
      } else if (!/^https:\/\//i.test(districtMeetingLink)) {
        errors.push("district_meeting_link must use HTTPS")
      }
    }

    return {
      rowNumber,
      eventSlug: eventSlugRaw || null,
      email,
      firstName,
      lastName,
      tag,
      notes,
      districtCode,
      districtName,
      districtManager,
      districtMeetingLink,
      sessionCodes,
      errors,
    }
  })

  const districtDefinitions = new Map<string, string>()
  for (const row of rows) {
    if (!row.districtCode) continue
    const definition = JSON.stringify([
      row.districtName,
      row.districtManager,
      row.districtMeetingLink,
    ])
    const key = `${row.eventSlug || ""}::${normalizeSessionCode(row.districtCode)}`
    const existing = districtDefinitions.get(key)
    if (existing && existing !== definition) {
      row.errors.push(
        "District code has conflicting name, manager, or meeting link in this file"
      )
    } else {
      districtDefinitions.set(key, definition)
    }
  }

  return { headers, rows }
}
