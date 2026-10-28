# Phase 5 — local audience and recording cutover preparation

Implemented and verified locally on October 27, 2026. This is a canary workbench for the finished-Program delivery model. It does **not** cut over a production audience, edit a production event, deploy to Vercel, use cloud Egress or create AWS resources.

## Review

```sh
npm run production:preflight
npm run production:media
```

Open <http://127.0.0.1:4310/> and use **Audience delivery / Phase 5**. The new **Open audience preview** link opens <http://127.0.0.1:4310/audience>. It receives one finished video track and one mixed audio track; it does not import scenes, subscribe to contribution sources, recompose layers or record.

Fresh delivery journals default to **legacy**. In this local workbench, legacy means the audience preview is disconnected; it does not emulate or reconnect to the existing production legacy player. **Use Program locally** requires a live, current revision acknowledged by the renderer and independently decoded by the observer, with valid Program track identities and no missing-source warning. The setting is limited to the synthetic `local-event` scope and persists across local host restarts. The completed acceptance run leaves Program selected for local review.

**Roll back to legacy locally** disconnects the audience preview and refuses new audience bootstrap tokens. The host also makes a best-effort local SFU removal of currently leased audience participants. Rollback does not stop the Program engine, change its scene or connect an audience to source media. There is no implicit fallback to source composition during a stall or renderer restart.

The audience preview starts explicitly and muted, supports optional local listening, and stops after two minutes, on page hide or on Stop. A replacement Program generation is acquired only after fresh Program readiness. The media session's original 30-minute deadline is not extended.

## Delivery state and permissions

The local delivery journal stores scope, mode, revision and deduplicated command receipts using atomic replacement. Commands require the expected delivery revision. A stale operator receives a conflict; a reused command ID with different intent is refused. Another event scope cannot use this selector. An idempotent replay returns current state without repeating a cutover or undoing a subsequent rollback.

Audience bootstrap tokens are subscribe-only, limited to the Program room, with at most a two-minute TTL. They cannot publish video/audio/data or subscribe to the contribution room. The audience page uses the scoped bootstrap endpoint, not the diagnostic token endpoint. It mounts only the expected `program-engine-N` publisher's named Program video/audio tracks, with at most one of each kind.

This remains a trusted, loopback-only, single-user workbench. Diagnostic operator routes are still available locally. JWT expiry is not proof of immediate revocation of every previously issued bearer token; a custom client might reuse a still-valid token until expiry. The tested audience page obeys rollback, and new scoped issuance is refused. Production user/event authorization, tenant isolation and stronger server-side revocation must be supplied by the eventual production adapter. No production audience authentication is claimed here.

## The same finished Program in recordings

**Record finished Program locally** is explicit opt-in, requires Program selected and ready, and records the existing independent observer's received Program tracks. It does not create another composition. The older diagnostic recording API remains for local regressions; its duplicate buttons are hidden when the Phase 5 controls are active.

Each new recording stores provenance: local run/broadcast, Program generation and publisher identity, exact video/audio track SIDs, Program revision and delivery revision. Observed revisions are journaled while recording. A publication change or rollback fails an active recording; there is no silent resume across discontinuities. Already completed recordings keep their original provenance. Checksums and restart reconciliation from Phase 4 still apply.

The same local 50 MB / three-minute recording bounds apply. Completed files and failed partial files remain privately on this Mac under `.local/production/media/recordings/` until removed locally. Monitoring stores no media. Test probes normally collect only metadata; the acceptance command deliberately makes short synthetic recordings to verify the file path.

## Acceptance evidence

```sh
npm run production:delivery:verify
```

Run against the existing media workbench, without changing scenes concurrently. The verifier uses only the synthetic A/B sources and a text graphic. Its extra owned browser receiver is bounded to two minutes per probe and is closed in cleanup. It never joins Zoom, uses a camera/microphone or extends the media-session deadline.

The completed run verified:

1. Legacy mode issued no audience Program token and mounted no video/audio track.
2. Local Program selection delivered the actual A picture and mixed test audio to a separate audience receiver.
3. Across TAKE A/B, the audience and recorder used identical Program video/audio SIDs. A was revision **151**, B was revision **154**; the completed recording was **625,003 bytes**, with matching publication/generation provenance.
4. Independent playback decoded the actual recorded WebM to completion: **105 decoded frame callbacks at 1280×720**, both A/B picture classifications, both revision markers and nonzero recorded mixed audio (maximum RMS about **0.00879**). This is file decoding, not just an accepted record command or valid container header.
5. The audience reconnected to Program generation 2 after an intentional renderer exit, using new Program track IDs and no source-room fallback.
6. Rollback disconnected the audience, failed the deliberately interrupted second recording with an explicit rollback reason, and left the Program engine healthy with advancing frames. Program could then be explicitly selected again locally.

The evidence is in ignored `.local/production/media/delivery-verification.json`. A synthetic audience review screenshot is saved at `.local/production/media/phase5-audience-review.png`. The repository suite passes **275 tests**; TypeScript and targeted lint pass separately. These are correctness checks, not sustained Full HD30, audience-load or cloud-capacity measurements.

## Production boundary

The existing attendee components, production page-builder player, live delivery selector, production database and production recordings are unchanged. This phase prepares and proves the receiver/selector/recording flow locally; it does not claim an event has been cut over on the live site.

The Phase 4 gates still apply: representative-production visual sign-off, a built/tested Linux image, production authorization and durable Postgres control/delivery adapters, real Egress integration and longer representative failure/load tests. Docker remains unavailable here, so the pinned container recipe remains unbuilt. A real canary cutover requires those gates and separate deployment authorization. Phase 6 scale/regional/bitrate testing has not started.
