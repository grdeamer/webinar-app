# Local 60-minute 1080p30 soak

The first user-authorized observation run **FAILED after 3 minutes 32.5 seconds**. It is not a completed or passing 60-minute soak.

- Soak ID: `dd0ec67f-fa52-46af-934e-2d43864c1914`.
- Runtime ID: `a2e4a6c4-d584-47a5-80ca-034dcfd93665`.
- Observation started: 27 October 2026, 11:47:31 AM Eastern.
- Originally scheduled finish: 12:47:31 PM Eastern; cancelled by the fail-fast quality check.
- Independent non-extendable safety deadline: 12:52:24 PM Eastern.
- Frozen source artifact: `d147e92368669d29721858130e65b14544b80d15848c01851d01529cb2f02f39`.

Everything stays on this Mac. Sources are generated moving 1080p graphics and tones. There are no OBS/Zoom/cloud/production connections, deployments or Program recordings. Only counters, timing, process/resource metadata and diagnostic logs are retained.

## Plan and qualification

The clock starts only after warmup, fresh 1080p output and two ready renderers. It measures a full monotonic hour, including the explicitly scheduled fault/restoration intervals. It is not extended, paused or automatically retried to hide interruptions.

The supervisor samples once per second. Each complete steady 30-second window must stay at 1920 × 1080 and average at least 29.5 fps independently for unique decoded Program markers, WebRTC-decoded frames and submitted presentation frames. Short steady fragments of at least ten seconds are also checked. Shorter fragments and planned fault intervals are explicitly separated from assessed steady time. The final result reports both durations; it does not imply all 3,600 seconds were uninterrupted steady video.

The run fails on low quality, unexpected stale pictures, a resolution change, unplanned authority/publication replacement, worker exit, lost synthetic audio, observation gaps/possible sleep, memory pressure or an unverified cleanup. It preserves a first-failure reason instead of restarting automatically. Independent decoder progress and output fencing remain enabled.

| Observation minute | Scheduled test | Restoration |
| --- | --- | --- |
| 10 | Freeze the primary picture while heartbeats continue | Standby takes over; unfreeze primary and verify both warm |
| 25 | Controlled failback, then crash primary | Standby takes over; restart only primary and verify both warm |
| 40 | Controlled failback, then repeat the picture stall | Standby takes over; unfreeze primary and verify both warm |
| 55 | Controlled failback, then repeat the primary crash | Standby takes over; restart only primary and verify both warm |

Each fault must preserve Program track SIDs, prevent selection/provenance mismatches and recover with a measured picture gap below one second. Recovery time from injection is recorded separately. The standard drill's one-restart budget remains unchanged; this explicitly authorized soak permits exactly two primary restorations. Its one-second output-authority lease remains unchanged.

## Local safeguards

`npm run production:ha:soak` owns a fresh loopback-only managed host. Fault controls require its private ephemeral capability, which is not written to diagnostics. The UI's Stop action remains available. Other manual fault buttons are disabled during the managed run.

The managed host has a 65-minute media hard limit. A separate Python watchdog checks the supervisor's process identity and deadline, and can clean up only exact birth-verified owned processes. Its deadline cleanup was tested against a disposable sleep process before launch. A temporary process-scoped `caffeinate` assertion prevents idle sleep and ends with the supervisor; closing the lid or manually suspending the Mac can still interrupt the test and must not be counted as a valid observed hour.

The runtime sources are frozen for the run. Do not edit them, trigger additional faults, start another verifier or extend the deadline while it runs. The ordinary short lab still defaults to ten minutes; the longer budget is an explicit managed mode.

At the end, the supervisor stops all owned browser media workers and the separate SFU, revokes worker capabilities and releases its verification lock. Retaining a read-only localhost review host is intentional. Incomplete cleanup retains the independent safety guard and is reported as failure.

## Evidence and follow-up

Open `http://127.0.0.1:4311/` for the live summary. Files under the ignored `.local/production/ha/` folder include:

- `soak-active.json`: exact run IDs, deadlines, outcome, assessed windows/fragments, fault events, resource samples and cleanup.
- `soak-dd0ec67f-fa52-46af-934e-2d43864c1914-samples.ndjson`: the complete per-second metadata trace, plus fault evidence.
- `soak-watchdog-result.json`: independently armed/cleanup status.
- Timestamped earlier plans, if any, remain preserved.

The app follow-up `local-1080p30-sixty-minute-soak` checks this exact run every five minutes. It stays quiet while healthy, reports terminal results or required action, never starts/repeats/extends tests and pauses after its terminal report. A completed result requires the full hour, all four restored fault events, qualified steady windows and confirmed worker/SFU cleanup. The final result must still be read; preflight success and early healthy windows are not a soak pass.

