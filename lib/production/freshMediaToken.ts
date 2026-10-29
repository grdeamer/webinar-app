import { createHmac } from 'node:crypto'

/** Stamp a freshly minted SDK token without changing its grants or expiry.
 * SDK 2.15 emits nbf=0, which Cloud rejects after an identity was revoked.
 * Call only with a token just minted locally, never with a caller's JWT.
 */
export function freshMediaToken(jwt: string, secret: string, nowMs = Date.now()) {
  const [header, payload, signature] = jwt.split('.')
  if (!header || !payload || !signature || JSON.parse(Buffer.from(header, 'base64url').toString()).alg !== 'HS256') throw new Error('Expected freshly minted HS256 media token')
  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString())
  const now = Math.floor(nowMs / 1000)
  if (!Number.isSafeInteger(now) || !Number.isFinite(claims.exp) || claims.exp <= now) throw new Error('Media token already expired')
  const body = Buffer.from(JSON.stringify({ ...claims, nbf: now })).toString('base64url')
  const signingInput = `${header}.${body}`
  return `${signingInput}.${createHmac('sha256', secret).update(signingInput).digest('base64url')}`
}
