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

## First hosted trial — October 28, 2026

The signed-in preview successfully controlled the dedicated worker through the scoped proxy. Preview selection, TAKE, live Program, generated Program audio and scene saving were acknowledged and reflected in independent received metadata. No real camera/screen permission was requested and no program media was recorded.

This was **not a 1080p30 qualification**. A 15.026-second off-air window measured source 29.95 fps, primary 29.88, standby 29.95, gateway encoding 20.43 and received distinct/decoded/presented 20.10 at 1920×1080. A moving two-demo-source window measured 16.59 distinct fps; removing the unused second demo measured 18.85 over 15.013 seconds. These are short diagnostic windows, not a soak. Packet loss was zero in the sampled receiver metadata. Worker CPU was approximately 80–84%; memory was ample. Fencing generations changed repeatedly under load. CPU pressure is a candidate explanation, not an isolated root cause.

The loss is downstream of the candidate send counters, in the candidate reception/gateway/output path. Profile that path on the hosted Linux environment and compare client-published inputs before making a capacity or service decision. The local hour and local receiver-load passes remain valid local results and do not establish hosted performance.

Both temporary sessions were verified stopped, including the aborted 3.143-second setup. The active worker ran about 12 minutes 40 seconds, then the app's Stop action released its compute. The trial start authorization was closed. No production promotion occurred. Deployment fixes include explicit worker image/cwd, browser-client dependency, safe missing-file responses, bounded readiness verification and an expiry display using the actual media deadline.

## Browser file rehearsal — October 29, 2026

The operator-authorized existing synthetic 1080p30 MP4 was selected through the authenticated studio file picker and published live from the browser. No file was uploaded to media storage and no output was recorded. The first attempt exposed a Cloud-only handoff bug: the pinned SDK emits `nbf=0`, so removal of the previous demo identity causes replacement tokens to be rejected as revoked. Fresh runtime tokens now carry their actual mint time while retaining identical grants, identity and expiry. Signature, grant preservation and expired-token regression checks cover this correction. The engine was restarted inside the same VM with its original deadline; the initial blocked run is not counted as a successful test.

The corrected run verified file publishing and same-session reconnect, Preview isolation, Cut/Fade TAKE, live/off-air control, scene save/recall, source-loss fallback, and generated audio routing plus master mute. The MP4 itself is silent; no file-audio or physical-device qualification is claimed. Pause/resume and rewind controls were exercised without errors; no recorded visual comparison was made.

Three 30-second diagnostic windows received 1920×1080 at **24.36, 24.06 and 23.89 distinct/decoded/presented fps**. File sending was 29.92–29.99 fps. Removing the unused demo reduced host CPU from about 84.6% to 78.3%, but did not restore output to 30 fps. Sampled receiver packet loss remained zero and authority generations stayed constant in each steady window. These short measurements do not isolate CPU as the sole cause and are not a hosted 1080p30 pass.

One planned primary picture stall switched to standby with a 414 ms last-good-to-first-good picture gap; one primary crash measured 62 ms. The primary was restored after both drills. This measures picture continuity, not total restoration time, and does not establish whole-host redundancy. The app Stop action released the VM after approximately 10 minutes 47 seconds, independently verified stopped. The preparation window was closed. All diagnostic evidence is metadata only under the ignored local production directory. The user’s cumulative $10 hosted-test cap remains unchanged; estimates are not a final invoice.

## Hosted FPS investigation and corrected file retest — October 29, 2026

The measured bottleneck was canvas readback in the gateway's marker validator. On the instrumented 8-vCPU Linux worker, candidate RTP decoding progressed at approximately 27–28 fps while the gateway processed only 18.1–18.2 fps. No invalid markers or reported packet loss explained that difference. Each candidate's canvas marker read averaged 14.15 ms, and output rendering averaged 20.89 ms. Two candidate readers plus output rendering exceeded the main thread's frame budget. Extra receive/drop counters and bounded timing totals now distinguish those stages.

`FrameMarkerReader` copies only two native luma rows from supported 8-bit YUV frames. It preserves the magic value, revision, frame number and checksum. Corrupt native markers fail closed; unsupported layouts retain the original checked canvas path. Each subscription owns its temporary buffer. The independent observer uses this path for authority, Program and provenance markers as well, so measurement readbacks do not become another frame bottleneck. Marker reads fell to approximately 0.04–0.07 ms. No frame data is serialized or retained.

