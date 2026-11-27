import { meetingJoinLink } from "./meeting-link.ts"

export const monitorPageSize = 16
export const monitorPageCount = 3
export const monitorRoomLimit = monitorPageSize * monitorPageCount

export type MonitorRoom = { id: string; name: string; meetingNumber: string }

export function monitorMeetingNumber(input: string): string {
  return new URL(meetingJoinLink(input)).pathname.split("/")[2]
}

export function planMonitorRoomImport(input: string, savedMeetingNumbers: readonly string[]) {
  const seen = new Set(savedMeetingNumbers)
  const meetingNumbers: string[] = []
  let duplicates = 0
  for (const [index, line] of input.split(/\r\n|[\r\n]/).entries()) {
    const value = line.trim()
    if (!value) continue

    let meetingNumber: string
    try {
      if (value.length > 2048) throw new Error("Link too long")
      meetingNumber = monitorMeetingNumber(value)
    } catch {
      throw new Error(`Line ${index + 1}: enter a Zoom join link or a 9–11 digit meeting ID.`)
    }
    if (seen.has(meetingNumber)) {
      duplicates++
      continue
    }
    meetingNumbers.push(meetingNumber)
    seen.add(meetingNumber)
  }

  if (meetingNumbers.length === 0) {
    throw new Error(duplicates ? "All of these meetings are already in the room list." : "Paste at least one Zoom link or meeting ID.")
  }
  const available = monitorRoomLimit - savedMeetingNumbers.length
  if (meetingNumbers.length > available) {
    throw new Error(`Only ${available} of the 48 room slots are available. Shorten the list and try again.`)
  }
  return { meetingNumbers, duplicates }
}

export function readMonitorRooms(raw: string): MonitorRoom[] {
  try {
    const value: unknown = JSON.parse(raw)
    if (!Array.isArray(value)) return []
    const rooms: MonitorRoom[] = []
    const ids = new Set<string>()
    const meetings = new Set<string>()
    for (const room of value) {
      if (typeof room?.id !== "string" || !room.id || ids.has(room.id) ||
          typeof room.name !== "string" || !room.name.trim() ||
          typeof room.meetingNumber !== "string" || !/^\d{9,11}$/.test(room.meetingNumber) ||
          meetings.has(room.meetingNumber)) continue
      rooms.push({ id: room.id, name: room.name.slice(0, 100), meetingNumber: room.meetingNumber })
      ids.add(room.id)
      meetings.add(room.meetingNumber)
      if (rooms.length === monitorRoomLimit) break
    }
    return rooms
  } catch {
    return []
  }
}
