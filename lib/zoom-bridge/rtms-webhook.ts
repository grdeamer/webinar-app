import { createHmac, timingSafeEqual } from "node:crypto"

export function verifiedRtmsEvent(raw: string, timestamp: string | null, signature: string | null, secret: string, now = Date.now()) {
  if (!secret || !timestamp || !/^\d+$/.test(timestamp) || Math.abs(now / 1000 - Number(timestamp)) > 300 || !signature) throw new Error("Invalid webhook")
  const expected = `v0=${createHmac("sha256", secret).update(`v0:${timestamp}:${raw}`).digest("hex")}`
  const supplied = Buffer.from(signature), correct = Buffer.from(expected)
  if (supplied.length !== correct.length || !timingSafeEqual(supplied, correct)) throw new Error("Invalid webhook")
  return JSON.parse(raw) as { event?: string; payload?: { plainToken?: string } }
}

export function rtmsChallenge(plainToken: string, secret: string) {
  if (plainToken.length > 1024) throw new Error("Invalid challenge")
  return { plainToken, encryptedToken: createHmac("sha256", secret).update(plainToken).digest("hex") }
}
