# Program audio playback

Audience players use `ProgramAudioRenderer` with automatic LiveKit subscriptions
disabled. The renderer subscribes to and mounts only audio selected from committed
Program state. Preview state and browser-local Program messages do not open mics.

- Camera blocks select their assigned participant's microphone.
- Screen blocks select screen-share audio, independently of microphones.
- Hidden/transparent blocks, unknown audio sources, missing state, and Off Air
  select no audio. Legacy session layouts select their Program speakers.
- Producers retain backstage monitoring through their existing room renderer.
- This does not add audio playback for uploaded video files.

## Publisher transport permissions

Every Jupiter browser publishing entry point uses `ProtectedLiveKitRoom`. It
sets LiveKit's track permissions to deny before connecting or publishing. The
server policy endpoint validates a signed publisher token, its event/session
room, and the SFU's current publish permission. It reads committed Program state
and returns explicit track SIDs for viewers. Other authorized publishers retain
private backstage monitoring. Viewer role metadata is never trusted for this.

Unknown viewers and newly published tracks start denied. Reconnects clear the
allowlist. Policies refresh every 1.5 seconds, with a local five-second watchdog
that closes access on a failed or hung policy request. This watchdog runs in the
publisher's JavaScript process; it is not an SFU-enforced expiring permission.
Timing depends on the publisher's scheduler and network. This is not
sample-accurate switching or a central server audio mixer.

The policy endpoint uses a renewable, read-only, 60-second capability after the
initial signed LiveKit join token, rechecking the connected publisher on each
request. It grants no join/publish/mutation rights and requires a new connection
after 24 hours. This avoids interrupting a long session when the original join
token expires.

## Rollout and verification

New audience joins fail closed if an older, unprotected publisher is connected.
The legacy guest join URL shares the audience handler. When deploying, end the
old room connections and reconnect every publisher and viewer with the updated
app. Existing connections and already-issued tokens are not retroactively
revoked by deploying source code. External publishers must implement the same
permissions before being admitted to a room with audience subscribers.

Automated tests cover default deny, selection, authorization, renewal, stale
responses, watchdog expiry, and legacy publisher detection. A synthetic test
against a temporary local LiveKit 1.13.10 SFU verified actual received PCM:
backstage manual subscription denied, Program delivered, TAKE stops old audio,
and Off Air stops audience audio while preserving private monitoring.

The production cloud and real-device listening test remain before release.
To reproduce the transport test with a dedicated test server:

```sh
npm install --prefix /tmp/jupiter-rtc-test --save-exact @livekit/rtc-node@1.1.0
JUPITER_RTC_SDK_DIR=/tmp/jupiter-rtc-test \
JUPITER_TRANSPORT_ENV_FILE=/path/to/private-test-server.env \
node scripts/verify-publisher-transport-native.mjs
```

The private environment file needs `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and
`LIVEKIT_API_SECRET`. The script creates/removes only a randomly named test room
and uses generated tones, without capture, recording, or a real event.
