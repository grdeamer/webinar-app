# Prepared CUT path

This profile is off by default. It reuses the existing EC2 receiver and HTTPS
`/control` endpoint; no new instance, port, subscription, IAM or relay key.

The existing authenticated Vercel route checks the signed-in user's current event
permissions and session before asking the worker for a five-second grant. The
worker binds the grant to that origin, actor, run, exact Preview composition,
source track and revision. It independently requires the current file-input
lease plus fresh matching decoder evidence from both candidates at issuance and
again at commit. It can commit one CUT and enable the already-running private
Program output. It cannot start EC2, edit a mix, join a meeting or record.

The browser prepares the connection while Preview is being cued. Clicking TAKE
sends one text/plain POST with the grant in its body; no cookies, URL credentials
or redirects. The worker compares revisions atomically. Duplicate acknowledgments
return the same receipt; network uncertainty never causes an automatic second
TAKE. Background/expired clients must rearm readiness.

Candidate state notifications and revision-change reports remove timer waits.
The gateway still requires its own newly decoded marker, current authority and
an unexpired lease. Buffering hints request the minimum browser-supported delay;
native buffering remains the fallback. File-input rehearsals omit the two unused
synthetic demo workers. Primary, standby, gateway and observer remain separate
processes. Normal deadlines, frame limits, recording-off and fencing are retained.

## Activation, after explicit access/cost approval

Install the checked runtime bundle on the marked existing host with independent
cloud shutdown already armed. Preserve its keys, settings and full meeting join
hold. Add a root-owned service drop-in containing only:

```
[Service]
Environment=PRODUCER_ENGINE_LOW_LATENCY_CONTROL=1
Environment=PRODUCER_ENGINE_DIRECT_TAKE_ORIGINS=https://app.jupiter.events
```

Do not append wildcard origins or bypass event authorization. Restart only the
producer service within its original approved deadline; never extend the test.
Use a traffic/deadline guard for the newly approved cost envelope. Update the
matching website build, then measure first and subsequent prepared CUTs against
actual presented Program revisions, and test crash/stall recovery. Stop all
owned workers, converter, relay and EC2 after validation, including failure.

Local check: start a separate dev server on `127.0.0.1:3008`, then run
`node --experimental-strip-types scripts/verify-producer-low-latency-local.ts`.
The local qualification has an eight-minute immutable deadline and independent
PID-birth watchdog. It fails on memory pressure and retains failures. Its target
is p95 <=200 ms from TAKE to the first matching 1080p Program frame, steady
29.5–30.5 valid/decoded/presented FPS, both faults below one second, audio, stable
publications and verified cleanup. This is a short qualification, not an hour
soak. A local result does not prove hosted latency.

Rollback: disable the two profile variables and restore the prior checked runtime
if needed. The website detects feature support and retains the prior signed
proxy path against a worker where the feature is disabled. Do not retain paid
workers merely to preserve a failed test.
