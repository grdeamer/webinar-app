# Phase 1: local production state and command contract

Status: implemented offline. No production integration or renderer is enabled.

## Scope

This is the first milestone of the Cloud Production Engine audit: establish the
production contract before changing how live media is generated or delivered.
The current Producer Room, existing `producer_take` RPC, attendee player, Egress,
production Supabase database and cloud infrastructure are unchanged.

The implementation has no new package dependency and does not read `.env` files.
It imports no Supabase, AWS or LiveKit clients. The standalone workbench is served
directly by Node, without starting Next.js or generating a Vercel deployment.

SQLite is an **offline adapter**, not a replacement for the proposed production
Postgres store. Passing these tests does not prove Postgres locking, production
authorization, media continuity, full-HD FPS, recording, or renderer failover.

`ProductionCommandGateway` is the async adapter boundary for read, commit and
ordered command replay. The local HTTP workbench uses it today. A future Supabase
adapter can implement it with asynchronous RPC calls. The synchronous transaction
callback in `ProductionStore` is an internal local testing seam, not a requirement
to hold a JavaScript transaction open around remote database requests.

## Run locally

Use Node 24 LTS with built-in `node:sqlite` (tested on 24.19.0):

```sh
npm run production:local
```

Open `http://127.0.0.1:4310`. An optional port can be supplied:

```sh
npm run production:local -- 4311
```

The local broadcast's state and command history are stored in
`.local/production/control.sqlite`. This directory is ignored by Git. Stop with
Ctrl+C; starting the server again restores the same snapshot and history.
The two initial logical cameras are example source definitions, not connected
cameras. The UI labels all controls and Program displays as state-only.

The workbench is intentionally bound to IPv4 loopback. Host, Origin and fetch-site
checks plus a custom JSON header reject ordinary cross-origin browser writes.
Its console identities are synthetic local identities, **not user authentication**.
Do not expose this server through a tunnel, reverse proxy, LAN interface or Vercel.
An authenticated production boundary remains required before production use.

## Contract and scope

`lib/production/contracts.ts` defines schema version 1. Every broadcast has:

- Explicit `broadcastId`, `eventId`, and nullable `sessionId`. A broadcast ID
  cannot be reused under another event/session. Concurrent sessions use different
  broadcast IDs; session-specific routes must not silently fall back to event state.
- A monotonically increasing **global revision** for accepted commands.
- Separate Preview and Program buses, each containing composition, audio and
  media playback intent.
- A registry of stable logical source definitions, separate from current
  participant identities and track SIDs.
- Versioned saved scene definitions, separate from active state.
- Desired lifecycle (`off-air` or `live`) and persisted transition intent.
- A server timestamp. Revision, not wall-clock time, orders commands.

The command request is:

```json
{
  "schemaVersion": 1,
  "scope": {
    "broadcastId": "local-phase1",
    "eventId": "local-event",
    "sessionId": "general-session"
  },
  "commandId": "a-client-generated-unique-id",
  "expectedRevision": 3,
  "command": { "type": "TAKE", "transition": { "type": "fade", "durationMs": 500 } }
}
```

The actor ID and authorized scope come from the server boundary, never from the
request body. A future production boundary must authenticate the operator, verify
event/session access and command-specific privileges before calling the service.
Automatic source bindings must come from a trusted source registry, not arbitrary
presenter-supplied participant metadata.

## Atomic command semantics

`commitProductionCommand` validates the entire request and then executes one
store transaction. The SQLite adapter uses `BEGIN IMMEDIATE` across reading the
snapshot, deduplicating commands, checking revision, updating the snapshot and
inserting the receipt. A failed receipt insert rolls the snapshot back.

Idempotency is scoped by broadcast and command ID. A canonical fingerprint
includes normalized request content and server actor identity. Identical retries
return the original receipt plus the **current** snapshot; they cannot double-TAKE
or roll a newer console back to an old snapshot. Reusing a command ID for different
content or another actor is rejected. Authorization is checked before looking up
an earlier receipt.

Every mutation requires an exact expected revision. A conflict changes neither
snapshot nor command log. The console must review the fresh snapshot and create
a new command deliberately; it must not silently replay stale intent. This global
CAS is deliberately conservative: source-binding updates can also conflict with
a producer edit. Finer per-domain revisions can be added later if contention
measurements justify them, without weakening TAKE's consistency.

## Commands

