import { createCipheriv, publicEncrypt, randomBytes, createPublicKey, constants } from 'node:crypto'
/** Only the pinned EC2 recipient can open this payload; no plaintext secrets in browser output. */
export function sealEc2Configuration(publicKey: string, values: Record<string, string>, allowedUntil: number, now = Date.now()) {
  if (!Number.isSafeInteger(allowedUntil) || now >= allowedUntil || allowedUntil > now + 30 * 60_000) throw new Error('EC2 bootstrap authorization expired')
  const key = createPublicKey(publicKey)
  if (key.asymmetricKeyType !== 'rsa' || (key.asymmetricKeyDetails?.modulusLength ?? 0) < 3072) throw new Error('Pinned EC2 encryption key must be RSA3072 or stronger')
  const expected = ['LIVEKIT_URL', 'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET', 'PRODUCER_ENGINE_SECRET']
  if (Object.keys(values).length !== expected.length || expected.some(k => typeof values[k] !== 'string' || !values[k] || /[\r\n\0]/.test(values[k])) || values.PRODUCER_ENGINE_SECRET.length < 32 || !values.LIVEKIT_URL.startsWith('wss://')) throw new Error('EC2 configuration incomplete')
  const aes = randomBytes(32), iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', aes, iv)
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(values), 'utf8'), cipher.final()])
  const wrappedKey = publicEncrypt({ key, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, aes)
  aes.fill(0)
  return { version: 1, wrappedKey: wrappedKey.toString('base64'), iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), ciphertext: ciphertext.toString('base64') }
}
