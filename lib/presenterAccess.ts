import { createHmac, timingSafeEqual } from "node:crypto"
import { supabaseAdmin } from "@/lib/supabase/admin"

const PRESENTER_LINK_TTL_MS = 30 * 24 * 60 * 60 * 1000

export type PresenterAccessSource = "registrant" | "attendee"

export type PresenterAccessPayload = {
  version: 1
  eventId: string
  sessionId: string
  presenterId: string
  source: PresenterAccessSource
  email: string
  name: string
  issuedAt: number
  expiresAt: number
}

function presenterSecret(): string {
  const value = String(
    process.env.PRESENTER_ACCESS_SECRET || process.env.JWT_SECRET || ""
  ).trim()

  if (!value) {
    throw new Error("PRESENTER_ACCESS_SECRET or JWT_SECRET is not configured")
  }

  return value
}

function sign(encodedPayload: string): string {
  return createHmac("sha256", presenterSecret())
    .update(`jupiter-presenter-access:v1:${encodedPayload}`)
    .digest("base64url")
}

function signaturesMatch(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  )
}

export function createPresenterAccessToken(
  input: Omit<PresenterAccessPayload, "version" | "issuedAt" | "expiresAt">
): string {
  const payload: PresenterAccessPayload = {
    version: 1,
    ...input,
    issuedAt: Date.now(),
    expiresAt: Date.now() + PRESENTER_LINK_TTL_MS,
  }
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url")
  return `${encoded}.${sign(encoded)}`
}

export function verifyPresenterAccessToken(
  token: string | null | undefined
): PresenterAccessPayload | null {
  if (!token || token.length > 4096) return null
  const separator = token.lastIndexOf(".")
  if (separator <= 0) return null

  const encoded = token.slice(0, separator)
  const signature = token.slice(separator + 1)
  if (!signaturesMatch(signature, sign(encoded))) return null

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as Partial<PresenterAccessPayload>

    if (
      payload.version !== 1 ||
      typeof payload.eventId !== "string" ||
      typeof payload.sessionId !== "string" ||
      typeof payload.presenterId !== "string" ||
      (payload.source !== "registrant" && payload.source !== "attendee") ||
      typeof payload.email !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.issuedAt !== "number" ||
      typeof payload.expiresAt !== "number" ||
      Date.now() >= payload.expiresAt
    ) {
      return null
    }

    return payload as PresenterAccessPayload
  } catch {
    return null
  }
}

export async function presenterAssignmentIsActive(
  payload: PresenterAccessPayload
): Promise<boolean> {
  if (payload.source === "registrant") {
    const [{ data: presenter }, { data: assignment }] = await Promise.all([
      supabaseAdmin
        .from("event_registrants")
        .select("id")
        .eq("id", payload.presenterId)
        .eq("event_id", payload.eventId)
        .ilike("tag", "%presenter%")
        .maybeSingle(),
      supabaseAdmin
        .from("event_registrant_sessions")
        .select("session_id")
        .eq("event_id", payload.eventId)
        .eq("registrant_id", payload.presenterId)
        .eq("session_id", payload.sessionId)
        .maybeSingle(),
    ])

    return Boolean(presenter && assignment)
  }

  const { data: attendee } = await supabaseAdmin
    .from("event_attendees")
    .select("user_id")
    .eq("event_id", payload.eventId)
    .eq("user_id", payload.presenterId)
    .eq("session_id", payload.sessionId)
    .eq("is_presenter", true)
    .maybeSingle()

  return Boolean(attendee)
}
