// Opt-in synthetic-media test. Install @livekit/rtc-node@1.1.0 in a temporary
// directory and point JUPITER_RTC_SDK_DIR there. Uses no capture or recording.
import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { randomUUID } from "node:crypto"
import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"
import { AccessToken, RoomServiceClient } from "livekit-server-sdk"
import ts from "typescript"

process.loadEnvFile(process.env.JUPITER_TRANSPORT_ENV_FILE || ".env.local")
const requireSdk = createRequire(`${process.env.JUPITER_RTC_SDK_DIR}/package.json`)
const rtc = requireSdk("@livekit/rtc-node")
const ffi = requireSdk("@livekit/rtc-ffi-bindings")
function load(path, dependencies = {}) {
  const exports = {}
  const compiled = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  runInNewContext(compiled, { exports, require: name => { assert.ok(Object.hasOwn(dependencies, name)); return dependencies[name] } })
  return exports
}
const audio = load("lib/live/programAudio.ts")
const { publisherTrackPermissions } = load("lib/live/publisherPolicy.ts", { "./programAudio": audio })
const service = new RoomServiceClient(process.env.LIVEKIT_URL, process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET)
const roomName = `jupiter-acl-check-${randomUUID()}`
const rooms = new Map()
const sources = []
const tracks = []
const timers = []
const readers = []
const lastTone = new Map()
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
async function until(predicate) {
  const deadline = Date.now() + 12000
  while (!predicate()) { if (Date.now() > deadline) throw new Error("Timed out waiting for subscription state"); await wait(100) }
}
function permissions(room, allowed) {
  const request = new ffi.FfiRequest({ message: { case: "setTrackSubscriptionPermissions", value: {
    localParticipantHandle: room.localParticipant.ffi_handle.handle,
    allParticipantsAllowed: false, permissions: allowed,
  } } })
  ffi.livekitFfiRequest(request.toBinary())
}
function publications(room, identity) { return [...(room.remoteParticipants.get(identity)?.trackPublications.values() ?? [])] }
function subscribed(room, identity) { return publications(room, identity).some(publication => Boolean(publication.track)) }
function check(value, message) { assert.ok(value, message); console.log(`PASS ${message}`) }
let created = false
try {
  await service.createRoom({ name: roomName, emptyTimeout: 30, maxParticipants: 5 })
  created = true
  for (const identity of ["speaker-a", "speaker-b", "viewer", "operator"]) {
    const token = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, { identity, ttl: "5m" })
    token.addGrant({ roomJoin: true, room: roomName, canPublish: identity !== "viewer", canSubscribe: true, canPublishData: false })
    const room = new rtc.Room()
    rooms.set(identity, room)
    if (identity === "viewer" || identity === "operator") {
      room.on(rtc.RoomEvent.TrackSubscribed, (track, _publication, participant) => {
        const reader = new rtc.AudioStream(track, { sampleRate: 48000, numChannels: 1 }).getReader()
        readers.push(reader)
        void (async () => {
          try {
            while (true) {
              const { value, done } = await reader.read()
              if (done) break
              if (value.data.some(sample => Math.abs(sample) > 100)) lastTone.set(`${identity}:${participant.identity}`, Date.now())
            }
          } catch { /* Tracks can disappear during revocation or cleanup. */ }
        })()
      })
    }
    await room.connect(process.env.LIVEKIT_URL, await token.toJwt(), { autoSubscribe: true })
    permissions(room, [])
  }
  const viewer = rooms.get("viewer")
  const operator = rooms.get("operator")
  for (const identity of ["speaker-a", "speaker-b"]) {
    const source = new rtc.AudioSource(48000, 1)
    sources.push(source)
    const track = rtc.LocalAudioTrack.createAudioTrack("synthetic-mic", source)
    tracks.push(track)
    const options = new rtc.TrackPublishOptions()
    options.source = rtc.TrackSource.SOURCE_MICROPHONE
    await rooms.get(identity).localParticipant.publishTrack(track, options)
    const data = Int16Array.from({ length: 480 }, (_, index) => Math.round(Math.sin(index * 2 * Math.PI * 440 / 48000) * 2000))
    timers.push(setInterval(() => void source.captureFrame(new rtc.AudioFrame(data, 48000, 1, 480)).catch(() => {}), 10))
  }
  const attack = () => {
    for (const participant of viewer.remoteParticipants.values()) {
      for (const publication of participant.trackPublications.values()) publication.setSubscribed(true)
    }
  }
  const apply = speaker => {
    for (const identity of ["speaker-a", "speaker-b"]) {
      const room = rooms.get(identity)
      const localTracks = [...room.localParticipant.trackPublications.values()].map(publication => ({ sid: publication.sid, kind: "audio", source: "microphone" }))
      const allowed = publisherTrackPermissions(identity, localTracks, [{ identity: "viewer", canPublish: false }, { identity: "operator", canPublish: true }],
        { is_live: Boolean(speaker), program_blocks: speaker ? [{ type: "camera", assignedParticipantId: speaker }] : [] })
      permissions(room, allowed)
    }
  }
  await until(() => publications(viewer, "speaker-a").length && publications(viewer, "speaker-b").length)
  attack()
  await wait(1500)
  check(!subscribed(viewer, "speaker-a") && !subscribed(viewer, "speaker-b"), "Default deny blocks manual subscriptions before Program opens")
  apply("speaker-a")
  attack()
  await until(() => subscribed(viewer, "speaker-a") && subscribed(operator, "speaker-a") && subscribed(operator, "speaker-b"))
  await wait(1000)
  check(!subscribed(viewer, "speaker-b"), "Viewer cannot manually subscribe to backstage microphone")
  check(subscribed(viewer, "speaker-a"), "Program microphone is delivered")
  check(subscribed(operator, "speaker-b"), "Private backstage monitoring remains available")
  await until(() => lastTone.has("viewer:speaker-a") && lastTone.has("operator:speaker-b"))
  check(!lastTone.has("viewer:speaker-b"), "No backstage audio samples reach the viewer")
  const takeAt = Date.now()
  apply("speaker-b")
  attack()
  await until(() => (lastTone.get("viewer:speaker-b") ?? 0) > takeAt)
  await wait(2000)
  // SDK track objects can remain after SFU permission revocation. Assert on
  // received non-silent PCM instead, allowing a short decoder/jitter tail.
  check((lastTone.get("viewer:speaker-a") ?? 0) < takeAt + 800, "TAKE stops old microphone samples and delivers the new Program microphone")
  const offAirAt = Date.now()
  apply(null)
  attack()
  await wait(2000)
  check((lastTone.get("viewer:speaker-a") ?? 0) < offAirAt + 800 && (lastTone.get("viewer:speaker-b") ?? 0) < offAirAt + 800, "Off Air stops actual audience audio despite manual subscription attempts")
  check(Date.now() - lastTone.get("operator:speaker-a") < 500 && Date.now() - lastTone.get("operator:speaker-b") < 500, "Off Air preserves private audio samples")
  console.log("ALL TRANSPORT CHECKS PASSED")
} finally {
  timers.forEach(clearInterval)
  await Promise.allSettled(readers.map(reader => reader.cancel()))
  await Promise.allSettled([...rooms.values()].map(room => room.disconnect()))
  await Promise.allSettled(tracks.map(track => track.close()))
  await Promise.allSettled(sources.map(source => source.close()))
  if (created) await service.deleteRoom(roomName)
  await rtc.dispose()
}
