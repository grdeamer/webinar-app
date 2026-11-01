import test from 'node:test'
import assert from 'node:assert/strict'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { LocalHaRuntime } from '../lib/production/localHaRuntime.ts'
import { LocalProducerRehearsal } from '../lib/production/localProducerRehearsal.ts'

function runtime() {
  return { rehearsal: true, running: false, stop: async () => {} } as unknown as LocalHaRuntime
}

test('loopback rehearsal admits only the configured secure self-hosted media origin', async () => {
  const producer = new LocalProducerRehearsal(runtime(), { mediaUrl: 'wss://producer-rtc-test.jupiter.events' })
  let headers: Record<string, string> = {}
  const request = { url: '/', method: 'GET', socket: { localAddress: '127.0.0.1' }, headers: { host: '127.0.0.1:4311' } } as unknown as IncomingMessage
  const response = { writeHead: (_status: number, value: Record<string, string>) => { headers = value }, end: () => {} } as unknown as ServerResponse
  try {
    assert.equal(await producer.handle(request, response), true)
    assert.match(headers['Content-Security-Policy'], /connect-src 'self' wss:\/\/producer-rtc-test\.jupiter\.events https:\/\/producer-rtc-test\.jupiter\.events;/)
    assert.doesNotMatch(headers['Content-Security-Policy'], /livekit\.cloud|\*/)
    assert.match(headers['Content-Security-Policy'], /object-src 'none'/)
  } finally { await producer.stop() }
})

test('self-hosted media configuration rejects plaintext and credential-bearing origins', () => {
  for (const mediaUrl of ['ws://producer-rtc-test.jupiter.events', 'wss://user:secret@producer-rtc-test.jupiter.events']) {
    assert.throws(() => new LocalProducerRehearsal(runtime(), { mediaUrl }), /Secure SFU origin required/)
  }
})
