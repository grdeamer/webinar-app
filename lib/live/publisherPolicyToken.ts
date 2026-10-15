import jwt from "jsonwebtoken"

export type PublisherPolicyIdentity = {
  eventId: string
  sessionId: string | null
  room: string
  identity: string
  startedAt: number
}

function secret() {
  const value = process.env.JWT_SECRET
  if (!value || value.length < 32) throw new Error("Publisher policy signing is not configured")
  return value
}

// A renewable, read-only capability avoids depending on the original LiveKit
// join JWT after its expiry. It grants no room join, publish, or mutation rights.
export function createPublisherPolicyToken(identity: PublisherPolicyIdentity) {
  return jwt.sign(identity, secret(), { algorithm: "HS256", audience: "publisher-policy", issuer: "jupiter", expiresIn: 60 })
}

export function verifyPublisherPolicyToken(token: string): PublisherPolicyIdentity | null {
  try {
    const claims = jwt.verify(token, secret(), { algorithms: ["HS256"], audience: "publisher-policy", issuer: "jupiter" })
    if (typeof claims === "string" || typeof claims.eventId !== "string" || typeof claims.room !== "string" ||
      typeof claims.identity !== "string" || (claims.sessionId !== null && typeof claims.sessionId !== "string") ||
      !Number.isFinite(claims.startedAt) || claims.startedAt > Date.now() || Date.now() - claims.startedAt > 86400000) return null
    return { eventId: claims.eventId, room: claims.room, identity: claims.identity,
      sessionId: claims.sessionId, startedAt: claims.startedAt }
  } catch { return null }
}
