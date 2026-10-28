# Phase 2 — local Program engine proof of concept

The next local milestone is documented in [Phase 3 — rendering parity workbench](./phase-3-local-rendering.md).

Status: implemented and exercised locally on October 26, 2026. This is a separate workbench, not a deployment of the existing event application.

## Run and review

Prerequisites: Node 24, installed Google Chrome, installed project dependencies, and the official `livekit-server` binary. On this Mac the binary is `/opt/homebrew/bin/livekit-server` (1.13.9); Chrome is selected through its installed stable channel. `playwright-core` hosts the independent browser processes; it does not download a browser.

From the repository root:

```sh
npm run production:media
```

Open <http://127.0.0.1:4310>. Select a source for Preview, press TAKE, then Go live. Enable a test-tone channel and Save audio if audio is wanted. Preview audio is copied to Program by TAKE; editing Program audio changes the live mix directly. The monitor starts muted; its Audio button affects local listening only.

To repeat the synthetic verification against a running workbench:

```sh
npm run production:media:verify
```

That command intentionally changes local Preview/Program and audio state, makes one short local synthetic recording, closes no user applications, and kills/restarts the workbench's own renderer once. Close the producer tab before running it to repeat the console-independence check. It cannot contact AWS, Vercel, Supabase or a Zoom meeting.

Stop the terminal with Ctrl+C. The media session also stops automatically after 30 minutes, while the control workbench stays available. A monitor stops after two minutes or when hidden/closed. Stop and restart the terminal to begin another media session. A single renderer-crash test is allowed per session.

## What runs

Two separate headless Chrome processes publish independently animated synthetic sources and quiet 440/660 Hz tones into a local LiveKit contribution room. Each source is 640×360 with a 30 fps target. No camera, microphone or program footage is accessed.

A third process reads the Phase 1 command snapshot from local SQLite, subscribes to both sources, composites a single 1280×720 canvas with a text graphic, and publishes one Program video track plus one mixed audio track into a separate Program room. It supports cuts and linear crossfades. Program audio supports channel gain, mute, solo and master gain/mute, with a limiter. Off air publishes a slate and silence.

A fourth process independently subscribes to Program. It decodes a synthetic revision/frame marker embedded in the picture, measures changing decoded frames and audio RMS, and reports what was actually received. The producer monitor subscribes to this same Program output; it does not recompose it.

Closing the producer tab does not close any of those four processes. SQLite owns committed state, the renderer owns applied state, and the separate receiver supplies observed state. A committed command is not automatically reported as observed. A heartbeat without advancing media cannot keep Program healthy. A previous renderer generation cannot acknowledge a replacement renderer.

## Measured result

The automated local run verified:

- Both independent sources decoded at the compositor.
- Source A and audible mixed audio reached the independent receiver.
- A 500 ms crossfade produced four decoded intermediate-color frames before source B arrived.
- Program mute reduced received RMS from about 0.0086 to 0.0000024; unmuting restored measurable audio.
- An explicitly requested recording of received Program completed: 935,685 bytes, roughly seven seconds, valid WebM container header.
- With the producer tab closed and no control commands, 506 distinct Program frames were decoded over 20 seconds: approximately 25.3 fps on average at 1280×720. The last reporting interval was 22.9 fps. Earlier steady intervals reached about 28–30 fps. **This is not a sustained 30 fps performance pass.**
- Killing only the renderer caused a bounded automatic restart. Generation 2 rehydrated revision 28 from SQLite; the measured decoded-picture interruption was about 2.04 seconds. Sources, receiver and committed state survived. This is restart recovery, not seamless high availability.

Metadata evidence is in ignored `.local/production/media/verification.json` and `runtime-report.json`. They distinguish rendered frames, encoded/sent frames and independently decoded frames. Audio packets and received RMS are measured; an audio-sample count is unavailable and is reported as `null`.

The repository suite passed 260 tests after this implementation; TypeScript and targeted lint are also checked. Media checks are separate from unit/API tests and require the running local runtime.

## Recording and privacy

Monitoring does not record. Recording requires the explicit **Record local Program** action (or the explicit verification command above). It records the observer's received Program tracks using MediaRecorder, not a second composition. This local POC is not LiveKit Egress and is not production recording infrastructure.

Recordings stop after three minutes and are limited to 50 MB, with ordered chunks and private local files under `.local/production/media/recordings/`. Completed recordings remain on this Mac for review; they are not uploaded or automatically deleted. An interrupted recording is marked failed and cannot be downloaded as complete. Only synthetic media is used by this workbench.

## Boundaries and safeguards

Signaling is bound to `127.0.0.1:7880`; RTC media uses loopback UDP `127.0.0.1:7882`. LiveKit's wildcard TCP media listener is disabled. The control API binds to `127.0.0.1:4310`, checks Host/Origin and custom mutation headers, and never loads production environment files. Random room names, signing secrets and role capabilities are generated per run. Viewer tokens cannot publish. Runtime page requests are limited to loopback; no public STUN server is configured. This is a trusted single-user local workbench, not production authentication.

The producer can close, but **the Mac must remain awake and the Node host must remain running**. Laptop shutdown/sleep independence requires moving the engine to an independently hosted machine later.

This phase does not implement real-device contribution, video-file playback, full existing page-builder graphics/layout parity, captions, attendee routing, Zoom satellite output, cloud recording, Postgres authority, multi-host supervision, leader fencing or high availability. Unsupported active layer/transition types retain the last valid Program and surface an error. Stale inputs receive a fallback slate or labelled held frame, and their audio is muted. A stalled renderer is reported degraded; only renderer process exit triggers the one bounded automatic restart in this POC.

No Vercel build/deployment, Git push, cloud resource, production database change or meeting join is part of Phase 2. The next engineering step is production-renderer parity and sustained timing tests with representative media, still locally, before any cloud cutover.
