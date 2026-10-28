# Local Full HD 30 fps and faster failover

This follow-up improves the Phase 7 local HA prototype. Everything remains on this Mac. No Vercel build/deployment, AWS resource, production API/database/Zoom call, meeting join or Program recording is used.

## Changes

The HA profile now generates both synthetic sources at **1920 × 1080**, composes both candidates at that resolution, and publishes a 1080p Program through the independent gateway. Normal non-HA workbench profiles are unchanged. H.264 replaces VP8 in this HA profile; actual sender and receiver codec/dimension counters are saved, rather than inferring quality from settings. The browser did not expose the encoder implementation string, so these results do not establish that hardware encoding was used.

Three timing changes remove avoidable resampling:

1. Synthetic sources and candidate compositors request canvas capture explicitly after a completed draw. A second canvas capture timer no longer competes with their render clock.
2. The gateway consumes decoded `VideoFrame` objects through `MediaStreamTrackProcessor`. It forwards each newly selected candidate frame, rather than sampling it through an HTML video presentation callback and another 30 fps timer. It retains at most one frame per candidate, closes replaced frames, and cancels readers on replacement/cleanup.
3. The independent receiver decodes unique in-band picture markers separately from display callbacks. Marker stripes share one readback. Presentation callbacks remain light, and their `presentedFrames` counters are measured independently. Expensive probing can miss callbacks; callback counts alone are not proof of the number of displayed or decoded frames.

The gateway still checks exact candidate identity, committed revision, monotonically increasing generation and current-run lease. Its separate 20 ms timer enforces slate/silence on expiry or missing input; it does not resample valid moving video. The **one-second output lease was not shortened or bypassed**.

## Faster and stricter takeover

- Candidate encoder telemetry reports every 200 ms; authority reconciliation runs every 100 ms.
- Heartbeat and encoded-progress freshness is 1.2 seconds, replacing the previous four-second window.
- A warm standby must also have fresh, current-revision media independently decoded at the gateway. Candidate self-reports alone cannot authorize it. Gateway reports expire after 500 ms; decoded frame freshness is 350 ms.
- A disconnected candidate process/transport withdraws its readiness immediately. Takeover still requires a synchronized, independently decoded standby; it does not create a new unrestricted publisher.
- A frozen picture can trigger takeover from independent decoded-progress evidence even while candidate heartbeats continue.
- Revision lag while applying a new scene is not itself treated as a crashed primary. Loss of authority or lack of a ready standby still fails closed.

These thresholds are local prototype settings. They are not tuned or validated for WAN latency, shared-host contention, production event duration or other hardware.

## Acceptance and measurement

Start the lab with Node 24 and the checked native Chrome/LiveKit versions:

```sh
npm run production:ha
# In another terminal:
npm run production:ha:quality
```

Review `http://127.0.0.1:4311/`. The separate Full HD / faster takeover section shows the latest result. Its ignored metadata file is `.local/production/ha/quality-verification.json`; earlier attempts are archived with timestamps. The original Phase 7 functional drill remains available through `npm run production:ha:verify` and its separate `verification.json`.

Each quality window excludes warmup and must keep 1920 × 1080 throughout. The 30 fps target uses a documented average acceptance floor of **29.5 fps**, independently for unique decoded Program markers, WebRTC-decoded frames and frames submitted for presentation. The report includes low-percentile one-second rates rather than implying every one-second bucket is exactly 30 fps. Counter resets, generation/publication changes and incomplete windows are rejected. Both synthetic source encoders must also report native 1080p dimensions, preventing a low-resolution fixture enlarged into an HD container from passing.

Video failover gaps are measured from the last good presented picture to the first verified picture of the new selected generation. The report also stores its first decoded and first presented timestamps separately. Audio is monitored silently; RMS sampling is at 100 ms and does not establish sample-accurate A/V sync.

