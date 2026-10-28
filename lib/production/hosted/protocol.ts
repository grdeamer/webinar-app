import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto'

export type EngineScope = { eventId: string; sessionId: string; actorId: string }
export type EngineRequest = { scope: EngineScope; path: string; method: 'GET' | 'POST'; body: string; inputCapability?: string }
const paths = new Set(['/api/producer/status', '/api/producer/viewer', '/api/producer/input', '/api/producer/command', '/api/ha/action'])
export function validateEngineRequest(value: EngineRequest) {
  const id = /^[a-zA-Z0-9_-]{1,128}$/
  if (!value || !value.scope || Object.values(value.scope).length !== 3 || !['eventId', 'sessionId', 'actorId'].every(k => id.test(value.scope[k as keyof EngineScope]))) throw new Error('Invalid engine scope')
  if (!paths.has(value.path) || value.method !== (value.path.endsWith('/status') ? 'GET' : 'POST') || typeof value.body !== 'string' || Buffer.byteLength(value.body) > 80_000) throw new Error('Invalid engine operation')
  if (value.inputCapability !== undefined && !/^[a-f0-9]{64}$/.test(value.inputCapability)) throw new Error('Invalid input capability')
  if (value.method === 'POST') {
    const body = JSON.parse(value.body)
    if (value.path === '/api/ha/action' && !['stop', 'freeze-primary', 'heal-primary', 'crash-primary', 'restart-primary', 'promote-primary', 'promote-standby'].includes(body.action)) throw new Error('Unsupported rehearsal action')
  }
  return value
}
function digest(secret: string, timestamp: string, nonce: string, body: string) {
  if (Buffer.byteLength(secret) < 32) throw new Error('Engine signing key missing')
  return createHmac('sha256', secret).update(`${timestamp}\n${nonce}\n${createHash('sha256').update(body).digest('hex')}`).digest('hex')
}
export function signEngineRequest(secret: string, body: string, now = Date.now()) {
  const timestamp = String(now), nonce = randomUUID()
  return { 'x-engine-time': timestamp, 'x-engine-nonce': nonce, 'x-engine-signature': digest(secret, timestamp, nonce, body) }
}
export class EngineVerifier {
  private seen = new Map<string, number>()
  verify(secret: string, body: string, headers: Headers, now = Date.now()) {
    const timestamp = headers.get('x-engine-time') || '', nonce = headers.get('x-engine-nonce') || '', signature = headers.get('x-engine-signature') || ''
    if (!/^\d{13}$/.test(timestamp) || Math.abs(now - Number(timestamp)) > 30_000 || !/^[a-f0-9-]{36}$/.test(nonce) || !/^[a-f0-9]{64}$/.test(signature)) throw new Error('Engine authentication denied')
    const expected = digest(secret, timestamp, nonce, body)
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new Error('Engine authentication denied')
    for (const [key, expiry] of this.seen) if (expiry < now) this.seen.delete(key)
    if (this.seen.has(nonce) || this.seen.size >= 4096) throw new Error('Engine replay denied')
    this.seen.set(nonce, now + 60_000)
  }
}
export function engineEndpoint(raw: string) {
  const url = new URL(raw)
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('Engine endpoint must be an HTTPS origin')
  return new URL('/control', url)
}
