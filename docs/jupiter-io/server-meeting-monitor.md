# Server-side Zoom monitor: one-meeting qualification

Prepared 16 November 2026. Source only; the Linux receiver has not yet joined a
real meeting. The operator has authorized building a server monitor and using
the first privately supplied meeting link. That link is not in these files.

## Architecture

An unprivileged, sandboxed server Chromium joins Zoom's own web client as
“Jupiter Monitor”. Io receives its visible view as bounded latest JPEGs through
the existing host-pinned restricted SSH gateway. This is the Zoom web-client
view, not the native desktop client's UI and not SDK raw recording.

The administrator-only same-origin POST accepts a Zoom join link, passes it
through SSH stdin to a private 0600 Unix socket, and returns a session identity.
No credentials appear in process arguments or files. One active meeting is
allowed; another session cannot replace it or stop it. The GET preview endpoint
requires administrator access and rejects cross-site requests. Media is not
sent through Supabase, object storage or a recording API.

Camera/microphone capture APIs are denied. This first prototype is visual-only;
it does not join computer audio or provide server audio listening. Explicit
terms/verification/sign-in states pause automated joining. Host admission may
still be required. No CAPTCHA bypass, account sign-in, recording privilege,
meeting administration, sharing or Program publishing is implemented.

One Join click is attempted; a rejected, expired or failed session is not
silently retried. A screenshot alone is not labelled connected. A waiting-room
message takes precedence over the presence of a Leave button.

## Bounds

* Hard meeting deadline: 15 minutes, never extended by reconnects.
* Viewer lease: 30 seconds; keep the monitoring page open during qualification.
* Latest frame only, 500,000 bytes maximum; older than 5 seconds is unavailable.
* 1280×720, at most two captures/second; browser requests about one frame/second.
* Host traffic delta: stop the receiver at 1.5 GB in + out, or on counter reset.
* Browser temporary profiles live in the service's private /run directory.
* MemoryMax=2G, TasksMax=256, no core dumps, entire cgroup killed on service stop.
* Existing shared EC2 startup requires its independently verified 30-minute
  cloud shutdown. No new instance, disk, IP, inbound port or security group.

The traffic guard includes other host traffic; it deliberately stops rather
than undercounting a shared host. This is an experimental receiver, not a
qualified capacity claim or provider invoice guarantee.

## Installation and activation

Do not install a background browser in Vercel Functions. Install these files on
the existing Ubuntu EC2 host, after a separately bounded paid start is approved.

1. Confirm the exact instance and type before startup. Start through the existing
   authenticated Io runtime control, which verifies its non-renewable cloud stop.
2. Transfer this directory and run `sudo bash install.sh --install` there.
   The installer uses PyPI Playwright 1.62.0 and the existing root-owned Chromium with its
   already installed sandbox profile, adds the
   private service and patches only the existing forced-command dispatch.
3. Confirm service active, socket mode 0600, unprivileged sandbox launch, original
   snapshot/multiview commands intact, and no meeting/browser active yet.
4. Deploy the route/UI and set production `JUPITER_IO_SERVER_MONITOR_ENABLED=true`
   only after the service is verified. This flag grants no additional access.
5. Enter the user's first join link in `/admin/jupiter-io/returns`. Start the
   monitor once. Have its host admit “Jupiter Monitor” if necessary.
6. Verify participant/shared-screen return, changing frames, native-app join link,
   receive-only state, stop, lease expiry and browser cleanup. Do not claim live
   success from the mocked lifecycle tests alone.
7. Stop the monitor, confirm its browser processes are gone, and stop the EC2
   instance. Keep the independently armed cloud stop schedule in place.

## Proposed first-test allowance

Prior verified c7i.2xlarge Linux rate: $0.357/hour (14 November); refresh the exact
instance/type/rate before paid startup. Thirty minutes compute = $0.17850. At
most 1.5 GB monitored host traffic conservatively priced entirely as internet
outbound at $0.09/GB = $0.135. Existing disk/IP time and a $0.05 control reserve
bring the estimated run below $0.40 before tax/contingency. Proposed allowance:
$1 total for one 30-minute server session, including installation, a maximum
15-minute meeting monitor and cleanup. No new licenses or recurring resources.
If installation cannot fit, stop rather than extending the cloud deadline.

## Evidence so far

Eight local protocol/lifecycle tests pass. The real server browser, Zoom
admission, visible returned meeting and installed sandbox are not yet qualified.
