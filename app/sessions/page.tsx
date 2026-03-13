import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import jwt from "jsonwebtoken"
import AttendeePresenceHeartbeat from "@/components/AttendeePresenceHeartbeat"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type UserTokenPayload = {
  userId?: string
  email?: string
}

type SessionRow = {
  id: string
  event_id: string
  code: string | null
  title: string
  description: string | null
  starts_at: string | null
  ends_at: string | null
  join_link: string | null
}

function formatDatePretty(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function isUpcoming(iso: string | null) {
  if (!iso) return false
  const d = new Date(iso)
  if (isNaN(d.getTime())) return false
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

export default async function SessionsPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get("user_token")?.value

  if (!token) redirect("/")

  const JWT_SECRET = process.env.JWT_SECRET
  if (!JWT_SECRET) redirect("/")

  let userEmail: string | null = null

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserTokenPayload
    userEmail = decoded.email ?? null
  } catch {
    redirect("/")
  }

  if (!userEmail) redirect("/")

  const { data: registrants } = await supabaseAdmin
    .from("event_registrants")
    .select("id,event_id,email")
    .eq("email", userEmail)

  const registrantIds = (registrants ?? []).map((r: any) => r.id).filter(Boolean)

  let sessions: SessionRow[] = []

  if (registrantIds.length > 0) {
    const { data: assignments } = await supabaseAdmin
      .from("event_registrant_sessions")
      .select(`
        session_id,
        event_sessions:session_id (
          id,
          event_id,
          code,
          title,
          description,
          starts_at,
          ends_at,
          join_link
        )
      `)
      .in("registrant_id", registrantIds)

    sessions =
      (assignments ?? [])
        .map((row: any) =>
          Array.isArray(row.event_sessions)
            ? row.event_sessions[0] ?? null
            : row.event_sessions
        )
        .filter(Boolean)
        .map((s: any) => ({
          id: String(s.id),
          event_id: String(s.event_id),
          code: s.code ?? null,
          title: String(s.title ?? ""),
          description: s.description ?? null,
          starts_at: s.starts_at ?? null,
          ends_at: s.ends_at ?? null,
          join_link: s.join_link ?? null,
        })) || []
  }

  const uniqueSessions = Array.from(new Map(sessions.map((s) => [s.id, s])).values())

  uniqueSessions.sort((a, b) => {
    const ta = a.starts_at ? new Date(a.starts_at).getTime() : Infinity
    const tb = b.starts_at ? new Date(b.starts_at).getTime() : Infinity
    return ta - tb
  })

  const activeEventId = uniqueSessions[0]?.event_id ?? registrants?.[0]?.event_id ?? null

  let sessionsTheme: any = null

  if (activeEventId) {
    const { data } = await supabaseAdmin
      .from("event_page_themes")
      .select(
        "bg_color,text_color,accent_color,brand_logo_url,brand_logo_position,background_image_url,overlay_opacity"
      )
      .eq("event_id", activeEventId)
      .eq("page_key", "sessions_landing")
      .maybeSingle()

    sessionsTheme = data ?? null
  }

  const showNoAssigned = uniqueSessions.length === 0

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
      <AttendeePresenceHeartbeat />

      <div className="relative mx-auto max-w-6xl px-6 py-12">

        {sessionsTheme?.brand_logo_url && (
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
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">My Sessions</h1>
            <p className="mt-1 text-white/60">
              View the sessions assigned to your email and join when ready.
            </p>
          </div>
        </div>

        {showNoAssigned && (
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
            <h2 className="text-xl font-semibold">No sessions assigned</h2>
            <p className="mt-2 text-white/60">
              If you think this is a mistake, contact the admin.
            </p>
          </div>
        )}

        {uniqueSessions.length > 0 && (
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            {uniqueSessions.map((session) => {
              const badge = sessionBadge(session.starts_at)
              const datePretty = formatDatePretty(session.starts_at)

              return (
                <div
                  key={session.id}
                  className="rounded-3xl border border-white/10 bg-white/5 p-7"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badge.cls}`}
                    >
                      {badge.label}
                    </span>

                    {datePretty && (
                      <span className="text-xs text-white/60">{datePretty}</span>
                    )}
                  </div>

                  <h3 className="mt-4 text-xl font-semibold">{session.title}</h3>

                  {session.description && (
                    <p className="mt-3 text-white/65">{session.description}</p>
                  )}

                  <div className="mt-6 flex gap-3">
                    <a
                      href={`/sessions/${session.id}`}
                      className="rounded-xl bg-white px-5 py-3 font-medium text-slate-950"
                    >
                      View Session
                    </a>

                    {session.join_link && (
                      <a
                        href={session.join_link}
                        className="rounded-xl bg-indigo-600 px-5 py-3 font-medium"
                      >
                        Join session
                      </a>
                    )}
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