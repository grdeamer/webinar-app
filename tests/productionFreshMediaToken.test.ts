import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { AccessToken } from 'livekit-server-sdk'
import { freshMediaToken } from '../lib/production/freshMediaToken.ts'

test('replacement publisher token has current not-before, identical grants/expiry and valid signature', async () => {
  const secret = 'test-only-media-secret-not-a-real-key'
  const sdk = new AccessToken('test-key', secret, { identity: 'source-camera-a', ttl: 120 })
  sdk.addGrant({ roomJoin: true, room: 'private-input-test', canPublish: true, canSubscribe: false, canPublishData: false })
  const original = await sdk.toJwt(), now = Date.now()
  const token = freshMediaToken(original, secret, now)
  const [header, body, signature] = token.split('.')
  const before = JSON.parse(Buffer.from(original.split('.')[1], 'base64url').toString())
  const after = JSON.parse(Buffer.from(body, 'base64url').toString())
  assert.equal(after.nbf, Math.floor(now / 1000))
  assert.deepEqual({ ...after, nbf: before.nbf }, before)
  assert.equal(signature, createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url'))
  assert.throws(() => freshMediaToken(original, secret, (before.exp + 1) * 1000), /expired/)
})