| Command | Effect |
| --- | --- |
| REGISTER_SOURCE | Adds a stable source ID, kind, label and missing-source policy. |
| BIND_SOURCE | Replaces the ephemeral participant/track binding; advances a persistent generation. |
| UNBIND_SOURCE | Removes only the expected generation; an old disconnect cannot clear a replacement. |
| SET_PREVIEW | Replaces Preview composition, preserving independent audio intent and resetting Preview playback anchors. |
| TAKE | Atomically clones committed Preview into Program and records the transition's previous Program, start time and target revision. Does not go live. |
| SET_AUDIO | Changes only the chosen bus's full audio intent: gain, mute, per-source gain/mute/solo. |
| SET_PLAYBACK | Sets a video/audio layer's position, server anchor time, pause and loop intent. |
| SAVE_SCENE | Saves a versioned Preview definition. Existing scene updates require its expected version. |
| LOAD_SCENE | Loads an exact saved version into Preview, without changing Program or restoring obsolete running clocks. |
| SET_LIVE | Changes desired lifecycle only; it does not assert outgoing media exists. |

Cut, fade, warp and curtain transition intentions are preserved by the contract;
**none is rendered in Phase 1**. The workbench exposes Cut and Fade as examples.
Phase 2's initial renderer only needs to implement the POC's supported transition.

## Logical sources and legacy scenes

Scenes store logical source IDs. Ephemeral identities and track SIDs live only in
the binding registry. Binding generations never reset after unbinding. Rejoining
a presenter therefore does not rewrite saved scenes or active Program.

An unassigned camera/screen layer is permitted as an explicit placeholder. A bound
live layer's source kind must match. Unknown references are rejected. Missing
source policy is state only in this phase; applying the actual slate/hold behavior
belongs to the renderer.

`importLegacyComposition` is a read-only bridge for existing Producer Room blocks.
It preserves their JSON visual properties (geometry, graphics, hidden state,
animation intent, etc.) and requires an explicit participant-to-logical-source map.
It does not invent stable IDs from connection UUIDs. Browser `blob:`/`data:` source
URLs are rejected because they cannot survive producer closure or another machine.
No runtime dual-write to the old and new state stores is introduced.

The TAKE behavior reuses the existing `producer_take` design: commit saved Preview
to Program transactionally, preserve independent live state and record the command.
The old RPC is not called from the offline adapter. When the production adapter is
implemented, extend/consolidate that transaction rather than issuing an old TAKE
and a separate new-state update. Mandatory versions and receipt deduplication must
be inside the same database lock.

## Timelines and acknowledgements

Playback intent stores a position and server anchor. `playbackPositionAt` restores
elapsed, paused or looping intent after reconnect/restart; duration is supplied
when a renderer has decoded asset metadata. `transitionProgressAt` reconstructs
progress instead of restarting a fade from zero. These are control-time helpers,
not claims of frame/sample accurate rendering or synchronized client clocks.

Saved scenes include composition and audio, not connection bindings, running
playback anchors, live lifecycle or renderer health. TAKE creates a deep snapshot;
subsequent Preview or saved-scene edits do not mutate Program.

The response separates committed command receipts from future engine observations.
`engine` is always `null` locally. `EngineObservation` defines applied/observed
revisions, generation, heartbeat and frame/audio counters for the later service.
There is deliberately no producer command for forging an engine acknowledgement.
Closing a console invokes no stop/off-air command.

## Verification and acceptance

```sh
node --experimental-strip-types --test tests/productionCommands.test.ts tests/productionPersistence.test.ts tests/productionWorkbench.test.ts
npm run typecheck
```

Tests cover stale producer conflicts, simultaneous independent SQLite connections,
simultaneous retry deduplication, atomic rollback on a log failure, restart recovery,
scope isolation, source generation safety, scene versions, audio independence,
timeline restoration, legacy property preservation, validation and localhost API
guards. Tests use temporary databases and loopback only; they do not load app env.

Manual two-console check:

1. Open the workbench in two separate tabs.
2. Turn off auto-refresh in the second tab.
3. Select Camera B and TAKE in the first tab.
4. Send a command from the stale second tab. It must show REVISION_CONFLICT.
5. Refresh that tab; inspect the committed Program and revision before retrying.
6. Stop and restart the local server. Program, audio and saved scenes must restore.

## Production adapter handoff (future work)

Keep Supabase/Postgres as durable production truth. A later adapter must enforce
the same conformance tests against real concurrent PostgreSQL sessions, authenticate
event/session access, protect tables with least-privilege grants/RLS, and commit
snapshot, command receipt and notification/outbox atomically. Notifications are a
wakeup hint; reconnecting clients replay revisions or fetch a current snapshot.
Use the Supabase CLI workflow when preparing an actual migration; no migration was
created or applied in this local milestone.

Only after explicit local/canary integration should the current Producer Room use
this contract. Cloud rendering, Program publication, actual audio processing,
recording, deployment and failover are later milestones. No Git push, Vercel build,
deployment or cloud resource is needed to review Phase 1.

## Related local implementation

The independent synthetic media engine is documented in [Phase 2 — local Program engine proof of concept](./phase-2-local-poc.md). Its database is separate from the Phase 1 workbench.

