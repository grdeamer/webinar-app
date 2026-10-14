import { createHmac, timingSafeEqual } from "node:crypto"
export type AttendeeIdentity = { email: string; eventId: string | null; slug: string | null; userId?: string; expiresAt: number; version: 2; purpose: "attendee" }
function secret() { const key = process.env.JWT_SECRET; if (!key || key.length < 32) throw new Error("JWT_SECRET must contain at least 32 characters"); return key }
export function digest(value: string) { return createHmac("sha256", secret()).update(`jupiter-registration-v2:${value}`).digest("hex") }
export function createAttendeeToken(input: Omit<AttendeeIdentity, "version" | "purpose" | "expiresAt">) {
  const body = Buffer.from(JSON.stringify({ ...input, email: input.email.trim().toLowerCase(), version: 2, purpose: "attendee", expiresAt: Date.now() + 7 * 86400000 })).toString("base64url")
  return `${body}.${digest(body)}`
}
export function verifyAttendeeToken(token: string | undefined, slug?: string): AttendeeIdentity | null {
  if (!token || token.length > 4096) return null
  try {
    const [body, signature, extra] = token.split("."); if (!body || !signature || extra) return null
    const a = Buffer.from(signature), b = Buffer.from(digest(body)); if (a.length !== b.length || !timingSafeEqual(a, b)) return null
    const p = JSON.parse(Buffer.from(body, "base64url").toString()) as AttendeeIdentity
    if (p.version !== 2 || p.purpose !== "attendee" || typeof p.email !== "string" || !Number.isFinite(p.expiresAt) || p.expiresAt <= Date.now() || (slug && p.slug && p.slug !== slug)) return null
    return p
  } catch { return null }
}
