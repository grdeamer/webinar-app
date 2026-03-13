import Link from "next/link"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  )
}

type RegistrantRow = {
  id: string
  email: string
  created_at: string | null
  event_id: string | null
}

type SessionRow = {
  id: string
  title: string
  code: string | null
  start_at: string | null
  join_link: string | null
}

export default async function AdminUserDetailPage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params

  if (!id || typeof id !== "string" || !isUuid(id)) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        <Link href="/admin/users" className="text-white/70 hover:text-white">
          ← Back to users
        </Link>
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-8">
          <div className="text-xl font-semibold">Registrant not found</div>
          <div className="mt-2 text-white/60">Invalid registrant id in URL.</div>
        </div>
      </main>
    )
  }

  const { data: registrant, error: registrantError } = await supabaseAdmin
    .from("event_registrants")
    .select("id,email,created_at,event_id")
    .eq("id", id)
    .single()

  if (registrantError || !registrant) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        <Link href="/admin/users" className="text-white/70 hover:text-white">
          ← Back to users
        </Link>
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-8">
          <div className="text-xl font-semibold">Registrant not found</div>
          <div className="mt-2 text-white/60">
            {registrantError?.message ?? "No record returned."}
          </div>
        </div>
      </main>
    )
  }

  const r = registrant as RegistrantRow

  const { data: assignments, error: assignmentError } = await supabaseAdmin
    .from("event_registrant_sessions")
    .select(
      `
      session_id,
      created_at,
      event_sessions:session_id (
        id,
        title,
        code,
        start_at,
        join_link
      )
    `
    )
    .eq("registrant_id", r.id)

  if (assignmentError) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        <Link href="/admin/users" className="text-white/70 hover:text-white">
          ← Back to users
        </Link>
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-8 text-red-200">
          Error loading assignments: {assignmentError.message}
        </div>
      </main>
    )
  }

  const sessions: SessionRow[] =
    (assignments ?? [])
      .map((row: any) =>
        Array.isArray(row.event_sessions)
          ? row.event_sessions[0] ?? null
          : row.event_sessions
      )
      .filter(Boolean)
      .map((s: any) => ({
        id: String(s.id),
        title: String(s.title ?? ""),
        code: s.code ?? null,
        start_at: s.start_at ?? null,
        join_link: s.join_link ?? null,
      })) || []

  const uniqueSessions = Array.from(new Map(sessions.map((s) => [s.id, s])).values())

  uniqueSessions.sort((a, b) => {
    const ta = a.start_at ? new Date(a.start_at).getTime() : Number.POSITIVE_INFINITY
    const tb = b.start_at ? new Date(b.start_at).getTime() : Number.POSITIVE_INFINITY
    return ta - tb
  })

  return (
    <main className="min-h-screen bg-slate-950 p-10 text-white">
      <div className="flex items-center justify-between gap-4">
        <Link href="/admin/users" className="text-white/70 hover:text-white">
          ← Back
        </Link>

        <div className="flex gap-2">
          <Link
            href="/admin/imports"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm transition hover:bg-white/10"
          >
            Import History
          </Link>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-8">
        <div className="text-2xl font-semibold">{r.email}</div>
        <div className="mt-2 text-sm text-white/60">
          Created: {r.created_at ? new Date(r.created_at).toLocaleString() : "—"}
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-2">
            <div className="text-xs text-white/60">Assigned sessions</div>
            <div className="text-lg font-semibold">{uniqueSessions.length}</div>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-8">
        <div className="mb-4 text-lg font-semibold">Assigned sessions</div>

        {uniqueSessions.length === 0 ? (
          <div className="text-white/60">No sessions assigned.</div>
        ) : (
          <div className="space-y-3">
            {uniqueSessions.map((s) => (
              <div
                key={s.id}
                className="rounded-xl border border-white/10 bg-black/20 p-5"
              >
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <div className="text-lg font-medium">{s.title}</div>
                    <div className="mt-1 text-sm text-white/60">
                      {s.start_at ? new Date(s.start_at).toLocaleString() : "No date"}
                    </div>

                    {s.code ? (
                      <div className="mt-3">
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80">
                          {s.code}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  <div className="text-right">
                    {s.join_link ? (
                      <a
                        href={s.join_link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm transition hover:bg-white/10"
                      >
                        Open join link →
                      </a>
                    ) : (
                      <div className="text-xs text-white/50">No join link</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}