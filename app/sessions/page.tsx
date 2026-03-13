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

export default async function MyWebinarsPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get("user_token")?.value

  if (!token) redirect("/")

  const JWT_SECRET = process.env.JWT_SECRET
  if (!JWT_SECRET) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
        <AttendeePresenceHeartbeat />
        <div className="mx-auto max-w-5xl px-6 py-14">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h1 className="text-xl font-semibold">Server misconfigured</h1>
            <p className="mt-2 text-white/70">Missing JWT_SECRET in environment.</p>
          </div>
        </div>
      </main>
    )
  }

  let userEmail: string | null = null

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserTokenPayload
    userEmail = decoded.email ?? null
  } catch {
    redirect("/")
  }

  if (!userEmail) redirect("/")

  const { data: registrants, error: registrantError } = await supabaseAdmin
    .from("event_registrants")
    .select("id,event_id,email")
    .eq("email", userEmail)

  if (registrantError) {
    console.error("event_registrants query error:", registrantError)
  }

  const registrantIds = (registrants ?? []).map((r: any) => r.id).filter(Boolean)

  let sessions: SessionRow[] = []

  if (registrantIds.length > 0) {
    const { data: assignments, error: assignmentError } = await supabaseAdmin
      .from("event_registrant_sessions")
      .select(
        `
        session_id,
        event_sessions:session_id (
          id,
          event_id,
          code,
          title,
          description,
          start_at,
          end_at,
          join_link
        )
      `
      )
      .in("registrant_id", registrantIds)

    if (assignmentError) {
      console.error("event_registrant_sessions query error:", assignmentError)
    } else {
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
            start_at: s.starts_at ?? null,
            end_at: s.ends_at ?? null,
            join_link: s.join_link ?? null,
          })) || []
    }
  }

  const uniqueSessions = Array.from(
    new Map(sessions.map((s) => [s.id, s])).values()
  )

  uniqueSessions.sort((a, b) => {
    const ta = a.start_at ? new Date(a.start_at).getTime() : Number.POSITIVE_INFINITY
    const tb = b.start_at ? new Date(b.start_at).getTime() : Number.POSITIVE_INFINITY
    return ta - tb
  })

  const showNoAssigned = uniqueSessions.length === 0

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <AttendeePresenceHeartbeat />

      <div className="pointer-events-none fixed inset-0 opacity-40">
        <div className="absolute -top-24 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-indigo-500 blur-[140px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">My Sessions</h1>
            <p className="mt-1 text-white/60">View the sessions assigned to your email and join when ready.</p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/webinars"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10 transition"
            >
              Public List
            </a>
            <a
              href="/access"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10 transition"
            >
              Change Email
            </a>
          </div>
        </div>

        {showNoAssigned && (
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
            <h2 className="text-xl font-semibold">No sessions assigned</h2>
            <p className="mt-2 text-white/60">
              If you think this is a mistake, contact the admin.
            </p>

            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href="/access"
                className="rounded-xl bg-indigo-600 px-5 py-3 font-medium hover:bg-indigo-700 transition"
              >
                Re-enter email →
              </a>
              <a
                href="/webinars"
                className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 font-medium hover:bg-white/10 transition"
              >
                Browse public list
              </a>
            </div>
          </div>
        )}

        {uniqueSessions.length > 0 && (
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            {uniqueSessions.map((session) => {
              const badge = sessionBadge(session.start_at)
              const datePretty = formatDatePretty(session.start_at)

              return (
                <div
                  key={session.id}
                  className="rounded-3xl border border-white/10 bg-white/5 p-7 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${badge.cls}`}>
                      {badge.label}
                    </span>

                    {datePretty && (
                      <span className="text-xs text-white/60">{datePretty}</span>
                    )}
                  </div>

                  <h3 className="mt-4 text-xl font-semibold leading-snug">{session.title}</h3>

                  {session.code ? (
                    <div className="mt-2 text-xs font-mono text-white/45">
                      Session code: {session.code}
                    </div>
                  ) : null}

                  {session.description ? (
                    <p className="mt-3 text-white/65 line-clamp-3">{session.description}</p>
                  ) : (
                    <p className="mt-3 text-white/45">No description provided.</p>
                  )}

                  <div className="mt-6 flex gap-3">
  <a
    href={`/sessions/${session.id}`}
    className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 font-medium text-slate-950 hover:bg-slate-100 transition"
  >
    View Session
  </a>

  {session.join_link ? (
    <a
      href={session.join_link}
      className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 font-medium hover:bg-indigo-700 transition"
    >
      Join session
    </a>
  ) : (
    <button
      disabled
      className="inline-flex items-center justify-center rounded-xl bg-white/10 px-5 py-3 font-medium opacity-60 cursor-not-allowed"
    >
      No link available
    </button>
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