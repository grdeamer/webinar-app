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

    const sessionCodes = Array.from(
      new Set(
        sessionHeaders
          .map((header) => normalizeSessionCode(rawRow[header]))
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

    return {
      rowNumber,
      eventSlug: eventSlugRaw || null,
      email,
      firstName,
      lastName,
      tag,
      notes,
      sessionCodes,
      errors,
    }
  })

  return { headers, rows }
}