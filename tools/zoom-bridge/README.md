# Jupiter Io

Admin screen: `/admin/jupiter-io` (global administrators only).

Satellite profiles support a display name, meeting ID, encrypted passcode, connection state, and independent camera/microphone desired states. The Lightsail controller polls the authenticated agent endpoint every two seconds and reports the SDK's actual media state. Renaming a connected profile calls Zoom's `ChangeUserName`; host restrictions are reported as numeric SDK errors.

## Application configuration

- Run `supabase/zoom-bridge.sql` and `supabase/zoom-bridge-source.sql`. Access is restricted to the server's service role; no attendee policies are needed.
- Set `ZOOM_BRIDGE_ENCRYPTION_KEY` to a stable base64-encoded 32-byte key. Losing or changing it makes saved passcodes unreadable.
- Set `ZOOM_BRIDGE_AGENT_TOKEN` to a random secret shared only with the Lightsail controller. Do not prefix either variable with `NEXT_PUBLIC_`.

## Worker host

The tested SDK is Linux x86_64 7.1.5.4432 on Ubuntu 22.04. SDK files and Zoom credentials are not included in the repository. Install the SDK under `/home/ubuntu/jupiter-zoom/sdk` and ensure `libmeetingsdk.so.1` links to `libmeetingsdk.so`.

Build:

```bash
cd ~/jupiter-zoom
g++ -std=c++17 worker.cpp -I sdk/h -L sdk -Wl,-rpath,/home/ubuntu/jupiter-zoom/sdk -lmeetingsdk $(pkg-config --cflags --libs glib-2.0 cairo) -o bridge-worker
```

Dependencies include build-essential, pkg-config, libglib2.0-dev, libcairo2-dev, PulseAudio, and the SDK's X11/XCB/OpenGL runtime libraries. Start PulseAudio under the same user as the controller.

The private `.env` file on the host contains `ZOOM_CLIENT_ID` and `ZOOM_CLIENT_SECRET`. `controller.json` contains `url` (the Jupiter HTTPS base URL), `token` (the shared agent token), ; the controller supports up to 50 satellites. Both files must have permissions 0600.

Run `python3 controller.py` under the ubuntu user. For a production deployment install the accompanying systemd service, point controller.json at the published Jupiter HTTPS URL, and enable the service. The local review setup uses an SSH reverse tunnel to a local app instance; that tunnel is not the production transport.

## Operating behavior

- New profiles default to disconnected, camera off, microphone muted.
- Connect preserves the explicitly selected desired media settings.
- Live meeting/passcode edits require stopping the worker first.
- Host camera, microphone, and rename permissions still apply. The reported state may differ from the requested state when Zoom denies a command.
- Controller loss stops its workers after 60 seconds; desired profiles reconnect when communication recovers.
- Failed/expired workers wait for a new command before retrying. A worker session is capped at four hours, matching its SDK token lifetime.
- Up to 50 satellite profiles and connections are permitted. This is a software limit, not a guarantee of host capacity; only two simultaneous satellites have been validated on the budget server.
- Configure a Zoom Meeting source above the satellites. The source receiver joins as `Jupiter Io Source`, with camera off and microphone muted. The host must admit it and grant local recording permission for raw media access. No persistent meeting recordings are written.
- Video composes up to nine presenters in Zoom's spotlight list into one program frame (one full frame, two side by side, then a grid). Spotlight changes are polled every 500 ms. With no spotlight, satellites send black video; an inactive presenter camera blanks only that presenter’s tile rather than substituting another participant. Camera-off tiles stay black. Screen-share capture is not implemented.
- Mixed source-meeting audio is relayed; destination meeting audio is never sent back into the source. The app and controller both reject using the source meeting as a destination.
- One shared latest I420 frame lives in a private RAM-backed `/dev/shm` directory. PCM audio is distributed using nonblocking Unix datagram sockets. Frames/blocks older than two seconds are rejected. Each satellite scales and letterboxes video to Zoom's negotiated dimensions, including rotation.
- Saving a source changes existing satellites from countdown mode to relay mode and reconnects them once. While a configured source is disconnected, satellites send black video and no audio. The legacy countdown/tone runs only when no source is configured.
- Source disconnect or lost permissions clears the latest frame. Controller shutdown cleans up the ephemeral media directory. This is a one-host prototype; scaling to multiple satellite hosts requires a network media transport.
- Only two destination satellites plus one source receiver have been validated on the budget server. Benchmark CPU, bandwidth, quality, and delay before running more. Independent Zoom meetings do not guarantee frame-perfect playback synchronization.

## Validation

Use two internally hosted meetings to verify connect/disconnect, camera/mic toggles, master controls, host-imposed mute state, and a live display-name change. Also verify an unauthenticated request to either control endpoint returns 401 and that admin profile responses never return passcodes or SDK credentials.


Source relay validation:

```bash
g++ -std=c++17 relay-test.cpp -o relay-test
./relay-test
```

Live checks: admit the source, grant/revoke local recording permission, spotlight a presenter, verify source video/audio counters advance and satellite `sourceVideo`/`sourceAudio` become true. Change spotlight, turn off presenter video, disconnect/reconnect the source, and verify no stale media replays. Confirm from a destination Zoom client that picture and audio arrive. Transport counters alone cannot prove audible playback or visual quality.


