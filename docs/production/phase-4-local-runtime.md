# Phase 4 — local runtime hardening and release preparation

The next local milestone is documented in [Phase 5 — audience and recording cutover preparation](./phase-5-local-delivery.md).

Implemented locally on October 26, 2026. This is the local preparation portion of the roadmap's first-release phase. It is **not** a production release, cloud deployment, commercial high-availability system or capacity certification.

No Git commit/push, Vercel build/deployment, AWS resource, production database access or Zoom join was performed. Public official image-registry metadata was read to pin container inputs; no images were deployed.

## Run and review

```sh
npm run production:preflight
npm run production:media
```

Open <http://127.0.0.1:4310> and expand **Runtime supervision / Phase 4**. It displays the recovery count, latest lifecycle event, explicit local fault controls and recording history. Source/fault tests can interrupt this local Program. They never operate the production receiver or Zoom satellites.

The native preflight checks the reviewed macOS/architecture profile, Node version, Chrome version/launcher hash, LiveKit version/binary hash and installed media dependency versions. The checked profile lives in `tools/production-local/release/native-runtime.json`. Dependency/browser drift fails the preflight rather than silently producing a release from a different runtime. It is a local reproducibility check, not a cryptographic vendor-signature or full browser-bundle attestation.

## Supervision and recovery

The watchdog distinguishes a process exit from media/decoder progress loss. Fresh heartbeats alone cannot hide frozen output. A worker gets a 15-second startup grace period; six seconds without fresh progress/heartbeat can trigger recovery. Configuration/asset errors with continuing frame progress remain visible degraded states and do not create restart loops.

Recovery is limited to two attempts per role in a rolling five-minute window and six attempts total per media session. Attempts have bounded backoff. Exceeding the automatic budget stops media with a failure reason. The session's original 30-minute deadline never moves. Intentional source pauses remain fallback tests, not automatic source restarts.

For renderer recovery, the host confirms that its old browser process has stopped and removes/verifies absence of the old Program participant through the **local** LiveKit API before starting the next generation. Failure to fence the old publisher stops media. The replacement rehydrates the committed SQLite state and receives a new role capability. This protects this single local host; it is not distributed leader fencing across machines.

An observer can recover without restarting the Program publisher. A source process exit replaces its publication under the same logical source ID; the new track creates a binding revision and new binding generation. Source progress can restart from a lower counter when its track SID changes. A LiveKit process exit stops the media run rather than blindly restarting the entire pipeline.

Only owned headless worker processes are signalled. Cleanup is bounded; the terminal report records whether all owned workers exited. Metadata events are retained in ignored `supervisor-events.ndjson` across host reconnects/restarts, while `runtime-report.json` is atomically replaced. Reports include Node host RSS/uptime, not process memory contents or a claim about aggregate Chromium/host CPU capacity.

## Credentials and local access

Every run creates a new signing secret and private LiveKit configuration in a private OS temporary directory. Clean shutdown removes that configuration. A hard OS/process crash can leave a private temporary directory; it does not make that run's secret valid for a new run. No production `.env` file is loaded.

Runtime role capabilities rotate on replacement and stop. Expired/stopped sessions reject reports and token issuance. Viewer/Preview tokens have at most two-minute TTLs; runtime tokens have at most ten-minute TTLs, both bounded by the session deadline. Publisher tokens cannot subscribe, and viewer tokens cannot publish. JWT expiration does not itself disconnect an existing WebRTC session; the runtime/monitor shutdown bounds remain responsible for closing connections. Signing-secret rotation during a live SFU run is not claimed.

Browser/SFU children inherit an explicit environment allowlist rather than all parent environment variables. Old renderer capabilities are rejected after rotation. A readiness check authenticates against the local SFU before workers start, so an unrelated/stale server on the port cannot be mistaken for this run.

The control server and media remain loopback-only. This remains a trusted single-user local workbench, not production operator authentication or an Internet-facing service.

## Recording reconciliation

Recording is still explicit opt-in and limited to the received Program. Phase 4 adds a flushed, atomically replaced local recording journal. A chunk is flushed before its ordered acknowledgement advances. A completed job records its byte count and SHA-256 digest; download and startup reconciliation check the file against that journal.

An interrupted in-progress recording becomes **failed** after a host restart. A renderer/observer interruption also fails the active recording; there is no silent resume or false continuous-recording claim. Completed jobs survive restarts and remain downloadable through recording history if their files still match. Altered, missing or truncated completed files fail closed. Failed partial files are retained locally for explicit review, not presented as completed recordings. Legacy files from before the journal are not automatically adopted as complete.

