# Supabase / warm TAKE production release and bounded validation — 9 November 2026

## Release

With explicit approval, pushed `0ee048d79a071227f1415718fa4a29993a254cb3` to `codex/database-io-audit-20261108` and deployed that exact commit to existing Vercel project `webinar-app-lerb`. Deployment `dpl_EkwmySJg6EsqNVodMCNAdkggGvTe` is READY and owns `app.jupiter.events`. The normal production build passed. No Supabase migrations, compute upgrades, credentials, recording configuration or subscriptions changed. Runtime error/fatal log aggregation for the active measurement window 12:35:30–12:40:00 UTC was empty; earlier engine-status errors occurred during boot, when it was not yet reachable.

## Approval, ownership and safeguards

New approval: $0.75 total, at most 30 running minutes and 1 GB traffic on existing EC2 `i-00c2cf0d3c3a48b63` only. Local plan ID `92855863-fe0b-4cc6-9ae2-9ddbdf78b0c6`. Exact runtime `0e3cbd82-3619-4167-acf7-0fda3b07bd0b`, host PID1725, `/proc` start ticks1433. No Zoom meeting joins or recordings.

Verified the instance stopped before starting. Verified existing named AWS Scheduler guard before clicking Start engine: UTC stop13:01:24 (8:01:24 AM Eastern). Armed earlier guest stop13:00:24 and a whole-boot bidirectional 1,000,000,000-byte guard. Normal engine's earlier 20-minute runtime deadline was not extended. Saved room/source `desired_running` counts were zero; a temporary `/run` controller hold prevented SDK joins. Installed the approved relay `Before=` ordering and verified it with systemd-analyze. Installed runtime hashes matched release files; no running runtime sources were edited.

## Live functionality results

The original three-layer Preview was preserved. Temporarily added a looping copy of the existing baseline MP4 and test-tone audio, making a five-layer canvas containing video, PDF slide, graphic and audio. Restored the library's original Holding classification immediately after constructing the looping test copy. At the end removed both temporary layers and returned the original three-layer canvas to Program.

| TAKE | Control accepted | First displayed Program revision |
|---|---:|---:|
| Five-layer test canvas | 43 ms | 208 ms |
| Original canvas restored | 37 ms | 145 ms |

These are the live room's instrumented direct-CUT timings, including control and received-picture delay. They are two samples, not a latency percentile or a zero-latency claim. No file seek is performed by the new warm TAKE path. The prepared playhead is used; this changes former rewind-on-TAKE behavior.

Three separate assessed windows total **90.105 seconds** at1920×1080:

| Phase | Assessed seconds | Valid / decoded / presented fps | Minimum audio RMS |
|---|---:|---:|---:|
| Baseline | 30.101 | 29.9990 | 0.04569 |
| After primary picture stall and restoration | 30.000 | 30.0000 | 0.04603 |
| After primary process crash and restoration | 30.004 | 29.9960 | 0.04573 |

Total phase observation including bounded fault/recovery work:108.548 seconds. This is a short qualification, not an hour soak. Zero new invalid, duplicate, processor-discarded or presentation-dropped frames, no processing errors and no selection/provenance mismatches in assessed windows. Program audio/video publication SIDs stayed the same across both faults. Short-sample (~one-second) p05 rates: valid29.8805, decoded29.8507, presented28.9710; these preserve visible short-window variability rather than pretending every second was exactly30fps.

| Fault | Picture gap | First recovered picture after injection | Primary restored |
|---|---:|---:|---|
| Picture stall | 115 ms | 518 ms | Yes |
| Process crash | 67 ms | 70 ms | Yes |

Independent browser-source frame counters continued advancing for the looping copy across all three windows. The original one-shot clip reached its end and held its final frame; it is not counted as moving video. Asynchronous HTTP sender-report estimates were29.9176–30.0120 encoded fps, canvas/source-count estimates30.1550–30.4440fps; their clocks/report timings differ, so these are not exact capture-cadence measurements. Source report age in saved samples was at most776ms. Worker authority and outgoing decoder measurements were independent of sender HTTP stats. Static-slide/color/marker checks alone are not unique-content proof.

Audio was synthetic test-tone qualification, not real microphone or the silent MP4's file audio. Available host memory stayed10.50–10.91GiB. No whole-machine memory fix or CPU-capacity claim is made from this short test.

## Database results and disk warning

Matched counter window:12:36:18.046998–12:39:05.735 UTC, **167.688 seconds**, covering active media and fault work. `zoom_bridge_rooms`, `zoom_bridge_source`, `event_live_stage_state`, `event_live_rooms`, and `event_run_of_show` each had **zero inserts, updates and deletes**. Startup/operator writes outside this window are separate, legitimate activity. Room/source read counters each advanced80, consistent with retained healthy controller exchanges.

Profiles sequential scans advanced1,408, approximately8.40/s, versus approximately9.31/s in the prior active test. This is a project-wide observation with different open-console traffic, not an isolated causal before/after benchmark or a guaranteed10% saving. The new client code must load in older open consoles before its hidden-tab polling changes apply.

Database `blks_read` remained unchanged. Database-wide temporary files still grew **6,371,836 bytes** despite zero monitored broadcast writes. The Supabase infrastructure dashboard still reported **66% Disk IO Balance**, Nano compute and39.5MB database after the test. The app's redundant-write problem is addressed, but neither the physical disk warning nor the remaining temporary-file writer is established as resolved. No blanket index additions or compute upgrade are justified by these counters. Further attribution needs time-bounded statement/host swap/I/O telemetry; several host charts previously failed to load. Do not attribute current activity to the largest historical statement counter.

## Cleanup, limits and cost

The original Preview and Holding settings were restored; test audio and looping-copy layers removed; explicit Off Air completed. Last full traffic sample was942,598,284 bytes. The engine disconnected near the traffic bound during cleanup, and the final traffic counter could not be retrieved before SSH became unavailable. The traffic guard was armed, but exact final bytes and any shutdown overshoot are **unverified**; do not claim a measured final total below1GB.

A cleanup click encountered the shared button changing from Disconnect to Start as engine state changed, beginning a connection attempt. It was cancelled immediately and an explicit exact-instance EC2 stop was sent. No second media test, automatic retry or fault repetition was run. This interaction is preserved as a cleanup limitation, not hidden as a successful disconnect.

AWS independently confirmed `stopped`, so no EC2 test workers are running. The exact owned cloud schedule was removed only after stopped verification and checking its immutable deadline and instance target. Normal future automatic-start shutdown behavior remains. Temporary controller hold/network/guest guards were volatile `/run` configuration. Browser DOM showed both video elements paused with no attached streams; owned diagnostic/test tabs were closed. No local caffeinate process was created for this run.

**Graceful relay shutdown and application-level DeleteRoom cleanup could not be independently verified before the VM stopped.** The new ordering is installed, but its drain check remains unqualified. The stopped self-hosted SFU has no running rooms/processes; that is different from proving its graceful-stop result. Overall outcome is **functional checks passed; cleanup verification limited**, not an unconditional full pass.

Conservative incremental cost estimate with compute, traffic, release/functions and contingency reserves: **up to about$0.35**, within the approved$0.75 envelope, not a final invoice. Compute basis remains last verified$0.357/hour. Final traffic accounting is unavailable. No further paid run is authorized automatically.

Local ignored evidence: `.local/db-io-audit/priority-validation/` contains the exact plan, phase samples, database comparison, TAKE timings and review summary. Prior failed or limited runs remain unchanged.
