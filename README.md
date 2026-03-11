# Webinar App Platform

Webinar App is a multi-surface event platform built with Next.js 16, React 18, TypeScript, Tailwind, and Supabase.

It currently supports three major experiences in one codebase:

- **Attendee experience**: event landing pages, lobby, webinar pages, class materials, sponsors, library, general session, and breakouts
- **Admin portal**: event setup, attendee imports, agenda editing, breakout management, general session controls, Q&A moderation, uploads, and analytics
- **Presenter / production tooling**: presenter dashboard, slide controls, lower panel assets, multiview, and general session runtime controls

## Main app areas

### Attendee-facing routes
- `/events/[slug]`
- `/events/[slug]/lobby`
- `/events/[slug]/breakouts`
- `/events/[slug]/library`
- `/events/[slug]/sponsors`
- `/events/[slug]/webinars/[webinarId]`
- `/general-session`
- `/my-webinars`
- `/webinars/[id]`

### Admin-facing routes
- `/login`
- `/admin/events`
- `/admin/events/[id]`
- `/admin/events/[id]/agenda`
- `/admin/events/[id]/breakouts`
- `/admin/events/[id]/import-attendees`
- `/admin/general-session`
- `/admin/general-session/qa`
- `/admin/analytics`

### Presenter / operator routes
- `/presenter`
- `/general-session/presenter`

## Stack

- Next.js 16 App Router
- React 18
- TypeScript
- Tailwind CSS
- Supabase database + storage
- Supabase SSR helpers for browser and server auth
- Framer Motion for UI motion
- HLS.js for stream playback

## Environment variables

Create a local `.env.local` with at least the following values:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
JWT_SECRET=
```

Optional values may be required depending on which features you are actively using, but the four values above are the core baseline.

## Supabase setup

Run the SQL files in `supabase/` that match the features you need:

- `supabase/events.sql`
- `supabase/general-session.sql`
- `supabase/presence.sql`
- `supabase/qa.sql`

You will also need the storage buckets used by the app, including any private bucket paths referenced by general session uploads and webinar materials.

## Auth model

### Admin auth
The admin surface uses an `admin_token` cookie. Write-capable admin API routes now explicitly validate that cookie server-side.

### Event / attendee auth
Attendee access is scoped through event and webinar flows backed by Supabase tables and cookies/session state in the app.

## Supabase helper layout

The Supabase helpers are now centered around three roles:

- `lib/supabase/admin.ts` — service-role server client
- `lib/supabase/client.ts` — browser client
- `lib/supabase/server.ts` — SSR server client

Canonical imports now point directly at `lib/supabase/admin.ts`, `lib/supabase/client.ts`, and `lib/supabase/server.ts`. Legacy wrapper files remain only as temporary compatibility shims and can be deleted once you are comfortable removing them.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm run set-admin
```

## Local development

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Recommended boot sequence for a fresh local clone

1. Install dependencies with `npm install`
2. Create `.env.local`
3. Run the required Supabase SQL files
4. Create any required storage buckets
5. Set or update the admin password with `npm run set-admin`
6. Start the app with `npm run dev`

## Current feature areas

### Event management
- event creation and editing
- agenda items
- breakout sessions
- sponsor management
- import attendees from CSV
- scaffold starter event content

### Webinar management
- webinar detail pages
- materials and agenda assets
- upload flows
- playback source configuration
- attendee assignment flows

### General session
- MP4 or stream-based playback
- theme settings
- slide uploads and push controls
- presenter key generation
- lower panel assets
- live viewers and kick controls
- multiview
- Q&A moderation

## Security and packaging notes

Do not share zips that contain:

- `.env.local`
- `.git`
- `.vercel`
- `__MACOSX`
- `.DS_Store`
- `*.tsbuildinfo`

This repackaged project intentionally excludes those items.

## Suggested next improvements

- add shared database row types generated from Supabase
- add smoke tests for admin login, attendee access, breakouts, and general session controls
- add audit logging for admin mutations
- centralize the event live-state model for general session vs breakout control
- continue replacing older compatibility imports with the consolidated Supabase helper paths


## Second-pass cleanup applied

This package also includes a second refactor pass that:

- normalizes most Supabase imports to the canonical helper paths
- removes route-local admin auth helpers in favor of a shared `requireAdmin()` check
- adds typed interfaces for general session settings, slide assets, Q&A rows, CSV rows, and event agenda / breakout payloads
- tightens several admin pages and API routes to reduce `any` usage


## Third-pass hardening

This package includes a third cleanup pass focused on attendee-facing routes and shared data typing.

Highlights:
- typed event user, sponsor, agenda, breakout, and assignment models in `lib/types.ts`
- reduced `any` usage in `app/my-webinars/page.tsx`, `app/events/[slug]/lobby/page.tsx`, and supporting auth/helpers
- exported `WebinarUIRow` from `components/MyWebinarsClient.tsx` so server-side prep stays type-safe
- kept compatibility shims for Supabase imports while continuing the migration toward `@/lib/supabase/*`

Recommended next pass:
- continue removing `any` in `app/events/[slug]/webinars/[webinarId]/page.tsx` and general-session admin UI
- add a small typed data-access layer for Supabase queries
- run `npm run typecheck` and `npm run lint` locally after installing dependencies


## Sixth pass live-state control

This pass adds a new `event_live_state` table and wiring for a real event control model.

What is included:
- admin live-state panel on `/admin/events/[id]`
- admin API route at `/api/admin/events/[id]/live-state`
- public event live-state route at `/api/events/[slug]/live-state`
- attendee-side optional force redirect via `components/EventLiveStateRedirect.tsx`
- SQL bootstrap file at `supabase/live-state.sql`

Run `supabase/live-state.sql` before testing the event routing controls locally.