Native markers substantially improved throughput, but early post-recovery windows still fell to approximately 29 fps and remain **below target** in the evidence. The compositor now avoids an intermediate full-HD canvas outside an active fade and uses bounded, explicit `VideoFrame` output in HA mode. Frames retain the current revision, old queued revisions are rejected, backlog/deadline failures stop the track, and all owned frames/readers/tracks close at shutdown. A 60 fps encoder ceiling provides arrival headroom while the render cadence remains 30; that ceiling is not an achieved-frame-rate claim. Standard non-HA media behavior retains its original capture path.

The final comparison used the same baseline file on another bounded 8-vCPU/16-GB worker, with no quota throttling and no capacity upgrade. Default canvas contexts outperformed the tested opaque/software/desynchronized alternatives, so those alternatives were not adopted. The native-reader version already reached 29.993 fps in a pre-change window on this VM; the explicit compositor's independent performance gain is therefore not isolated. Its counters establish bounded frame ownership without canvas paint coalescing, rather than proving it alone caused the throughput improvement.

Final explicit-frame retest results:

| Assessed window | Distinct / decoded / presented FPS | Resolution |
| --- | --- | --- |
| Before recovery, 30.008 s | 29.925 / 29.925 / 29.925 | 1920×1080 |
| After crash and primary restoration, 40.084 s | 30.012 / 30.012 / 30.012 | 1920×1080 |
| Restored primary selected, 30.008 s | 29.992 / 29.992 / 29.992 | 1920×1080 |

All three windows meet the 29.5–30.5 fps check, with unchanged Program video/audio track IDs, stable authority within each window, zero reported packet loss and zero selection/provenance mismatches. The post-recovery window sampled source freshness 40 times with no stale samples or fallback warnings. The writer backlog stayed at at most one frame and no writer error occurred. Planned stall/crash picture gaps were 431 ms and 22 ms; both primaries were restored. Birth-scoped process metadata verified that the crashed primary left no surviving child processes.

This is a successful **short hosted file retest**, not an hour soak, ten-receiver qualification, physical-device check, file-audio check or whole-host HA claim. The MP4 is silent. Earlier below-target windows are preserved separately and are not relabelled passed. All 314 regression tests, type checking and scoped lint passed. Both investigation workers were independently verified stopped after the app Stop action, and their preparation window was closed. No program recording, persistent media storage, snapshots, subscription changes or production promotion occurred. Metadata and conservative cost estimates remain under the ignored `.local/production` directory; the $10 cumulative cap is unchanged and billing estimates are not a final invoice.

### Authorized hosted hour (October 29)

The separately configured `jupiter-producer-trial-hour-*` profile permits one
70-minute cloud lifetime, with at most 66 minutes of media lifetime. Ordinary
trials retain their 30-minute cloud limit. There is no extension or automatic
retry. The current cumulative authorization is $12, including previous tests.
A conservative 7.4 GB guest network guard counts both directions, reserving
$0.27/GB across Sandbox and relay, plus maximum CPU/memory and build/connection
allowances. Reaching the guard fails the run; it does not shorten a passing hour.

The hour starts only after a fresh browser file lease, live Program using Input A,
and both compositors have stayed ready for fifteen seconds. An independent
receiver measures 30-second steady windows at 1920×1080 and 29.5–30.5 distinct,
decoded and presented FPS. Planned primary stalls occur at minutes 10/40 and
process crashes at 25/55; each must preserve Program publications, recover with
a picture gap below one second, and restore a warm primary. Fault intervals are
excluded from steady measurements and reported separately. Completion requires
an actual monotonic hour, four restored faults, at least 110 passing windows,
and 3,500 qualified steady seconds. The silent baseline cannot qualify file
audio. Only counters and resource metadata are retained; no media recording,
snapshot or persistent media storage is enabled. Runtime workers and owned
LiveKit rooms stop in `finally`; a follow-up stops the ephemeral VM after
retrieving the terminal metadata. Cloud expiry remains independently enforced.

### October 30 compositor retry

