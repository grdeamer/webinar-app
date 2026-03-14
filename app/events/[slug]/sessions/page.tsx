import { getEventBySlug } from "@/lib/events"
import { supabaseAdmin } from "@/lib/supabase/admin"
import Link from "next/link"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

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

export default async function EventSessionsPage(props: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await props.params
  const event = await getEventBySlug(slug)

  const { data } = await supabaseAdmin
    .from("event_sessions")
    .select("id,event_id,code,title,description,starts_at,ends_at,join_link")
    .eq("event_id", event.id)
    .order("starts_at", { ascending: true })

  const sessions: SessionRow[] = (data ?? []).map((s: any) => ({
    id: String(s.id),
    event_id: String(s.event_id),
    code: s.code ?? null,
    title: String(s.title ?? ""),
    description: s.description ?? null,
    starts_at: s.starts_at ?? null,
    ends_at: s.ends_at ?? null,
    join_link: s.join_link ?? null,
  }))

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
        <div className="text-sm text-white/50">Event Sessions</div>
        <h1 className="mt-2 text-3xl font-bold">{event.title}</h1>
        <p className="mt-3 text-white/70">
          Sessions landing page for this event.
        </p>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-white/70">
          No sessions found for this event.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {sessions.map((session) => {
            const datePretty = formatDatePretty(session.starts_at)

            return (
              <div
                key={session.id}
                className="rounded-3xl border border-white/10 bg-white/5 p-7"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-white/50">Session</div>
                  {datePretty ? (
                    <div className="text-xs text-white/60">{datePretty}</div>
                  ) : null}
                </div>

                <Link
  href={`/events/${slug}/sessions/${session.id}`}
  className="mt-4 block text-xl font-semibold hover:text-white/80 transition"
>
  {session.title}
</Link>

                {session.code ? (
                  <div className="mt-2 text-xs font-mono text-white/45">
                    Session code: {session.code}
                  </div>
                ) : null}

                {session.description ? (
                  <p className="mt-3 text-white/65">{session.description}</p>
                ) : (
                  <p className="mt-3 text-white/45">No description provided.</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}