Resolution: receiver requests 720p per spotlighted camera and enables SDK HD before and after joining. This is a request, not a guarantee. Actual input sizes are reported separately from the 1280x720 composition canvas. Satellites report their negotiated frame input size; destination Zoom encoding and playback may be lower still. Zoom host HD settings, account entitlement, sending camera quality, bandwidth, and receiving layout all affect delivered resolution. Two side-by-side cameras each occupy half the program width.

## HDMI / SRT prototype

Use OBS to send the ATEM/Magewell program as MPEG-TS over encrypted SRT. On the controller host, set `sourceType` to `srt` in `controller.json`; configure `srt-settings.json` with `port` (9000) and `passphraseFile` pointing to a private 10–64-character alphanumeric secret. Keep both files 0600. Permit inbound UDP 9000 only from the encoder's public IP when practical. OBS uses Custom service, the caller SRT URL, and a blank Stream Key.

The source connect/disconnect control starts and stops this ingest in SRT mode. No source Zoom SDK participant is launched. FFmpeg decodes to 1280x720 I420 at 15 fps and 32 kHz mono PCM through pipes. Video resides only in the latest RAM-backed relay frame, and audio is distributed over Unix sockets. The receiver restarts its listener after disconnection. A/V sync, WAN reconnection, and end-to-end quality must be validated using a live destination meeting; the synthetic test only proves decoding and transport. This prototype is not a durable hosted service while the controller still depends on the local app/tunnel.

The Jupiter Io control panel persists each satellite's `publish_mode` (`share` or `camera`). New profiles default to screen share; existing profiles keep their prior mode. Disconnect before changing a mode. The controller passes `ZOOM_PUBLISH_MODE` to the worker and restarts a worker if its publisher changes. Picture controls start/stop the selected publisher; audio controls remain independent. The worker reports `publishMode`, `originalSound`, and submitted frame dimensions in `status.ini`. These dimensions do not prove destination playback resolution. The destination must allow sharing. Audio stays on the separate microphone path with `EnableMicOriginalInput(true)` after joining VoIP. The installed Linux SDK exposes original input, but gates separate high fidelity music/stereo settings to Windows. Audio remains 32 kHz mono in this prototype.

Apply `supabase/zoom-bridge-controls.sql` after the base room/source schema. The source's persisted `source_kind` selects HDMI/SRT or legacy Zoom ingest. For HDMI setup, configure `JUPITER_IO_SRT_URL` in the app's private server environment with the same encrypted caller URL used by OBS. The admin source endpoint exposes receiver host/port metadata; the full private URL is returned only to authenticated global administrators on an explicit connection request with no-store headers. The source panel provides copy/reveal controls and OBS setup instructions. Passcodes remain encrypted in storage and are never returned by admin profile reads.


## Satellite detail and live confidence preview

Compact fleet tiles open a large accessible detail dialog with all controls, secure passcode status, submitted resolution, original sound status, and an optional live picture preview. Preview audio is intentionally silent. The confidence monitor updates roughly every two seconds at 640 pixels wide, independently of the full-resolution Zoom send.

Apply `supabase/zoom-bridge-preview.sql` for the subscription expiry metadata. A global administrator opens the preview through an authenticated SSE endpoint; a 45-second lease is renewed while viewing. Each worker copies its successfully submitted picture into a private RAM directory only during this lease. `preview.py` encodes one latest frame through FFmpeg pipes and posts it to the authenticated agent preview API. The server uses private Supabase Realtime **HTTP broadcast**, never database broadcast, Storage, or replay. The server proxies the private channel to the admin's SSE stream without exposing service credentials. There are no client realtime policies or public subscriptions. Streams reconnect and reauthorize every 50 seconds; disconnected viewers expire automatically. Stale or stopped video blanks the preview. This is the frame submitted to Zoom, not a recording or a return feed from the destination meeting.

Install `preview.py` alongside `controller.py`, rebuild the worker, and restart the controller service. Source and destination meeting permissions are unchanged.


## 1080p HDMI profile

HDMI/SRT ingest defaults to a 1920×1080 output canvas at 15 fps. Optional `width`, `height`, and `fps` in private `srt-settings.json` can select 1280×720 at 15 fps as a rollback profile; other profiles are rejected. Custom screen share follows the incoming RAM frame dimensions and begins with a 1080p canvas. Camera capability negotiation and the legacy Zoom source compositor are unchanged.

Set the physical source/capture and OBS Base/Output Resolution to 1920×1080. Initial encoder target: H.264 6 Mbps, 30 fps, 2-second keyframe interval, AAC 160 Kbps/48 kHz. These are starting settings for validation, not a promise of destination quality. FFmpeg samples the stream to 15 fps. Reported decoded resolution is the relay canvas, not proof of native source detail; 720p input would be upscaled. Verify actual receiving Zoom statistics and visible text before claiming 1080p playback. Preserve the capacity of two satellites until a full-duration load test is complete. The optional 640-pixel confidence monitor is independent of send resolution.
