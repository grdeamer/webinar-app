import test from 'node:test'
import assert from 'node:assert/strict'
import {BLOCKED_LOCAL_MEDIA_REQUEST as denied} from '../lib/production/localRequestPolicy.ts'
test('local media permits exact loopback HTTP polling without routing and denies other destinations',()=>{
 for(const url of ['http://127.0.0.1:4311/api/state','http://127.0.0.1/vendor/livekit.js','https://127.0.0.1:7980/'])assert.equal(denied.test(url),false,url)
 for(const url of ['https://example.com/','http://127.0.0.1.example.com/','http://127.0.0.1@evil.test/','http://127.0.0.2/','http://localhost:4311/','file:///tmp/a'])assert.equal(denied.test(url),true,url)
})
