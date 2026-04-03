import Link from "next/link"
import { redirect } from "next/navigation"
import { getEventBySlug } from "@/lib/events"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { canViewerAccessSession } from "@/lib/domain/access"
import { listEventSessions } from "@/lib/repos/sessionsRepo"
import { buildEventViewerContext } from "@/lib/services/events/buildEventViewerContext"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function formatDatePretty(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function isUpcoming(iso: string | null) {
  if (!iso) return false
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return false
  return d.getTime() >= Date.now()
}

function sessionBadge(iso: string | null) {
  if (isUpcoming(iso)) {
    return {
      label: "UPCOMING",
      cls: "bg-indigo-500/15 text-indigo-200 ring-1 ring-indigo-500/30",
    }
  }

  return {
    label: "ASSIGNED",
    cls: "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30",
  }
}

async function getVisibleEventSessions(eventId: string, viewer: Awaited<ReturnType<typeof buildEventViewerContext>>) {
  const sessions = await listEventSessions(eventId)

  const visibleSessions = sessions.filter((session) => {
    const access = canViewerAccessSession(session, viewer)
    return access.canView
  })

  visibleSessions.sort((a, b) => {
    const ta = a.startsAt ? new Date(a.startsAt).getTime() : Infinity
    const tb = b.startsAt ? new Date(b.startsAt).getTime() : Infinity
    return ta - tb
  })

  return visibleSessions
}

export default async function EventSessionsPage(props: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await props.params

  const event = await getEventBySlug(slug)
  const viewer = await buildEventViewerContext(slug, event.id)

  if (viewer.type === "guest") {
    redirect(`/events/${slug}`)
  }

  const sessions = await getVisibleEventSessions(event.id, viewer)

  const { data: sessionsTheme } = await supabaseAdmin
    .from("event_page_themes")
    .select(
      "bg_color,text_color,accent_color,brand_logo_url,brand_logo_position,background_image_url,overlay_opacity"
    )
    .eq("event_id", event.id)
    .eq("page_key", "sessions_landing")
    .maybeSingle()

  const showNoAssigned = sessions.length === 0

  const pageStyle = sessionsTheme?.background_image_url
    ? {
        backgroundColor: sessionsTheme.bg_color || "#020617",
        color: sessionsTheme.text_color || "#ffffff",
        backgroundImage: `linear-gradient(rgba(2,6,23,${
          (sessionsTheme.overlay_opacity ?? 45) / 100
        }), rgba(2,6,23,${
          (sessionsTheme.overlay_opacity ?? 45) / 100
        })), url(${sessionsTheme.background_image_url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : {
        backgroundColor: sessionsTheme?.bg_color || "#020617",
        color: sessionsTheme?.text_color || "#ffffff",
      }

  return (
    <main className="min-h-screen text-white" style={pageStyle}>
      <div className="relative mx-auto max-w-6xl px-6 py-12">
        {sessionsTheme?.brand_logo_url ? (
          <div
            className={`mb-6 flex ${
              sessionsTheme.brand_logo_position === "center"
                ? "justify-center"
                : sessionsTheme.brand_logo_position === "right"
                  ? "justify-end"
                  : "justify-start"
            }`}
          >
            <img
              src={sessionsTheme.brand_logo_url}
              alt="Event logo"
              className="h-14 w-auto max-w-[220px]"
            />
          </div>
        ) : null}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {event.title} — My Sessions
            </h1>
            <p className="mt-1 text-white/60">
              View only the sessions available to your current event access.
            </p>
          </div>
        </div>

        {showNoAssigned ? (
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
            <h2 className="text-xl font-semibold">No sessions available</h2>
            <p className="mt-2 text-white/60">
              If you think this is a mistake, contact the event admin.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            {sessions.map((session) => {
              const badge = sessionBadge(session.startsAt)
              const datePretty = formatDatePretty(session.startsAt)
              const joinHref = session.externalJoinUrl || session.joinLink || null

              return (
                <div
                  key={session.id}
                  className="rounded-3xl border border-white/10 bg-white/5 p-7"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badge.cls}`}
                    >
                      {badge.label}
                    </span>

                    {datePretty ? (
                      <span className="text-xs text-white/60">{datePretty}</span>
                    ) : null}
                  </div>

                  <h3 className="mt-4 text-xl font-semibold">{session.title}</h3>

                  {session.description ? (
                    <p className="mt-3 text-white/65">{session.description}</p>
                  ) : null}

                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                      href={`/events/${slug}/sessions/${session.id}`}
                      className="rounded-xl bg-white px-5 py-3 font-medium text-slate-950"
                    >
                      View Session
                    </Link>

                    {session.deliveryMode === "external" && joinHref ? (
                      <a
                        href={joinHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-xl bg-indigo-600 px-5 py-3 font-medium text-white hover:bg-indigo-500"
                      >
                        Join session
                      </a>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}