The working deadline is four minutes, with bounded cleanup afterward. The lab independently stops media after ten minutes. The verifier closes all owned media workers/SFU on success or failure and leaves metadata/review pages available. It never extends the media deadline or joins a production room. Ctrl-C cancels further fault actions and requests cleanup.

## Measured result — 27 October 2026

The completed quality run lasted **89.566 seconds**, with three steady windows:

| Window | Resolution throughout | Unique decoded Program fps | WebRTC decoded fps | Presented fps | Measured duration |
| --- | --- | ---: | ---: | ---: | ---: |
| Primary baseline | 1920 × 1080 | 29.90 | 29.90 | 29.90 | 30.001 s |
| Standby after partition | 1920 × 1080 | 30.01 | 30.01 | 30.06 | 19.896 s |
| Standby after process exit | 1920 × 1080 | 30.00 | 30.00 | 30.00 | 19.900 s |

All three windows passed the documented 29.5 fps floor. No packet-loss or presentation-drop counter increase was observed within those windows; two presentation drops existed before the first window and are not counted as new losses. One-second low-percentile distinct rates were about 28.8–29.4 fps, so this is an average 30 fps target result, not a claim of perfectly uniform frame delivery. Actual encoders reported H.264, 1080p and no quality-limitation reason during the measured windows.

| Injected failure | Last good to first recovered presented picture | Injection to first recovered presented picture |
| --- | ---: | ---: |
| Live primary control partition, followed by a new scene | **293 ms** | 1,285 ms |
| Frozen renderer with heartbeats continuing | **461 ms** | 549 ms |
| Primary process exit | **92 ms** | 129 ms |

The control-partition test kept the old primary alive and sending its previous private scene while standby delivered the new picture and tone. Stale promotion was rejected. Candidate takeovers retained the Program publication. The separate authority-loss check still produced a slate and silence after lease expiry. All workers stopped; recording remained disabled.

The previous Phase 7 drill observed a maximum picture interval of 4.084 seconds during its sequence. These new figures are fault-specific receiver measurements, not a universal failover SLA. Deliberate loss of authority can still interrupt output, and gateway process replacement still requires a new publication.

Earlier under-target attempts remain failed in the archive: explicit capture reached 30 decoded fps but only 25.15 distinct pictures in the first measurement; frame-driven gateway forwarding improved that to 27.52 observed distinct fps before receiver-probe overhead was separated from actual decode/presentation counters. No duplicate Program frames were relabelled as a successful 30 fps result. A unique Program marker identifies a newly composed frame; this test does not establish one-to-one preservation of every input-source frame.

## Limits

This is short-duration local validation with generated moving sources, not OBS, Zoom delivery, a cloud audience load test or an event-length soak. It does not prove cross-host/AZ availability, production hardware sizing, moving-playback clock drift or sample-accurate lip sync. The authority, gateway and SFU still share one Mac and need independent production recovery/fencing designs. No recording continuity claim is made.

## Final regression checks

The existing nine-check Phase 7 media drill also passed after these changes, including one-publisher room isolation, asset/playback synchronization, stale-generation rejection, gateway publication replacement and durable authority reload. **295 automated tests**, TypeScript checking and targeted lint passed. The checked native runtime was verified and sources packaged locally; no image build, push or deployment occurred.


## Gateway sender follow-up — 27 October

The first hour attempt stopped after 212.5 seconds: candidate decode and gateway capture stayed near 30 fps, but gateway encoding and receiver delivery fell to 29.21 fps. No scheduled long-soak fault was reached. Those failed results remain archived.

The gateway now gives its encoder a 60 fps ceiling while retaining frame-driven capture from the 30 fps source. It does not add a 60 fps capture clock or duplicate unchanged input frames. This removes the exact-30 sender limiter that could reject unevenly arriving frames; it does not establish that all browser scheduling variation is eliminated. Target/ceiling counters are reported separately. The soak rejects steady averages above 30.5 as well as below 29.5.