The October 29 hour remains **failed** after 120.563 seconds, with only 90.407
qualified seconds and no scheduled faults reached. Its last 30.209-second
window received 26.2505 fps while the file source encoded 29.9650 fps. Both
compositors' render/write rates fell before their encoders; the gateway followed
the available frames. No packet loss, decoder drops or memory pressure was
observed. Elevated host load supports investigating compute contention but does
not prove a specific hardware limit.

The frame clock no longer adds an extra frame of idle time when a delayed draw
has already missed a deadline. Repeated identical Web Audio gain targets are
cached rather than appending automation events on every video frame. Hosted
inactive candidates now render/encode at 15 fps; the authority-selected candidate
always targets 30 fps. Cadence follows authority polling even without a show
revision change. Startup, local default operation, output fencing, full HD,
readiness thresholds and Program's qualification floor remain unchanged. This
is warm-standby encoding, not two simultaneous full-rate outputs. Added clock
telemetry separates draw work, timer lateness, writing and encoding. A local
clipping optimization showed no material improvement and was discarded.

A local synthetic-input rehearsal passed Program at 29.9985 fps, a 475 ms stall
picture gap, a 73 ms crash picture gap, and post-failover 29.9985/30.0498 fps at
1920×1080. Owned local workers and SFU were verified stopped. These short local
checks do not qualify a hosted hour or a real file.

The retry additionally requires source encoded FPS within 29.5–30.5 in every
assessed steady window. Terminal evidence is exported as hashed, small metadata
chunks containing all measured windows, periodic stage counters and detailed
final-window counters; media and private capability fields are excluded. This
permits evidence retrieval before automatic cloud expiry.

Billing posted through October 30 07:00 UTC allows replacing earlier reserves:
$5.77832 in team-wide billed usage (excluding existing subscriptions) plus a
$1.29512 upper allocation for all prior test relay traffic/connections. This
conservatively counts unrelated team usage too. One new 70-minute compute
allocation ($1.5904), **6 GB** bidirectional network guard ($1.62), build/functions
allowance ($1.25), and connection allowance ($0.42) reserve approximately
**$11.95384 cumulative** under the user's $12 cap. Credits and final invoices
remain provisional; no automatic paid repeat or deadline extension is allowed.


### Browser file publisher fix (October 30, local qualification only)

The last hosted retry failed after 241.571 seconds, with 211.504 qualified
steady seconds and seven passing windows. The compositor, gateway and receiver
remained around 30 fps at 1080p, while browser source encoding fell to 5.256 fps
over the final window (about 1 fps at the tail). No planned fault was reached.
That run remains failed; its workers, rooms and Sandbox were stopped.

The file publisher painted a canvas from page timers. A controlled local
comparison clamped those timers to at least 1,000 ms: the old path delivered
1.033 fps, while native video-element capture delivered 29.999 captured,
29.965 encoded and 29.932 decoded fps at 1920×1080 over 30 seconds. This
reproduces the timer sensitivity, not the historical tab visibility, which was
not recorded. Browser background timer alignment is a plausible trigger.

File playback now publishes native captured tracks without a timer-driven
canvas or timer fallback. Unsupported browsers fail closed. A cloned native
track is consumed for metadata counters only; every VideoFrame is closed
immediately and the clone/reader stop with the input. Paused playback is
excluded from capture counters and soak readiness because Chrome can continue
emitting repeated frames while paused. Capture timestamps do not prove
pixel-distinct frames. Pause/resume and looping were checked locally; the
baseline file is silent, so audio remains unqualified. Optional audio uses
the native audio track; no recorder or media storage is introduced.

The hour gate now additionally requires native capture FPS of 29.5–30.5,
active file playback, and valid native telemetry. Safe counter metadata includes
capture mode, visibility, playback position and pause state. Existing output
FPS, resolution, fault, publication and cleanup requirements remain unchanged.

No new hosted hour or deployment was started. The retained cumulative estimate
is $8.68274 including prior pending allowances, leaving $3.31726 of $12.
Another guarded hour reserves $4.8804 (70-minute compute/memory $1.5904,
6 GB conservative transfer $1.62, connections $0.42, build/functions $1.25),
which would total $13.56314. Pending billing was not reduced to make a run fit.
All eight prior test Sandboxes were verified stopped. These are estimates,
not a final invoice. The native fix remains local until a hosted run fits the
remaining budget or a different cap is explicitly approved.
