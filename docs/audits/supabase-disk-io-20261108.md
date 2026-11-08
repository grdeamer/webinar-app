# Jupiter database I/O audit — 8 November 2026

## Evidence and limits

The historical counters do not establish the cause or timing of the current disk-budget warning. During a 211.436-second read-only sample, broadcast-table update counters did not advance; profiles gained 579 sequential scans (~2.74/s). Profiles has about 11 rows and existing ID/email indexes. The sampled statement statistics showed warm-buffer hits, not physical reads. This does not measure disk-credit consumption or prove the warning resolved.

Historical totals included event_live_rooms 3,138,621 updates, zoom_bridge_rooms 2,582,611, event_live_stage_state 1,242,248, zoom_bridge_source 986,524, and event_run_of_show 189,400. Database statistics reset in December 2025; individual activity dates cannot be inferred. Commit 10911b8 already replaced default room/stage upserts with read/insert initialization in August 2026. Those old SQL signatures remain in cumulative statistics.

## Ranked findings and implemented changes

| Priority / confidence | Entry point → operation | Trigger, frequency and idle behavior | Local fix and reliability boundary |
|---|---|---|---|
| High, confirmed | tools/zoom-bridge/controller.py → POST /api/zoom-bridge/agent → room/source updates | Exchange every 2s; unchanged stopped profiles were rewritten. Each controller repeats the work. | lib/zoom-bridge/observationWrites.ts skips unchanged inactive reports, retains active 2s last_seen heartbeats, avoids rewriting unchanged JSON, and uses revision/last_seen guards. Changed reports persist immediately. Native health checks and failure recovery remain. |
| High, confirmed | useLibraryProgram.ts → engineStatus → authenticated engine status route | A nonempty cue kept polling at 250ms indefinitely, even after Program confirmation. Per connected client. | statusPollCadence.ts restores 1500ms after confirmation; pending picture/cue stays fast. singleFlightRead.ts shares concurrent browser reads only, with no completed-response or cross-user cache. |
| Medium, confirmed | MissionControlClient autosave effect → routing/page.tsx saveRunOfShow → event_run_of_show upsert/revalidate | Mount and callback changes cause saves without edits. Recursive revalidation feedback is suspected, not proven. | lib/runOfShow/save.ts compares persisted cues, skips unchanged writes and revalidation. Actual edits retain existing persistence. Concurrent edits still have pre-existing last-write-wins behavior. |
| Medium, confirmed | ZoomBridgeConsole, ZoomSourcePanel, IoRuntimePanel → UI GETs | 3s/3s/15s per client; hidden consoles and failures caused unnecessary work. | visibilityPoll.ts pauses hidden UI reads, serializes polls, aborts cleanup and backs off failures with jitter. It is never used for media/authority leases. Producer metadata refreshes also share concurrent requests. |
| Medium, defensive | controller.py startup/exchange | Duplicate controllers on one host can duplicate work; distributed duplicates are a separate risk. | controller_lifecycle.py host-local lock; idle failed exchanges back off to 30s. Healthy and active exchanges remain 2s. EC2 installation requires a stopped-host maintenance update; do not start paid workers just to install it. |
| Lower, confirmed | stageState.ts updateEventLiveRoom/setEventLiveLayout; auto-director POST | Explicit settings submissions can rewrite unchanged state. | Skip no-op settings updates without changing authority or failure detection. Legacy lib/live/live/state.ts ensures now preserve existing state; no current callers found. |

## Whole-application review

See [access inventory](supabase-io-access-inventory.csv): search hits include timers, reads/writes, Realtime, heartbeats and cron patterns; they are not a count of bugs. ActivityTracker's 15s activity heartbeat, event presence, attendee presence, QA/chat polling, presenter polling and legacy Program renderer remain potential volume sources under audience load. They have distinct analytics/synchronization purposes; replacing them without workload and disconnect testing would be disruptive. Realtime subscriptions found in QA and refresh listeners have cleanup; private control tables must not be exposed to browsers merely to replace polling.

Authentication/profile reads in proxy.ts, requireAdmin.ts and eventTeamAccess.ts remain fresh. Middleware and route checks can duplicate lookups; no cross-request authorization cache was introduced. Live participant upsert helpers were found but no active callers or matching write growth were established. Local frame/runtime timers are RAM/loopback work, not per-frame Supabase operations. The only repository Vercel cron is daily cost refresh; no hosted Edge Functions or cron.job catalog were found in the audit.

