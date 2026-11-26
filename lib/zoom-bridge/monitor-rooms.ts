import { meetingJoinLink } from "./meeting-link.ts"

export const monitorPageSize = 16
export const monitorPageCount = 3
export const monitorRoomLimit = monitorPageSize * monitorPageCount

export type MonitorRoom = { id: string; name: string; meetingNumber: string }

export function monitorMeetingNumber(input: string): string {
  return new URL(meetingJoinLink(input)).pathname.split("/")[2]
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
