# Webinar App Architecture

## Platform shape

The app now has four major layers:

1. attendee event experience
2. admin control room
3. presenter and general-session tooling
4. app-layer business logic under `lib/app/*`

## New live-state control system

The sixth pass adds a canonical `event_live_state` table and routes so each event can advertise one active destination.

Modes:
- `lobby`
- `general_session`
- `breakout`
- `replay`
- `off_air`

The control flow is:

- admin updates live state from `/admin/events/[id]`
- event pages call `/api/events/[slug]/live-state`
- attendee pages can optionally auto-redirect when `force_redirect = true`

## Recommended long-term shape

- `lib/app/auth.ts`
- `lib/app/events.ts`
- `lib/app/webinars.ts`
- `lib/app/generalSession.ts`
- `lib/app/qa.ts`
- `lib/app/liveState.ts`
- `lib/app/analytics.ts`
- `lib/app/audit.ts`

## Next major moves

- add audit logging for admin mutations
- move more event CRUD into app-layer functions
- unify general-session control around the same live-state model
- add attendee analytics tied to event routing decisions
