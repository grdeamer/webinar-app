// lib/qa.ts

export type QAStatus = "pending" | "approved" | "rejected" | "answered"

export type QAMessage = {
  id: string
  room_key: string
  event_id: string | null
  name: string | null
  question: string
  status: QAStatus
  is_featured: boolean
  upvotes: number
  sort_order: number
  created_at: string
  updated_at: string
  featured_at: string | null
  answered_at: string | null
}

export function normalizeRoomKey(input: unknown, fallback = "general") {
  const v = String(input || "").trim()
  return v || fallback
}

export function cleanName(input: unknown) {
  const v = String(input || "").trim()
  if (!v) return null
  return v.slice(0, 100)
}

export function cleanQuestion(input: unknown) {
  return String(input || "").trim().replace(/\s+/g, " ").slice(0, 1000)
}

export function canDisplayToAttendees(status: string) {
  return status === "approved" || status === "answered"
}