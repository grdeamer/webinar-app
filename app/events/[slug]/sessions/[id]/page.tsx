import Link from "next/link"
import { notFound } from "next/navigation"
import EventEmailGate from "../../EventEmailGate"
import { getEventBySlug } from "@/lib/events"
import type { AppSession } from "@/lib/domain/sessions"
import {
  getSessionById,
} from "@/lib/repos/sessionsRepo"
import { buildEventViewerContext } from "@/lib/services/events/buildEventViewerContext"
import { resolveSessionExperience } from "@/lib/services/sessions/resolveSessionExperience"
import SessionLiveRedirectWatcher from "@/components/live/SessionLiveRedirectWatcher"

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

  return [format(start), format(end)].filter(Boolean).join(" – ")
}

function formatKindLabel(kind?: string | null) {
  if (!kind) return null
  return kind
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
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

  return (
    <span className="inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
      {label}
    </span>
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
      ? "bg-blue-600 text-white hover:bg-blue-500"
      : platform === "teams"
        ? "bg-indigo-600 text-white hover:bg-indigo-500"
        : platform === "webex"
          ? "bg-green-600 text-white hover:bg-green-500"
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
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <div className="text-sm text-white/60">
        This session is hosted externally{platformDetail}.
      </div>

      <h2 className="mt-3 text-2xl font-semibold text-white">Join session</h2>

      <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
        Attendees will leave the event experience briefly and join this session externally.
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
    <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
      {mp4Url ? (
        <video
          src={mp4Url}
          controls
          playsInline
          className="aspect-video w-full rounded-2xl bg-black"
        />
      ) : hlsUrl ? (
        <div className="flex aspect-video w-full items-center justify-center rounded-2xl bg-black text-sm text-white/55">
          HLS source detected
        </div>
      ) : (
        <div className="flex aspect-video w-full items-center justify-center rounded-2xl bg-black text-sm text-white/55">
          No video source configured yet
        </div>
      )}
    </div>
  )
}

function LiveKitSessionPanel({ session }: { session: AppSession }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/30 p-6">
      <div className="flex aspect-video w-full items-center justify-center rounded-2xl bg-black text-sm text-white/55">
        LiveKit room placeholder
        {session.liveRoomName ? `: ${session.liveRoomName}` : ""}
      </div>
    </div>
  )
}

function RtmpSessionPanel() {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/30 p-6">
      <div className="flex aspect-video w-full items-center justify-center rounded-2xl bg-black text-sm text-white/55">
        RTMP session configured
      </div>
    </div>
  )
}

function AccessDeniedPanel({
  slug,
  session,
  reason,
}: {
  slug: string
  session: AppSession
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
      ? "Your event registration is valid, but this session is not part of your assigned schedule."
      : reason === "hidden"
        ? "This session exists, but it is hidden from attendee access right now."
        : "Please contact the event team if you believe you should be able to access it."

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 text-sm uppercase tracking-[0.2em] text-white/40">
          Session access
        </div>

        <h1 className="text-3xl font-semibold">{title}</h1>

        <p className="mt-4 text-sm leading-6 text-white/65">{body}</p>

        <div className="mt-3 text-sm text-white/45">{session.title}</div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={`/events/${slug}/sessions`}
            className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950"
          >
            Back to my sessions
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

  if (!experience.access.canView) {
    if (experience.access.reason === "login_required") {
      return (
        <div className="min-h-screen bg-slate-950 px-6 py-16 text-white">
          <div className="mx-auto max-w-xl">
            <div className="mb-6 text-sm uppercase tracking-[0.2em] text-white/40">
              {event.title}
            </div>

            <h1 className="text-3xl font-semibold">{session.title}</h1>

            <p className="mt-3 text-sm text-white/60">
              Enter your email to access this session.
            </p>

            <div className="mt-8">
              <EventEmailGate slug={slug} />
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
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-6">
          <Link href={`/events/${slug}`} className="text-sm text-sky-200 hover:text-sky-100">
            ← Back to event
          </Link>
        </div>

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(30,41,59,0.88),rgba(2,6,23,0.96))] p-6">
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={experience.runtime.status} />

                {session.isGeneralSession ? (
                  <span className="inline-flex rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs font-medium text-sky-200">
                    Main Stage
                  </span>
                ) : null}
              </div>

              <h1 className="mt-4 text-3xl font-semibold">{session.title}</h1>

              {session.description ? (
                <p className="mt-3 max-w-3xl text-sm leading-6 text-white/65">
                  {session.description}
                </p>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-4 text-sm text-white/50">
                {timeRange ? <div>{timeRange}</div> : null}
                {session.speakerName ? <div>{session.speakerName}</div> : null}
                {sessionKindLabel ? <div>{sessionKindLabel}</div> : null}
              </div>
            </div>

            {experience.delivery.kind === "livekit" ? (
              <LiveKitSessionPanel session={session} />
            ) : experience.delivery.kind === "video" ? (
              <VideoSessionPanel session={session} />
            ) : experience.delivery.kind === "rtmp" ? (
              <RtmpSessionPanel />
            ) : (
              <ExternalSessionPanel session={session} />
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <h2 className="text-lg font-semibold">Session details</h2>

              <div className="mt-4 space-y-3 text-sm text-white/65">
                <div>
                  <div className="text-white/40">Visibility</div>
                  <div>{formatVisibilityLabel(session.visibilityMode)}</div>
                </div>

                <div>
                  <div className="text-white/40">Delivery</div>
                  <div>{formatDeliveryLabel(session.deliveryMode)}</div>
                </div>

                <div>
                  <div className="text-white/40">Chat</div>
                  <div>{session.chatEnabled ? "Enabled" : "Disabled"}</div>
                </div>

                <div>
                  <div className="text-white/40">Q&A</div>
                  <div>{session.qaEnabled ? "Enabled" : "Disabled"}</div>
                </div>

                {session.liveRoomName ? (
                  <div>
                    <div className="text-white/40">Live room</div>
                    <div>{session.liveRoomName}</div>
                  </div>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}