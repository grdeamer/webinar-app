# Phase 6 — local audience load and encoder profiles

This phase adds a bounded, reproducible audience load lab to the existing local Program engine. Nothing is pushed, deployed or provisioned. Production Vercel, Supabase, AWS and Zoom are not used. This is the **local portion** of Phase 6; regional delivery, intended production audience capacity and actual cloud costs remain unvalidated.

## What runs

Open the existing control workbench at `http://127.0.0.1:4310/`. The Audience load lab panel shows the requested encoder profile, the renderer's applied-profile confirmation, and measured results. Select a healthy, built-in synthetic Program with local Program audience delivery before testing. Uploaded assets and active recordings are rejected by the benchmark.

From the repository with Node 24:

```sh
npm run production:media
# In a separate terminal, after the local synthetic Program is healthy:
npm run production:scale:verify
```

The fixed plan measures 20 seconds after warmup for each stage:

| Profile | Independent audience receivers | Added HTTP control delay |
| --- | ---: | ---: |
| Standard | 1, then 2, then 4 | None |
| Balanced | 2 | None |
| Economy | 2 | None |
| Standard | 1 | 150 ms per control request |

Every receiver uses the same Program-only subscriber as the audience preview, with its own context, identity, token and WebRTC connection. Receivers share one owned Chrome process tree per stage. The process is closed between stages. They do not recompose source tracks, record, or play audio through speakers. Marker decoding uses an in-memory canvas; no frame files are saved.

The run is bounded to five minutes, four concurrent test receivers and 20-second measurement windows. Each audience lease independently expires after two minutes. Ctrl-C requests cleanup. A concurrent second harness is rejected by a local exclusive lock. On success or failure, the harness closes its contexts/browser and restores the starting encoder profile. The engine's existing 30-minute media deadline is not extended. A forcibly killed harness may leave the lock; inspect ownership before removing it rather than automatically starting another run.

## Encoder profiles

| Profile | Encoder size | Maximum FPS | Video bitrate cap |
| --- | --- | ---: | ---: |
| Standard | 1280 × 720 | 30 | 3 Mbps |
| Balanced | 1280 × 720 | 30 | 1.5 Mbps |
| Economy | 640 × 360 | 15 | 600 kbps |

Profiles apply to the single finished Program publication using the active WebRTC sender's encoding parameters. They do not change contribution sources or saved show compositions. Economy downsizes the encoded output, while the composition canvas remains 1280 × 720. This is profile selection, **not simultaneous adaptive bitrate layers**. Simulcast remains disabled.

Writes require the explicit local Phase 6 header, exact event scope and current runtime ID. Changes are rejected while recording or after the runtime stops. The panel distinguishes requested configuration from renderer confirmation. Caps are not claims of achieved resolution, bitrate or FPS.

## Measurements and safeguards

The ignored local file `.local/production/media/scale-verification.json` contains per-second metadata and stage summaries. Prior attempts are retained in timestamped JSON reports. It is also available through the local metadata link in the panel.

- Distinct synthetic marker FPS is separate from decoded frame-callback FPS. Duplicate markers do not count as new Program pictures.
- Received video bitrate, packet counters, jitter and freeze counters come from receiver WebRTC statistics. Packet and freeze deltas cover only the measured window. Audio is not included in the video bitrate.
- First-frame time is receiver startup to its first decoded picture, not source-to-screen latency.
- Track SID continuity and freshness are checked throughout. The benchmark rejects an encoder change, stale confirmation, stalled receiver or unexpected decoded dimensions.
- CPU is interval process CPU time divided by elapsed wall time for owned surviving processes; 100% means one CPU core. Summed RSS can double-count shared pages and is not unique physical memory.
- macOS safety uses normal kernel memory pressure plus at least 512 MiB of estimated available memory (free + inactive + speculative pages). Raw free RAM is retained separately. Inactive pages are potentially reclaimable, not guaranteed immediately available. Missing pressure/counter metadata fails closed. Other systems use their free-memory counter.

Two early attempts stopped under the original raw-free-RAM guard and cleaned up. A macOS query then showed normal pressure and substantial reclaimable memory. The guard was corrected to distinguish reclaimable availability from raw free pages; earlier attempts remain failed rather than being relabelled passes.

## What remains before a production scale claim

The 150 ms stage delays **HTTP delivery/bootstrap requests only**. WebRTC media packets are not delayed, shaped or dropped. It is not an Internet, packet-loss or regional-network simulation.

A later authorized cloud phase must use the built container image, multiple independent receiver hosts in actual regions, the intended audience count, sustained event-length motion/audio, real network loss/RTT measurements and regional egress billing. Increase fanout progressively and stop at defined CPU, memory, bandwidth, frame freshness and recovery thresholds. Verify audience reconnect and publication fencing under load. Optional HLS/IVS remains a separate transport decision, with its own latency and cost evidence.

For planning only, measured video Mbps × 0.45 gives decimal GB per receiver-hour. Multiply by audience size and duration for a video-only transfer projection. This excludes audio, protocol overhead, retransmissions, ingress/egress topology, compute and provider pricing; it is not an AWS invoice or capacity guarantee. No cloud spending was initiated for this phase.

## Measured local result — 27 October 2026

The final six-stage run completed in about 152 seconds, with 20.6–20.9 measured seconds per stage. Both receiver cleanup and restoration of the starting Standard profile were confirmed. These are short local observations, not a sustained 30 FPS qualification.

| Profile / receivers | Decoded size | Distinct Program FPS per receiver | Video Mbps per receiver | Owned CPU cores | Summed peak RSS |
| --- | --- | --- | --- | ---: | ---: |
| standard / 1 | 1280 × 720 | 26.80 | 1.221 | 1.12 | 6.96 GiB |
| standard / 2 | 1280 × 720 | 28.53 / 28.39 | 1.249 / 1.249 | 1.33 | 7.39 GiB |
| standard / 4 | 1280 × 720 | 29.96 / 29.87 / 29.96 / 29.82 | 1.192 / 1.193 / 1.193 / 1.194 | 1.78 | 8.26 GiB |
| balanced / 2 | 1280 × 720 | 29.57 / 29.85 | 1.214 / 1.214 | 1.37 | 7.42 GiB |
| economy / 2 | 640 × 360 | 15.03 / 15.03 | 0.179 / 0.179 | 1.05 | 7.34 GiB |
| standard / 1 / +150 ms HTTP | 1280 × 720 | 29.70 | 1.374 | 1.18 | 7.04 GiB |

All measured receiver windows reported zero packet-loss delta and zero freeze-counter delta. First decoded-picture startup ranged from 333 to 722 ms; the HTTP-delay stage measured 653 ms. The final run maintained normal macOS memory pressure and at least 13.88 GiB of the documented reclaimable-availability estimate. RSS includes the existing engine, SFU, sources and test receivers, with shared-page caveats.

The smaller stages running slower than the four-receiver stage demonstrate run-to-run/warmup variability. Do not infer that adding viewers improves performance, that 30 FPS is guaranteed, or that four local receivers establish a ten-room Zoom/AWS capacity. Balanced used about the same actual bitrate as Standard for this synthetic content; its lower cap alone does not prove a bandwidth saving. Economy measured approximately 179 kbps per receiver at 360p15.

The operator controls were also exercised independently: selecting Economy produced an observed 640 × 360 feed at about 15 FPS, then Standard was restored. Automated verification: 280 tests, TypeScript checking and targeted lint passed. No new recording or cloud deployment was created.