## Operation reductions: estimates, not hosted measurements

* Three stopped rooms plus one stopped source at a 2s exchange previously generated up to 7,200 unchanged updates/hour. Once observations settle, the new API generates zero such idle updates; controller config reads remain (~3,600/hour for two reads/exchange).
* Confirmed Program status polling falls from 14,400 to 2,400 reads/hour per connected hook (83.3%). Including an independent 1.5s mixer poll, the illustrative combined total is 16,800 → 4,800 (71.4%) before in-flight sharing. Pending TAKE still polls quickly. Avoided repeated profile checks depend on the route and are not physical disk savings.
* Hidden UI polling falls to zero for these specific UI readers; active media and worker leases continue. Unchanged run-of-show saves avoid one upsert/revalidation but still perform a comparison read.
* Active source frame/audio counters remain persisted where the existing diagnostic contract requires them. Moving this telemetry to an ephemeral worker-owned channel needs review.

## Database migrations

All 28 foreign-key warnings were reviewed in [the FK review](supabase-io-foreign-key-review.csv). Most relevant tables are tiny; the 5,989-row assignment table already has selective component indexes. A local synthetic 6,000-row benchmark showed only ~0.001ms/~0.017ms median gains from two candidate composite indexes. These are synthetic timings, not hosted measurements. No blanket FK indexes are proposed.

Two guarded migrations are prepared: `20261108175623_optimize_profile_and_webinar_rls_initplans.sql` wraps auth.uid/auth.email in SELECT initplans while preserving the existing public roles and email-based webinar predicate; `20261108175643_remove_duplicate_general_session_presence_index.sql` removes only idx_gsp_room_last_seen after proving it matches the retained valid nonunique index and backs no constraint. Both abort on drift and use 2s lock/15s statement timeouts. The index change belongs in a quiet maintenance window. No grants or ownership rules broaden.

Other security advisories (including exposed tables without RLS and password-protection configuration) require a separate security review; broad policy changes are outside this performance fix.

## Verification and outstanding architecture concern

446 application tests passed; 36 applicable Python tests passed. Three Linux libswscale tests cannot run on this Mac. Typecheck passed. Full lint has the same 302 pre-existing errors/202 warnings as baseline, with zero new errors. Production compilation passed with actual previously cached font assets because the normal Google Fonts loader failed upstream. No application fonts were changed. Local in-memory PostgreSQL tests verified anonymous/two-user policy equivalence, initplans, drift rejection and guarded duplicate-index removal. No hosted media soak was run for this audit.

The database optimizations preserve cloud Program authority, failure detection, command fencing and worker cadence. However, existing library video/PPT/canvas publishing originates in the browser, and useLibraryProgram stop/unmount/error paths can stop inputs or issue off-air. Uninterrupted browser-owned input playback after producer disconnect is therefore NOT fully guaranteed by the existing system. This is a pre-existing architectural gap, not fixed by caching or weakening leases. Moving input ownership to cloud workers and separating operator detach from explicit off-air requires review and dedicated recovery testing. The new metadata polling cleanup does not stop Program, but that regression test is not an end-to-end browser-loss qualification.

## Rollout and follow-up

Release application changes without starting EC2 or enabling recording. Apply only reviewed guarded migrations during idle maintenance. Install the two controller files together later with the host stopped and permission for any paid validation. Then compare time-bounded table/statement deltas and actual disk IOPS/throughput against matched idle and active baselines; do not reset cumulative statistics. Validate reconnect, worker death and producer disconnect before claiming full broadcast independence. Keep Supabase for now: unnecessary work would follow a database migration, and no capacity evidence yet justifies replacing the platform.

## Online release verification

After explicit approval, both migrations were applied on 8 November and their hosted migration versions are reflected in the filenames. Verified unchanged policy roles/ownership semantics and the retained presence index; the RLS initplan and duplicate-index warnings cleared. Application commit 6f1f4f5 is READY on app.jupiter.events (deployment dpl_kRzyght1DZroabW5zTJyaedWhBQa). The normal Vercel production build passed, signed-out admin APIs returned 401, and the initial new-deployment error/fatal log scan was empty. No EC2 or media workers or recordings were started. The native controller files are committed but installation remains pending approved EC2 maintenance. Post-release physical I/O savings and authenticated media/reconnect behavior remain unmeasured.
