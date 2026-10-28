# Hosted producer rehearsal

The qualified one-room pipeline remains primary + standby compositors, private candidate publications, a fenced gateway as the sole Program publisher, and an independent receiver. The hosted rehearsal uses the same implementation. It does not replace the existing producer room or publish to attendees/Zoom.

## App boundary

Open Producer room → Hub → Hosted producer rehearsal. Event operator authorization is checked for every asset and control request; the requested session must belong to the resolved event. Browser source/viewer tokens remain scoped to ephemeral private inputs or finished Program. The browser never receives the worker signing key or SFU API secret.

Vercel serves the controls and proxies an explicit operation allowlist. The dedicated worker verifies HMAC signatures over the full payload, timestamp and nonce, rejects replay, and checks its fixed event/session. Only its loopback listener serves compositor capabilities. Capture/file media is not written to disk. Show intent and metadata use a fresh temporary directory, removed at Stop. No media-recording endpoint is exposed.

## Approved first trial

One global-admin-initiated Vercel Sandbox: 8 vCPUs / 16 GB, iad1, nonpersistent, 30-minute non-extendable cloud timeout, no snapshots. Worker commands are independently bounded and the media process has a 20-minute deadline after installation. No resume, retry, replacement or recurring provisioner is implemented. Reserve $8 of the human-approved $10 total test cap, including compute and relay/build allowance; this is not a final invoice. Existing hosting subscription costs are separate. LiveKit credentials stay inside the Vercel project/worker environment.

Preview-only settings:
- `PRODUCER_ENGINE_SECRET`: random server-side signing secret, at least 32 bytes.
- `PRODUCER_ENGINE_TRIAL_NAME`: unique single-use `jupiter-producer-trial-*` name.
- `PRODUCER_ENGINE_TRIAL_ALLOWED_UNTIL_MS`: short absolute authorization deadline, no more than 24 hours ahead.
- Existing `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` supply the encrypted hosted transport.

A separately managed worker may instead use `PRODUCER_ENGINE_URL` (HTTPS origin). Do not configure both approaches. Sandbox creation uses the deployment's OIDC identity, never browser-extracted AWS or Vercel credentials.

## Verification before claiming hosted success

The prior hour and 3/5/10 receiver tests prove local synthetic delivery only. Hosted verification still requires: authenticated page → scoped proxy → worker → actual received 1920×1080 distinct/decoded/presented FPS; Preview isolation; TAKE; audio; source loss; expiry; private-room grant fencing; and room/worker cleanup. Physical cameras/display permission and perceived lip sync need attended checks. Do not infer hosted 1080p30 from the target profile or successful send calls. Do not call this whole-host HA: both compositors still share one worker host.
