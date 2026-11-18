# One-meeting RTMS receiver qualification

This receiver replaces browser-based Zoom joining with authorized RTMS media.
It receives one active-speaker JPEG stream (720p, 2 fps) and one presentation
JPEG stream (720p, 1 fps), using protocol V2 on separate TLS WebSockets.
No audio, transcription, chat, camera capture, recording, disk media, or public
receiver port. Additional participant thumbnails are not part of qualification;
they require Zoom's request-only multi-video feature.

## Data flow

Zoom's signed lifecycle event -> `/api/zoom/rtms` -> pinned forced-command SSH ->
private Unix socket -> RTMS signaling + video/share sockets. Admin-only frame
requests return the latest JPEGs to the first meeting tile. Zoom tokens and
client secrets never reach the browser. The OAuth callback completes app
installation without retaining user access/refresh tokens; qualification uses
host-approved start/auto-start, not the RTMS REST start API.

Only a meeting number explicitly armed by an IO admin is accepted. A different
session cannot replace an active receiver. Repeat events and repeat arm requests
do not extend time or start another media connection. Stop, host interruption,
revocation, paused lifecycle states, or failure clear frames and close sockets.
The receiver sends a STREAM_CLOSE_REQ on shutdown when signaling is available.
No automatic reconnect/retry. A fresh qualification must be explicitly armed.

Limits: 15 minutes from arm, 30-second viewer lease, latest frames expire after
5 seconds, 500 KB per JPEG, 250 MB inbound protocol data per qualification,
one meeting/two media connections, 256 MB systemd memory limit. These are test
bounds, not a guarantee of a Zoom invoice or a production throughput claim.

## Zoom setup

- Free Developer Pack trial activated by the user on November 18, 2026:
  20 credits, $0 charged. No paid plan purchased.
- User-managed General App: Jupiter IO Monitor, development only.
- Only meeting:read:meeting_video, meeting:read:meeting_screenshare,
  rtms:read:rtms_started, rtms:read:rtms_stopped, rtms:read:rtms_interrupted.
- Product: Meetings. No SDK, recording, audio, transcript, chat, or REST-control scope.
- Redirect and strict allowlist:
  https://app.jupiter.events/api/admin/zoom-bridge/rtms-connect/callback
- Lifecycle subscription endpoint: https://app.jupiter.events/api/zoom/rtms
- Host permission to share realtime content and app authorization are required.
  App/account auto-start settings must be deliberately selected for the test;
  do not enable broad account auto-start as part of installation.

Use a meeting hosted by the app's account for initial qualification. A pasted
link does not grant access. External-account installation/distribution may need
Zoom review/beta approval and the hosting account's permission. RTMS depends
on an authorized app user/host context; this receiver does not bypass that by
joining as a participant or impersonating a user.

## Deployment

Encrypted Vercel production environment variables:
ZOOM_RTMS_CLIENT_ID, ZOOM_RTMS_CLIENT_SECRET, ZOOM_RTMS_WEBHOOK_SECRET.
Non-secret ZOOM_RTMS_APP_ORIGIN=https://app.jupiter.events.
Keep JUPITER_IO_RTMS_ENABLED=false until receiver installation is verified.
Existing JUPITER_IO_SNAPSHOT_HOST / KEY / HOST_HASH supply the pinned SSH channel.
The old JUPITER_IO_SERVER_MONITOR_ENABLED remains false.

On the existing Ubuntu host (Python 3.11+), provision the three Zoom variables
privately into `/home/ubuntu/jupiter-rtms-monitor/.env`, mode 0600. Never pass
secrets in command arguments, Git, logs, or a public download. Transfer this
folder and run `sudo bash install.sh --install`. Installation starts only an
idle private-socket daemon, not a meeting. The installer preserves existing
forced-command dispatch and stores its prior source backup before patching.

Starting the existing paid compute host needs a separately bounded allowance
and its independently verified automatic shutdown. The Zoom trial does not
pay for EC2. Do not start cloud compute under an expired test authorization.

## Qualification steps

1. Verify the trial and app installation in Zoom; validate the webhook after
   deployment and secret provisioning. Verify its signature rejection behavior.
2. Install/verify the idle receiver, its private socket, and pinned SSH gateway.
3. Set the new receiver flag true and deploy. The old web-join flag stays false.
4. Add one test meeting to the first tile and click Test server return *before*
   starting host-approved RTMS in that meeting. Only the current arm is accepted.
5. Have the host share a recognizable presentation and turn on participant video.
   Verify both changing images in the IO tile; no fake data counts as live proof.
6. Stop the test; verify STREAM_CLOSE_REQ/socket closure, empty frame buffers,
   and then stop the receiver compute. Confirm Zoom credit usage remains trial-only.

## Checks completed

Eight Python protocol/lifecycle tests use injected fake sockets to verify
handshakes, keepalive, two media feeds, duplicate suppression, mismatched meeting
and viewer rejection, stale frames, fixed deadlines, pause, stop and cleanup.
TypeScript webhook tests verify raw-body signature integrity, timestamp expiry,
and challenge response. These checks are not evidence of a live Zoom return.

Official references:
https://developers.zoom.us/docs/rtms/meetings/work-with-streams/
https://developers.zoom.us/docs/rtms/event-reference/universal-events/
https://developers.zoom.us/docs/api/rtms/events/
https://developers.zoom.us/docs/rtms/meetings/video-multiple-streams/
