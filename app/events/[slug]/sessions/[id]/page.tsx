import Link from "next/link"
import { notFound } from "next/navigation"
import EventEmailGate from "../../EventEmailGate"
import AttendeePresenceHeartbeat from "@/components/AttendeePresenceHeartbeat"
import AttendeeQASubmitBox from "@/components/qa/AttendeeQASubmitBox"
import SessionLiveRedirectWatcher from "@/components/live/SessionLiveRedirectWatcher"
import SessionStagePlayer from "@/components/live/SessionStagePlayer"
import { getEventBySlug } from "@/lib/events"
import {
  getSessionCapability,
  getSessionPrimaryExperience,
  isGeneralSession,
  type AppSession,
} from "@/lib/domain/sessions"
import { getSessionById } from "@/lib/repos/sessionsRepo"
import { buildEventViewerContext } from "@/lib/services/events/buildEventViewerContext"
import { resolveSessionExperience } from "@/lib/services/sessions/resolveSessionExperience"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function formatTimeRange(start?: string | null, end?: string | null) {
  if (!start && !end) return null

  const format = (value?: string | null) => {
    if (!value) return ""
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return ""
    return d.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  }

  return [format(start), format(end)].filter(Boolean).join(" • ")
}

function formatKindLabel(kind?: string | null) {
  if (!kind) return null
  return kind.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatVisibilityLabel(mode?: string | null) {
  if (!mode) return "—"
  if (mode === "all") return "All"
  if (mode === "public") return "Public"
  if (mode === "registered") return "Registered"
  if (mode === "assigned") return "Assigned"
  if (mode === "hidden") return "Hidden"
  return mode
}

function formatDeliveryLabel(mode?: string | null) {
  if (!mode) return "—"
  if (mode === "livekit") return "LiveKit"
  if (mode === "rtmp") return "RTMP"
  if (mode === "video") return "Video"
  if (mode === "external") return "External"
  return mode
}

function StatusBadge({ status }: { status?: string | null }) {
  const label =
    status === "live"
      ? "Live"
      : status === "paused"
        ? "Paused"
        : status === "ended"
          ? "Ended"
          : status === "scheduled"
            ? "Scheduled"
            : "Holding"

  const tone =
    status === "live"
      ? "border-red-400/20 bg-red-500/15 text-red-100"
      : status === "paused"
        ? "border-amber-400/20 bg-amber-400/10 text-amber-100"
        : "border-white/10 bg-white/5 text-white/75"

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] ${tone}`}
    >
      {label}
    </span>
  )
}

function MetaPill({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
      <span className="text-white/40">{label}:</span> {value}
    </div>
  )
}

function ExternalSessionPanel({ session }: { session: AppSession }) {
  const href = session.externalJoinUrl || session.joinLink || null
  const platform = session.externalPlatform || "custom"

  const platformLabel =
    platform === "zoom"
      ? "Join via Zoom"
      : platform === "teams"
        ? "Join via Microsoft Teams"
        : platform === "webex"
          ? "Join via Webex"
          : "Join session"

  const platformStyles =
    platform === "zoom"
      ? "bg-sky-600 text-white hover:bg-sky-500"
      : platform === "teams"
        ? "bg-indigo-600 text-white hover:bg-indigo-500"
        : platform === "webex"
          ? "bg-emerald-600 text-white hover:bg-emerald-500"
          : "bg-white text-slate-950 hover:bg-slate-100"

  const platformDetail =
    platform === "zoom"
      ? " via Zoom"
      : platform === "teams"
        ? " via Microsoft Teams"
        : platform === "webex"
          ? " via Webex"
          : session.externalPlatform
            ? ` via ${session.externalPlatform}`
            : ""

  return (
    <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(2,6,23,0.96))] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.35)]">
      <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">
        External Session
      </div>

      <h2 className="mt-3 text-2xl font-semibold text-white">
        Join session externally
      </h2>

      <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
        This session is hosted externally{platformDetail}. You will briefly leave
        the Jupiter event experience and join on the destination platform.
      </p>

      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={`mt-6 inline-flex rounded-2xl px-5 py-3 text-sm font-semibold transition ${platformStyles}`}
        >
          {platformLabel} ↗
        </a>
      ) : (
        <div className="mt-6 inline-flex rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-sm text-white/45">
          Join link coming soon
        </div>
      )}
    </div>
  )
}

function VideoSessionPanel({ session }: { session: AppSession }) {
  const mp4Url = session.playbackMp4Url
  const hlsUrl = session.playbackM3u8Url

  return (
    <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(2,6,23,0.96))] p-4 shadow-[0_30px_100px_rgba(0,0,0,0.35)]">
      {mp4Url ? (
        <video
          src={mp4Url}
          controls
          playsInline
          className="aspect-video w-full rounded-[22px] bg-black"
        />
      ) : hlsUrl ? (
        <div className="flex aspect-video w-full items-center justify-center rounded-[22px] bg-black text-sm text-white/55">
          HLS source detected
        </div>
      ) : (
        <div className="flex aspect-video w-full items-center justify-center rounded-[22px] bg-black text-sm text-white/55">
          No video source configured yet
        </div>
      )}
    </div>
  )
}

function LiveKitSessionPanel({
  slug,
  session,
}: {
  slug: string
  session: AppSession
}) {
  return (
    <SessionStagePlayer
      tokenEndpoint={`/api/events/${slug}/sessions/${session.id}/live/token`}
      stageEndpoint={`/api/events/${slug}/sessions/${session.id}/stage`}
    />
  )
}

function RtmpSessionPanel() {
  return (
    <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(2,6,23,0.96))] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.35)]">
      <div className="flex aspect-video w-full items-center justify-center rounded-[22px] bg-black text-sm text-white/55">
        RTMP session configured
      </div>
    </div>
  )
}

function AccessDeniedPanel({
  slug,
  session,
  sessionId,
  reason,
}: {
  slug: string
  session: AppSession
  sessionId: string
  reason: "not_assigned" | "hidden" | "not_registered"
}) {
  const title =
    reason === "not_assigned"
      ? "This session is not assigned to you"
      : reason === "hidden"
        ? "This session is not currently available"
        : "You do not have access to this session"

  const body =
    reason === "not_assigned"
      ? "Your registration is valid, but this session is not part of your assigned schedule."
      : reason === "hidden"
        ? "This session exists, but it is hidden from attendee access right now."
        : "Please contact the event team if you believe you should be able to access it."

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <SessionLiveRedirectWatcher slug={slug} sessionId={sessionId} />

      <div className="relative mx-auto max-w-3xl px-6 py-20">
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[36px]">
          <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />
          <div className="absolute right-0 top-10 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl" />
        </div>

        <div className="relative rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,0.96))] p-8 shadow-[0_30px_100px_rgba(0,0,0,0.45)]">
          <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">
            Session Access
          </div>

          <h1 className="mt-4 text-3xl font-semibold">{title}</h1>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/65">
            {body}
          </p>

          <div className="mt-4 text-sm text-white/45">{session.title}</div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={`/events/${slug}/sessions`}
              className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950"
            >
              Back to sessions
            </Link>

            <Link
              href={`/events/${slug}`}
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white"
            >
              Back to event
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default async function EventSessionPage(props: {
  params: Promise<{ slug: string; id: string }>
}) {
  const { slug, id } = await props.params

  const event = await getEventBySlug(slug)
  if (!event) notFound()

  const session = await getSessionById(event.id, id)
  if (!session) notFound()

  const viewer = await buildEventViewerContext(slug, event.id)
  const experience = resolveSessionExperience(session, viewer)
  const capability = getSessionCapability(session)
  const primaryExperience = getSessionPrimaryExperience(session)

  const attendeeUserId =
    typeof (viewer as any)?.id === "string"
      ? (viewer as any).id
      : typeof (viewer as any)?.userId === "string"
        ? (viewer as any).userId
        : typeof (viewer as any)?.user_id === "string"
          ? (viewer as any).user_id
          : typeof (viewer as any)?.user?.id === "string"
            ? (viewer as any).user.id
            : typeof (viewer as any)?.attendee?.user_id === "string"
              ? (viewer as any).attendee.user_id
              : null

  const attendeeEmail =
    typeof (viewer as any)?.email === "string"
      ? (viewer as any).email
      : typeof (viewer as any)?.user?.email === "string"
        ? (viewer as any).user.email
        : typeof (viewer as any)?.attendee?.email === "string"
          ? (viewer as any).attendee.email
          : null

  if (!experience.access.canView) {
    if (experience.access.reason === "login_required") {
      return (
        <div className="min-h-screen bg-slate-950 text-white">
          <div className="relative mx-auto max-w-3xl px-6 py-20">
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[36px]">
              <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />
              <div className="absolute right-0 top-10 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl" />
            </div>

            <div className="relative rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,0.96))] p-8 shadow-[0_30px_100px_rgba(0,0,0,0.45)]">
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">
                {event.title}
              </div>

              <h1 className="mt-4 text-3xl font-semibold">{session.title}</h1>

              <p className="mt-3 text-sm text-white/60">
                Enter your email to access this session.
              </p>

              <div className="mt-8">
                <EventEmailGate slug={slug} />
              </div>
            </div>
          </div>
        </div>
      )
    }

    if (
      experience.access.reason === "not_assigned" ||
      experience.access.reason === "hidden" ||
      experience.access.reason === "not_registered"
    ) {
      return (
        <AccessDeniedPanel
          slug={slug}
          session={session}
          sessionId={id}
          reason={experience.access.reason}
        />
      )
    }
  }

  const timeRange = formatTimeRange(session.startsAt, session.endsAt)
  const sessionKindLabel = formatKindLabel(session.kind)

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <SessionLiveRedirectWatcher slug={slug} sessionId={session.id} />

      {attendeeUserId ? (
        <AttendeePresenceHeartbeat eventId={event.id} userId={attendeeUserId} />
      ) : null}

      <div className="relative mx-auto max-w-7xl px-6 py-10">
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[40px]">
          <div className="absolute -left-24 top-0 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl" />
          <div className="absolute right-0 top-16 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
        </div>

        <div className="relative">
          <div className="mb-6 flex items-center justify-between gap-4">
            <Link
              href={`/events/${slug}/sessions`}
              className="text-sm text-sky-200 hover:text-sky-100"
            >
              ← Back to sessions
            </Link>

            <div className="text-[11px] uppercase tracking-[0.22em] text-white/35">
              Jupiter Broadcast
            </div>
          </div>

          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-6">
              <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,0.96))] p-7 shadow-[0_30px_100px_rgba(0,0,0,0.45)]">
                <div className="flex flex-wrap items-center gap-3">
                  <StatusBadge status={experience.runtime.status} />

                  {isGeneralSession(session) ? (
                    <span className="inline-flex rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-sky-200">
                      Main Stage
                    </span>
                  ) : null}

                  <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-white/70">
                    {primaryExperience}
                  </span>
                </div>

                <h1 className="mt-5 text-4xl font-semibold tracking-tight">
                  {session.title}
                </h1>

                {session.description ? (
                  <p className="mt-4 max-w-3xl text-sm leading-7 text-white/65">
                    {session.description}
                  </p>
                ) : null}

                <div className="mt-5 flex flex-wrap gap-2">
                  {timeRange ? <MetaPill label="Time" value={timeRange} /> : null}
                  {session.speakerName ? (
                    <MetaPill label="Speaker" value={session.speakerName} />
                  ) : null}
                  {sessionKindLabel ? (
                    <MetaPill label="Type" value={sessionKindLabel} />
                  ) : null}
                </div>
              </div>

              <div className="space-y-4">
                {primaryExperience === "live" && (
                  <LiveKitSessionPanel slug={slug} session={session} />
                )}

                {primaryExperience === "playback" && (
                  <VideoSessionPanel session={session} />
                )}

                {session.deliveryMode === "rtmp" && primaryExperience === "details" && (
                  <RtmpSessionPanel />
                )}

                {primaryExperience === "external" && (
                  <ExternalSessionPanel session={session} />
                )}

                {primaryExperience === "details" &&
                  session.deliveryMode !== "rtmp" &&
                  !capability.external && (
                    <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(2,6,23,0.96))] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.35)]">
                      <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">
                        Session Details
                      </div>
                      <h2 className="mt-3 text-2xl font-semibold text-white">
                        Session content coming soon
                      </h2>
                      <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
                        This session exists in the schedule, but no primary live, playback,
                        or external experience is configured yet.
                      </p>
                    </div>
                  )}

                {capability.qa ? (
                  <AttendeeQASubmitBox
                    roomKey={`session:${session.id}`}
                    eventId={event.id}
                    attendeeName={attendeeEmail ?? "Anonymous"}
                  />
                ) : null}
              </div>
            </div>

            <aside className="space-y-4">
              <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(2,6,23,0.96))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">
                  Session Details
                </div>

                <div className="mt-5 space-y-4 text-sm text-white/65">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-white/40">Visibility</span>
                    <span>{formatVisibilityLabel(session.visibilityMode)}</span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-white/40">Delivery</span>
                    <span>{formatDeliveryLabel(session.deliveryMode)}</span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-white/40">Primary</span>
                    <span className="capitalize">{primaryExperience}</span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-white/40">Chat</span>
                    <span>{capability.chat ? "Enabled" : "Disabled"}</span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-white/40">Q&A</span>
                    <span>{capability.qa ? "Enabled" : "Disabled"}</span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-white/40">Lower panel</span>
                    <span>{capability.lowerPanel ? "Enabled" : "Disabled"}</span>
                  </div>

                  {session.liveRoomName ? (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-white/40">Live room</span>
                      <span className="max-w-[170px] truncate text-right">
                        {session.liveRoomName}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">
                  Viewing Notes
                </div>

                <div className="mt-4 space-y-3 text-sm leading-6 text-white/55">
                  <p>
                    Stay on this page while the event team directs the live
                    experience.
                  </p>
                  <p>
                    As the program changes, Jupiter can move you between moments
                    without breaking the flow.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  )
}