Preflight: 299 local tests, type checking, targeted lint and checked native versions passed. No container image or deployment was built for this soak.

## Terminal result

The seventh steady window averaged **29.2067 fps** for distinct, decoded and presented frames, below the 29.5 floor, while staying at 1920 × 1080. Six preceding windows qualified. No scheduled crash or stall was reached, so none of the four long-soak fault tests is counted as performed.

The trace locates the first loss at the gateway sender: about **29.996 new captured frames/s**, but **29.207 sent/encoded frames/s**. Candidate input decoding remained about 30 fps. Packet-loss and presentation-drop counters did not increase during the failed window. The encoder reported no quality-limitation reason and macOS memory pressure remained normal. These observations narrow the investigation; they do not establish the underlying cause.

All six media workers and the SFU stopped. The independent watchdog reported `normal_cleanup_verified`. Only the read-only review host remains, and the follow-up heartbeat is paused. Recording and deployment remained disabled. The failed plan, full per-second trace and a derived `soak-failure-analysis.json` are preserved. No automatic replacement hour was started. The next step is to investigate gateway pacing/encoding before a fresh hour-long qualification.


## Authorized rerun after gateway sender fix

The user explicitly authorized a new hour after investigating the gateway sender. The encoder ceiling is now 60 fps while distinct-frame capture remains driven by the 30 fps candidate; see `local-fullhd-fast-failover.md` for the five-minute probe and measured limitations. The original 29.5 floor remains, with a new 30.5 upper bound against duplicate-frame inflation. The same four scheduled faults, full observation duration and independent hard deadline apply. The fresh run's IDs, start/end times and terminal outcome are authoritative in `soak-active.json`; this document does not declare the rerun passed.


## Fresh hour after explicit-frame capture fix

The encoder-headroom rerun also failed after 212.5 seconds at 29.4669 fps, before any scheduled fault. It remains archived. The next authorized rerun uses the explicit VideoFrame generator, following track-level evidence that canvas capture itself was losing requests and a completed five-minute qualification with short crash/stall checks. See the detailed capture/encode comparison in `local-fullhd-fast-failover.md`. The fresh hour retains all original quality, interruption and cleanup checks; its exact identity and outcome are read from `soak-active.json`. Neither previous failed hour is counted as passed.


## Completed explicit-frame hour — 27 October 2026

Run `3b2aac1e-9187-4c85-be51-a4d32bd6a440` / runtime `8ce95f84-cafd-42b9-a756-7b85b5115829` completed 3,600.214 observed seconds. It assessed 3,588.542 steady seconds, with 11.672 seconds excluded for planned fault/restoration scope and short fragments. All 115 complete steady windows passed at 1920×1080: distinct 29.8704–30.0368 fps, decoded 29.9372–30.0368, presented 29.9352–30.0368. Per-window p05 one-second distinct rates ranged 27.8607–29.9700; averages passed, not perfectly uniform every-second cadence.

| Fault minute | Kind | Picture gap | Recovery after injection |
| --- | --- | --- | --- |
| 10 | Stall, continuing heartbeat | 497 ms | 627 ms |
| 25 | Primary process crash | 90 ms | 129 ms |
| 40 | Stall, continuing heartbeat | 545 ms | 648 ms |
| 55 | Primary process crash | 131 ms | 147 ms |

All four restorations completed, preserving Program video/audio publications and fencing. No packet-loss or presentation-drop counter increase occurred across the steady sample trace; synthetic audio/freshness/provenance checks passed. Gateway writer max pending was one and max observed write time 1.1 ms. Minimum estimated reclaimable memory was 13.01 GiB with normal pressure throughout. Summed owned RSS grew 7.80→11.32 GiB; shared pages are double-counted, so this is not a leak diagnosis. Continued memory profiling remains appropriate.

All media workers and SFU stopped, independently verified against the exact runtime and watchdog `normal_cleanup_verified`. The read-only review host was retained until the next authorized test required its port. Metadata is preserved in `soak-passed-3b2aac1e-9187-4c85-be51-a4d32bd6a440.json` and the matching NDJSON. No media was recorded, no cloud resources or deployments used, and no earlier failed run was reclassified.

The user authorized conditional next stages of 3, 5 and 10 local receiving clients for this one producer Program. `production:ha:load` runs actual independently credentialed subscribe-only receivers sequentially, with a five-minute baseline plus a stall, crash and post-fault windows per stage. Each stage is bounded to ten minutes and stops escalation on failure. These are viewers of one Program, not independent producers or Zoom satellite-room capacity. Stage plans, samples, resources, ownership, deadlines and per-client recovery/FPS results are retained under `.local/production/ha/receiver-load/`; series status is `receiver-load-active.json`. All remaining work stays local and metadata-only.
