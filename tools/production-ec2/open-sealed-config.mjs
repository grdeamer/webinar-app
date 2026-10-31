/** Run as root on the pinned new EC2 node only; ciphertext arrives on stdin. */
import { readFileSync, writeFileSync, renameSync, unlinkSync } from 'node:fs'
import { privateDecrypt, createDecipheriv, constants } from 'node:crypto'
const directory = '/etc/jupiter-producer', envelope = JSON.parse(readFileSync(0, 'utf8'))
if (envelope.version !== 1) throw new Error('Unsupported sealed configuration')
const key = privateDecrypt({ key: readFileSync(directory + '/bootstrap-key.pem'), padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, Buffer.from(envelope.wrappedKey, 'base64'))
const cipher = createDecipheriv('aes-256-gcm', key, Buffer.from(envelope.iv, 'base64')); cipher.setAuthTag(Buffer.from(envelope.tag, 'base64'))
const plaintext = Buffer.concat([cipher.update(Buffer.from(envelope.ciphertext, 'base64')), cipher.final()]), values = JSON.parse(plaintext.toString())
const expected = ['LIVEKIT_URL', 'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET', 'PRODUCER_ENGINE_SECRET']
if (Object.keys(values).length !== 4 || expected.some(k => typeof values[k] !== 'string' || !values[k] || /[\r\n\0]/.test(values[k]))) throw new Error('Unexpected configuration')
const scope = JSON.parse(readFileSync(directory + '/scope.json', 'utf8'))
if (!['eventId', 'sessionId'].every(k => /^[a-zA-Z0-9_-]{1,128}$/.test(scope[k]))) throw new Error('Invalid installed scope')
const result = { ...values, PRODUCER_ENGINE_EVENT_ID: scope.eventId, PRODUCER_ENGINE_SESSION_ID: scope.sessionId }
writeFileSync(directory + '/engine.env.tmp', Object.entries(result).map(([k,v]) => `${k}=${JSON.stringify(v)}`).join('\n') + '\n', { mode: 0o600 })
renameSync(directory + '/engine.env.tmp', directory + '/engine.env'); plaintext.fill(0); key.fill(0)
unlinkSync(directory + '/bootstrap-key.pem')
console.log('Private EC2 configuration installed; one-time decryption key removed')
