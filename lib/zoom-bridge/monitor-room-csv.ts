import { CsvError, parse } from "csv-parse/browser/esm/sync"
import { meetingJoinLink } from "./meeting-link.ts"
import { monitorRoomLimit } from "./monitor-rooms.ts"

const columns = ["room_name", "zoom_join_link", "meeting_id", "zoom_passcode"] as const

export const monitorRoomCsvTemplate = `${columns.join(",")}\r\n`

function readCsv(input: string) {
  const rows: { record: string[]; line: number }[] = []
  try {
    parse(input, {
      bom: true,
      trim: true,
      skip_empty_lines: true,
      record_delimiter: ["\r\n", "\n", "\r"],
      on_record(record, context) {
        rows.push({ record, line: context.lines })
        return null
      },
    })
  } catch (error) {
    if (error instanceof CsvError && typeof error.lines === "number") {
      if (error.code === "CSV_RECORD_INCONSISTENT_FIELDS_LENGTH") {
        throw new Error(`Use the same number of columns as the header on line ${error.lines}.`)
      }
      throw new Error(`Check CSV formatting near line ${error.lines}. Wrap values that contain commas in double quotes.`)
    }
    throw new Error("Unable to read the CSV file.")
  }
  return rows
}

function readMeeting(value: string, field: "zoom_join_link" | "meeting_id", line: number) {
  try {
    const valid = field === "zoom_join_link" ? /^https:\/\//i.test(value) : /^[\d\s-]+$/.test(value)
    if (!valid || value.length > 2048) throw new Error()
    return new URL(meetingJoinLink(value))
  } catch {
    const expected = field === "zoom_join_link" ? "a Zoom join link" : "a 9–11 digit meeting ID"
    throw new Error(`Enter ${expected} in ${field} near line ${line}.`)
  }
}

export function planMonitorRoomCsv(input: string, savedMeetingNumbers: readonly string[]) {
  const [first, ...rows] = readCsv(input)
  const headers = first?.record.map(value => value.trim().toLowerCase()) ?? []
  const nameColumn = headers.indexOf("room_name")
  const linkColumn = headers.indexOf("zoom_join_link")
  const idColumn = headers.indexOf("meeting_id")
  const passcodeColumn = headers.indexOf("zoom_passcode")
  if (headers.some(value => !columns.some(column => column === value)) || new Set(headers).size !== headers.length ||
      (linkColumn < 0 && idColumn < 0)) {
    throw new Error("Use the template headers with a zoom_join_link or meeting_id column.")
  }

  const seen = new Set(savedMeetingNumbers)
  const rooms: { name: string; meetingNumber: string; access?: { passcode?: string; joinLink?: string } }[] = []
  let duplicates = 0
  for (const { record, line } of rows) {
    const name = record[nameColumn]?.trim() ?? ""
    const link = record[linkColumn]?.trim() ?? ""
    const id = record[idColumn]?.trim() ?? ""
    const passcode = record[passcodeColumn]?.trim() ?? ""
    if (!name && !link && !id && !passcode) continue
    if (name.length > 100) throw new Error(`Use a room name of 100 characters or fewer near line ${line}.`)
    const url = link ? readMeeting(link, "zoom_join_link", line) : undefined
    const fromLink = url?.pathname.split("/")[2]
    const fromId = id ? readMeeting(id, "meeting_id", line).pathname.split("/")[2] : undefined
    if (fromLink && fromId && fromLink !== fromId) {
      throw new Error(`The Zoom link and meeting ID must refer to the same meeting near line ${line}.`)
    }
    const meetingNumber = fromLink || fromId
    if (!meetingNumber) throw new Error(`Enter a Zoom join link or meeting ID near line ${line}.`)
    if (seen.has(meetingNumber)) {
      duplicates++
      continue
    }
    const joinLink = url?.searchParams.get("pwd") ? url.href : undefined
    rooms.push(passcode || joinLink ? {
      name,
      meetingNumber,
      access: {
        ...(passcode ? { passcode } : {}),
        ...(joinLink ? { joinLink } : {}),
      },
    } : { name, meetingNumber })
    seen.add(meetingNumber)
  }

  if (rooms.length === 0) {
    throw new Error(duplicates ? "All of these meetings are already in the room list." : "Add at least one room to the CSV.")
  }
  const available = monitorRoomLimit - savedMeetingNumbers.length
  if (rooms.length > available) {
    throw new Error(`Only ${available} of the ${monitorRoomLimit} room slots are available. Shorten the CSV and try again.`)
  }
  return { rooms, duplicates }
}
