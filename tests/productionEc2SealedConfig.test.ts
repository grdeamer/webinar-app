import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync, privateDecrypt, createDecipheriv, constants } from 'node:crypto'
import { sealEc2Configuration } from '../lib/production/ec2SealedConfig.ts'
test('production configuration is sealed for the pinned recipient, never returned in plaintext', () => {
  const pair = generateKeyPairSync('rsa', { modulusLength: 3072 }), pub = pair.publicKey.export({ type: 'spki', format: 'pem' }).toString()
  const values = { LIVEKIT_URL: 'wss://test.livekit.cloud', LIVEKIT_API_KEY: 'fixture-api-key', LIVEKIT_API_SECRET: 'fixture-api-secret', PRODUCER_ENGINE_SECRET: 'a'.repeat(64) }
  const result = sealEc2Configuration(pub, values, 2000, 1000)
  assert.ok(!JSON.stringify(result).includes('fixture-api-secret'))
  const key = privateDecrypt({ key: pair.privateKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, Buffer.from(result.wrappedKey, 'base64'))
  const c = createDecipheriv('aes-256-gcm', key, Buffer.from(result.iv, 'base64')); c.setAuthTag(Buffer.from(result.tag, 'base64'))
  assert.deepEqual(JSON.parse(Buffer.concat([c.update(Buffer.from(result.ciphertext, 'base64')), c.final()]).toString()), values)
  assert.throws(() => sealEc2Configuration(pub, values, 1000, 1000), /expired/)
  assert.throws(() => sealEc2Configuration(pub, { ...values, UNEXPECTED: 'no' }, 2000, 1000), /incomplete/)
})