A fresh `--gateway-probe` qualification measured 300 seconds at 1920×1080: 29.9201 unique, decoded and presented fps, with candidate input/capture near 30.0001 fps. Every complete 30-second baseline window passed 29.5–30.5; the lowest was about 29.70. One-second p05 was 29.06, so cadence is not perfectly uniform. Post-partition delivery was 29.99 fps; post-crash delivery was 29.55 distinct/decoded and 29.50 presented fps, close to the floor. Picture gaps were 225 ms for control partition, 441 ms for continuing-heartbeat picture stall and 70 ms for process crash. Authority expiry still produced slate/silence. All media workers stopped after qualification.

These results support the limiter change but do not prove hour-long stability. A separately identified fresh hour is required; the failed hour is not reclassified as passed. Only synthetic local media and metadata are used, with no recording, cloud action or deployment.


## Explicit-frame investigation — 27 October, second follow-up

The encoder-headroom hour also failed after 212.5 seconds at 29.4669 fps. It remains failed; no long-soak faults were reached. Further instrumentation showed the earlier `outputFrames` counter counted canvas capture requests, not actual emitted track frames. It must not be treated as proof of capture.

A fresh instrumented canvas run reproduced a 29.39 fps receiver window. Over an aligned gateway interval of 29.997 seconds, capture requests were 30.003 fps, actual track frames were 29.4029 fps, and encoded frames were 29.4029 fps. This locates that loss at the canvas-to-track handoff, before encoding. It does not identify a browser-internal scheduling cause or establish CPU exhaustion. The W3C capture algorithm sets a capture-request flag and produces a frame on a subsequent canvas paint; capture requests are not individually queued frames. Specification: https://www.w3.org/TR/mediacapture-fromelement/ . Full metadata is retained in `.local/production/ha/gateway-canvas-capture-failure.json`.

The gateway now snapshots each completed picture into an immutable timestamped `VideoFrame` and writes it to a `MediaStreamTrackGenerator`, bypassing the canvas-paint capture handoff. This uses the Chrome API supported by the pinned local runtime; it is not a cross-browser production guarantee. The source remains 30 fps, with no frame repetition clock. A separate processor counts actual generated track frames. Submitted, written, actual track and encoded counters are distinct.

The frame writer holds at most four frames, rechecks authority before queued writes, closes fenced/stopped frames and fails closed on write errors, overflow or a 100 ms write deadline. It cannot silently grow latency to pass a throughput test. Generation/revision/lease fencing and independent decode freshness remain enabled. Unit tests cover pending-generation fencing, resource release, blocked writes and bounded overflow.

An initial explicit-frame qualification maintained about 30 fps through its last completed baseline window, but stopped at 290.4 seconds on the short verifier's 300 ms freshness check. It remains failed, with worker cleanup verified. Its full runtime samples and partial probe were archived separately. The short probe now samples once per second, matching the soak rather than polling at 10 Hz and rewriting growing sample arrays. Its picture-age check uses the soak's existing 500 ms threshold; the soak's original threshold and interruption/quality criteria are unchanged. Exact trigger state is now persisted before cleanup if a future short probe loses freshness. Passing a short recheck is required before another independently identified hour is launched.


The subsequent one-second-sampling qualification completed: its five-minute baseline averaged approximately 30.00 distinct/decoded fps and 29.99 presented fps at 1920×1080; every complete 30-second baseline window remained between 29.965 and 30.035 across those metrics. Post-partition and post-crash windows also measured about 30 fps. Picture gaps were 242 ms for control partition, 500 ms for continuing-heartbeat picture stall and 87 ms for process crash. Old-primary fencing and authority-expiry slate/silence passed. This qualifies the new path for a fresh hour, not an hour pass. The new soak explicitly requires the generator transport and rejects writer errors.

302 automated local tests passed after the change, including three frame-writer safety tests. Type checking and targeted lint passed. No recording, deployments, commits, pushes or cloud resources were used for this investigation.
