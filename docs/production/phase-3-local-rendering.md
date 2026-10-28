# Phase 3 — local rendering parity workbench

The next local milestone is documented in [Phase 4 — runtime hardening and release preparation](./phase-4-local-runtime.md).

Implemented October 26, 2026, on the existing local-only branch. No commit, push, Vercel build/deployment, cloud resource, production database access or Zoom join was used.

This phase adds a practical scene/asset review surface to the independent Program engine. Representative fixtures pass; this does **not** certify every real production, every CSS effect, Full HD output or sustained 30 fps.

## Review locally

```sh
npm run production:media
```

Open <http://127.0.0.1:4310>. Under **Scene rendering / Phase 3**, select a fixture and **Load fixture into Preview**. **Open Canvas / DOM comparison** opens <http://127.0.0.1:4310/parity>. It reads Preview without changing Program. Press **TAKE** on the control page to send the composition through the independent compositor and Program receiver.

The comparison shows the Canvas candidate beside a DOM reference derived from the existing producer block styles in `producerRoomBlockHelpers.tsx` and its 640×360 block coordinates. It is a comparison harness, not a rendering of the full existing React producer component, and is not an automated pixel-match claim. The PDF/presenter fixture was visually inspected in both views, with matching placement, page content and aspect ratios. The views fit their containers without clipping the composition.

The engine publishes at 1280×720 with a target of 30 fps. Live inputs remain the independent 640×360 synthetic A/B sources. The Mac must stay awake. Media stops after 30 minutes; comparison/monitor subscriptions expire after two minutes. These bounds are not extended by verification or measurement commands.

Program reserves a 12-pixel test marker strip for independent revision/frame verification. The entire composition is fitted above it with its aspect ratio preserved, so the telemetry no longer covers the bottom of a scene. This small test-only letterbox is another reason the workbench is not a final production-output certification.

## Scenes and graphics

Six legacy-shaped fixtures are imported through the Phase 1 adapter:

| Fixture | Coverage |
| --- | --- |
| Two presenters + lower third | Two logical sources, stable stacking, text wrapping, image graphic |
| PDF slides + presenter | Rasterized PDF page 1, contained slide, cropped camera, rounded corners |
| PDF page 2 | Durable page selection |
| Transforms, opacity + clipping | Center-origin rotation/scale, opacity, radius, shadow/glow candidate |
| Video asset + graphic | Muted local video, independent graphic, durable playback anchor |
| Missing source / safe slate | Registered source with no publication, explicit fallback |

The Canvas path supports layer coordinates, stacking, visibility, opacity, center-origin scale/rotation, rounded clipping, contain/cover, constrained blend modes/colors, blur, basic shadow/glow, wrapped text and the existing eased fade/drift/push style progress. `animationProgress` remains committed style intent; this phase does not invent a running animation clock for legacy styles. CUT and crossfade remain supported.

PDF.js 6.4.299 rasterizes pages locally, with JavaScript evaluation disabled. Page dimensions are bounded for rasterization. Assets are prepared before the new revision is acknowledged. An invalid asset retains the previous valid Program and reports an error. Off-air always takes priority, including when the committed scene contains invalid media. Video playback reconstructs position from its durable anchor; pause/seek does not depend on the producer tab.

## Your own local files and scenes

**Local asset library** accepts PNG, JPEG, PDF, MP4 and WebM files up to 20 MB each, with a 200 MB / 100-file library bound. Files are copied only to `.local/production/media/assets/`, given content-addressed IDs and stored with private local permissions. They remain on this Mac until removed locally; they are not automatically deleted or uploaded. Browser decoding/codec availability is still required. Videos need finite finalized duration; use a finalized MP4 if a WebM lacks duration metadata. Uploaded video audio is muted in this phase.

Choose a registered asset, set its PDF page if applicable, and **Load asset into Preview**. Nothing is put on Program until TAKE.

