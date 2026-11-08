# Active Program database test — 8 November 2026

## Outcome

Completed with source-motion and shutdown limitations. Database write behavior, outgoing transport/audio and primary-compositor crash/stall recovery passed this short qualification. Continuous moving-video playback is **not qualified**: the file's decoded source-frame counter stayed at 1,368 during the assessed windows, consistent with a non-looping file reaching its end. Canvas generation and encoding continued at 30 FPS, which does not prove fresh moving video. Raw transport-only harness passes are preserved; they must not be described as a complete moving-video or hour-soak pass.

Approval: $0.75 total incremental cap, 30-minute original hard bound, 1 GB traffic. Existing EC2 i-00c2cf0d3c3a48b63 only; no new deployment, recording, Zoom joins, subscriptions, IAM or network access. Exact measured runtime b88beb48-f0db-4088-90b9-64fe26e9be19, host PID 1283. Metadata is retained privately under `.local/db-io-audit/active-broadcast/`.

## Media evidence

The live producer room used its existing video, slide and graphic, with the existing test-tone asset temporarily added. Two actual CUT/TAKE commands were accepted and independently confirmed: one with tone, and one restoring the original three-source canvas. Tone removal was verified by outgoing audio RMS returning to zero without replacing Program publications. The event was returned off air and test inputs disconnected.

Three harness phases recorded 208.768 seconds in total over a 247.807-second wall span. Six assessed windows cover 181.298 seconds. Inter-phase orchestration and planned fault/recovery scope are not counted as steady delivery.

| Phase | Assessed seconds | Valid/decoded FPS | Presented FPS | Audio minimum RMS |
|---|---:|---:|---:|---:|
| Baseline | 60.099 | 30.0000–30.0010 | 30.0000–30.0010 | 0.04417 |
| After stall/restoration | 60.100 | 30.0000–30.0332 | 30.0000–30.0332 | 0.04594 |
| After crash/restoration | 61.099 | 29.9990–30.0020 | 29.9668–30.0352 | 0.04596 |

All windows were 1920×1080. One-second sampled p05 rates were 29.47 valid/decoded and 29.03 presented; these shorter samples fluctuate more than the required 30-second windows. Publications stayed unchanged, selection mismatch counters remained zero and no observer processing error was reported. These marker/provenance checks do not establish unique content on static layers or a finished video.

The browser canvas publisher encoded about 30.008–30.019 FPS across phases; the gateway encoded about 30.000–30.001 FPS. All 187 recorded source-stat samples were within 2.5 seconds of their report timestamp. Those fresh aggregate statistics still contained a non-advancing file-source counter: transport progress and content freshness are separate requirements.

| Fault | Picture gap | First replacement picture after injection | Result |
|---|---:|---:|---|
| Primary picture stall | 398 ms | 596 ms | Standby selected, audio present, warm primary restored |
| Primary process crash | 69 ms | 89 ms | Standby selected, audio present, primary restarted/restored |

This tests compositor-process failover on one EC2 host, not EC2-node failure, external Zoom delivery or producer-browser disconnection.

## Database evidence

Counter window: 20:09:27.393728–20:13:53.581255 UTC (15:09:27–15:13:53 Eastern), 266.188 seconds. Snapshots bracket orchestration as well as each media phase.

| Phase | Counter interval | Updates to monitored broadcast tables |
|---|---:|---:|
| Steady baseline | 86.946 s | 0 |
| Stall and recovery | 87.492 s | 0 |
| Crash and recovery | 91.749 s | 0 |

`zoom_bridge_rooms`, `zoom_bridge_source`, `event_live_stage_state`, `event_live_rooms` and `event_run_of_show` had zero inserts, updates and deletes throughout these intervals. The startup-to-baseline interval had six room updates, two source updates and one stage update; those are reported separately from steady activity. Shared-host startup explicitly clears saved Connect requests/revisions, and changed observations are persisted, so initial/control transitions are expected to write. The off-air cleanup also changes event state.

Configuration reads continued: room/source sequential-scan counters advanced 128/127 during the 266.188 seconds, consistent with retained two-second controller exchange. Profiles added 2,479 sequential scans (~9.31/s) across all open consoles and active control traffic. This is not attributable to one browser or route from table counters alone. The profiles table is tiny and ID/email indexes already exist; scan counts are not physical disk reads. Fresh authorization was not weakened for this test. Request attribution/coalescing and nonessential telemetry cadence remain follow-ups.

Database-wide sample 20:09:57.298535–20:14:00.354418 UTC: no additional shared-buffer block reads, inserts, updates, deletes or deadlocks; 66,948 buffer hits; **19,039,908 additional temporary bytes**. This is not proof of restored Supabase disk credits or zero disk writes. Cumulative top temporary-spill statements included function-catalog/dashboard introspection and diagnostic `pg_stat_statements` queries. Without matching start/end per-statement deltas, those historical totals do not establish which query caused the current 19 MB. Further diagnosis must account for the measurement queries' own overhead and avoid repeated broad statement-text scans. No live database tuning was applied.

## Setup, resources and cleanup

An initial setup run 790b5459-628e-42b8-8be9-62d95a9ca696 was stopped before broadcasting because the operator armed a test-specific cloud schedule while the application requires its normal named schedule. The app failed closed. Setup was corrected at the **same original 20:33:28 UTC deadline**, without a release, deadline extension or repeat of a failed broadcast measurement. The interruption remains recorded separately and its cost is included.

Independent cloud stop was verified before paid start; an earlier guest poweroff, 1 GB network guard and temporary SDK join hold were installed. At resource samples, producer cgroup memory grew from ~4.35 to ~4.78 GB, with ~11.19 GB machine memory available at the last active sample. Summed RSS (~5.89→6.34 GB) includes shared pages and is not additive physical memory. These few samples do not qualify long-term memory behavior.

Final second-boot interface bytes were 767,902,568. Including the initial setup boot's 32,670,982 gives a conservative ~800.6 MB total, below the 1 GB cap. The test-tone layer was removed, the original canvas taken back, and input capture disconnected. Exact-runtime Stop returned no failure with zero workers; its hosted room deletion completes before that result. All recorded producer-cgroup PIDs, replacement workers and media processes were subsequently absent. Producer/controller/converter/audio/display/network-guard services were stopped and the temporary controller override removed.

The self-hosted relay service recorded `Result=timeout` during graceful shutdown; its MainPID was zero and no relay process remained. This is preserved as a cleanup-quality issue rather than described as normal graceful termination. Review drain behavior versus the systemd stop timeout before another qualification.

AWS verified EC2 stopped after the 20:17:46 UTC stop request. Both completed test schedules were removed only after stopped-state verification, permitting normal future app starts to arm a fresh shutdown. Saved event `is_live=false`, source Connect requests zero and satellite Connect requests zero were independently checked. Normal startup configuration and credentials were preserved.

Conservative compute upper estimate ~ $0.10, using the entire first-start-to-final-verification wall span (including downtime). Total estimate including network and request reserves <= $0.30, under the $0.75 cap; this is not a final invoice and existing standby charges are unchanged. No paid billing queries were made.

## Recommended next steps

1. Explicitly loop the test video and fail the harness if per-video source-frame counters stop advancing; then seek approval before another paid moving-video run.
2. Review relay graceful drain/stop timeout without changing broadcast continuity guarantees.
3. Attribute active auth/profile reads by request and examine safe coalescing/telemetry reductions; retain real leases and fresh authorization.
4. Isolate database temporary-file growth with bounded, low-overhead measurements. Do not infer a current cause from cumulative catalog/diagnostic totals.