The journal holds at most 100 jobs, each with the existing 50 MB / three-minute bounds. Retained recordings and assets stay on this Mac until removed locally. Monitoring and the steady observation do not record. The automated runtime verifier deliberately starts one short **synthetic** recording before killing its renderer, so that the failed-recording path is exercised.

This is reconciliation of the local MediaRecorder provider. Production LiveKit Egress credentials, webhook/status reconciliation and storage are not integrated or verified in this local phase.

## Release artifact and container boundary

```sh
npm run production:release:local
```

This creates a content-addressed, integrity-checked source artifact beneath `.local/production/releases/<sha256>/`. Its manifest records exact source hashes and the native runtime profile. It excludes `.env`, user uploads, recordings, diagnostics, SSH keys, unrelated desktop changes and production configuration. Re-running the command verifies an existing matching artifact; tampering or runtime drift is rejected. This is integrity checking, not signed release provenance.

The prepared Dockerfile pins official Node 24.19.0, Playwright 1.62.1 Noble and LiveKit 1.13.9 image indices by verified SHA-256 digests. It uses `npm ci --ignore-scripts`, a non-root browser user, a loopback-only SFU and Chromium sandboxing. Its Docker-specific context allowlist prevents local media/environment files from entering the build context.

**Docker is absent on this Mac. No container image was built or run.** The manifest explicitly reports `containerImageBuilt: false` and `cloudDeployed: false`. Linux sandbox compatibility, container dependency/codec behavior and container resource limits remain unverified. Do not disable sandboxing or expand network access to conceal a failed container check.

When Docker is available, build from the generated artifact root, not an arbitrary repository directory:

```sh
docker build -f tools/production-local/release/Dockerfile -t jupiter-local-runtime:review .
docker run --rm --init --network none --read-only --tmpfs /tmp:rw,nosuid,nodev,size=1g --mount type=volume,src=jupiter-local-validation,dst=/work/.local --memory 4g --cpus 4 --pids-limit 512 jupiter-local-runtime:review
```

These are prepared validation commands, not commands run during this phase. The isolated container deliberately exposes no operator browser port; its internal metadata can be checked with `docker exec`. Native localhost remains the interactive review surface. The resource limits are validation candidates, not production sizing. No automatic restart policy is configured that could repeatedly renew the 30-minute session.

## Verification and release gates

```sh
npm run production:runtime:verify -- 300
```

The verifier exercises renderer process exit, a renderer freeze with continuing heartbeats, an independent observer freeze, a source exit/rebind, recording failure and then a five-minute healthy observation. Do not edit the local show or inject extra faults while this deterministic run is active. It never extends the session deadline. It saves argument-free metadata in `.local/production/media/runtime-verification.json`; an incomplete test is saved as failed rather than passed.

Unit/API tests cover restart budgets, stale media with fresh heartbeats, runtime drift/integrity rejection, capability rotation, publisher/viewer permissions, source rebinding, journal persistence and interrupted/tampered recordings. An actual graceful local host restart also preserved the failed recording's status and byte count. The repository suite passes 270 tests; typecheck and targeted lint are checked separately.

The completed native run exercised all four faults and then observed 301.001 healthy seconds at one unchanged applied/observed revision and generation. It decoded 8,867 distinct frames: **29.46 fps at 1280×720**, with individual reporting intervals from 24 to 31 fps, no additional restarts and recording off. Reporting-window counts above 30 are not proof of a higher media frame-rate target.

The renderer-exit picture gap was 2.429 seconds. The forced-stall picture gap was 15.377 seconds, including startup grace because the fault was injected soon after replacement. Observer recovery did not restart the Program publisher. Source recovery produced a new track/binding revision under the same logical ID. The deliberately interrupted 121,091-byte synthetic recording remained failed rather than being presented as complete. An earlier attempt correctly stopped on an outdated test expectation for that binding revision; only the corrected completed run is reported as passed.

These measurements do not establish Full HD, ten-room performance, sustained 30 fps, stable total Chromium memory, hour-long stability or seamless recovery. Node-only RSS is metadata, not aggregate worker resource accounting.

Production release is still gated by real-production rendering sign-off, a built/tested Linux image, production authentication/credential provisioning, Postgres authority, Egress integration and substantially longer representative load/failure tests. Attendee/recording cutover remains Phase 5 and has not been started. Existing production services and the previous AWS migration are untouched.