The **Import a legacy scene locally** panel accepts a legacy block array and an explicit participant-to-logical-source mapping. Use `camera-a` / `camera-b` for the synthetic live inputs. Replace media references with the local registered `assetId`; asset IDs are shown in the durable snapshot/command state and local library API. A PDF layer also uses `page`. Local blob/data URLs cannot be persisted. The renderer never fetches arbitrary legacy `src` URLs or production storage references.

An imported scene preserves visual props and discards ephemeral track SIDs. Unknown logical sources are rejected by the command contract. No production scene is read or rewritten by this workbench.

The asset cache is bounded to 32 decoded entries per process. Restart the local runtime if the cache limit is reached during a long asset-review session. Restarting restores committed state and the local library.

## Missing-source policy

Use **Pause synthetic A/B** to stop the publisher's moving-frame progress without closing its connection. Publisher progress and decoded input freshness are both checked, so keepalive frames cannot make a frozen test source appear fresh.

- A has a slate fallback. Its picture changes to a labelled unavailable slate.
- B has hold-last fallback. Its last picture remains visibly labelled stale.
- Stale source audio is muted. A stale source does not stop the Program clock or the other layers.
- Resume restores the source and its requested audio without changing logical source IDs.

Program may remain healthy while explicitly showing a source fallback; source warnings are displayed separately. A renderer error degrades engine health. Applied/observed revisions remain distinct from committed revisions.

## Verification

```sh
npm run production:parity:verify
npm run production:media:measure -- 60
```

The parity verifier intentionally changes local Preview/Program, registers the bundled synthetic PDF in the local library, exercises every fixture, pauses/resumes the synthetic publishers, and tests rejection/off-air/recovery. It does not record Program. It ends with the PDF/presenter scene live locally. Do not operate the console concurrently with this deterministic verification.

Passed end-to-end checks:

- Local file registration → legacy import → ordered command/SQLite → PDF page decoding → observed Program revision.
- All six representative scenes reached the independent receiver.
- Muted synthetic video advanced and paused at the durable 800 ms seek position.
- Frozen A produced a slate; frozen B produced a labelled hold; received audio became silent while Program continued.
- Resuming both sources restored progress and audio.
- An unregistered asset was refused, the last applied revision was retained, and off-air still reached the receiver. A valid scene subsequently restored healthy Program.

Evidence lives in ignored `.local/production/media/parity-verification.json`. The measurement command reads metadata only and writes `parity-timing.json`; it never changes a scene or extends the runtime. It reports actual encoded/send and unique decoded rates, unhealthy samples, generations and restarts. The repository suite passed 265 tests, with typecheck and targeted lint also checked.

The final one-minute PDF/presenter observation, after fitting scene content above the test marker strip, measured 29.12 distinct received fps and 29.12 encoded/send fps at 1280×720 over 60.002 seconds. It had zero unhealthy samples, zero renderer restarts during the observation, one generation and one applied revision throughout. Individual reporting intervals ranged from 25 to 30.1 fps. An earlier observation averaged 25.97 received fps; the two local observations do not establish a causal performance improvement or cloud capacity. This is continued-output evidence, not a sustained 30 fps pass.

## Remaining parity work before production approval

Real customer productions still need review in this harness. Exact font metrics, CSS shadow/glow/filter matching, complex blend interactions and animation/timeline edge cases are not pixel-certified. The DOM reference helps identify differences; it is not an alternate Program publisher. Arbitrary HTML/iframes, PDF viewer chrome, standalone audio-asset layers, uploaded-video audio, captions and warp/curtain transitions are not implemented in this renderer. Unsupported active layer/transition types retain the last valid Program with a visible error.

Only synthetic live-source publishers have been exercised. Real device input, multiple publications per participant and production source-binding changes still need integration testing. This phase does not change the attendee player, production recording, cloud hosting, credentials or production lifecycle. Monitoring remains expiring and unrecorded; the separate **Record local Program** button is an explicit opt-in and writes only to this Mac, as described in the Phase 2 document.

The next release phase requires representative-production sign-off, a pinned runtime image, robust supervision/credential lifecycle and longer duration testing. Cloud deployment remains a separate step.
