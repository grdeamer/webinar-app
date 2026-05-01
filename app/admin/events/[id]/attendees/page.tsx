import { notFound } from "next/navigation"
import { supabaseAdmin } from "@/lib/supabase/admin"
import PresenterControls from "@/components/admin/PresenterControls"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type PageProps = {
  params: Promise<{ id: string }>
}

type EventAttendeeRow = {
  event_id: string
  user_id: string | null
  created_at: string | null
  is_presenter: boolean
  session_id: string | null
}

type PresenceRow = {
  user_id: string
  last_seen: string | null
}

function isUuid(value: string) {
  return /^[0-9a-f-]{36}$/i.test(value)
}

function timeAgo(iso: string | null) {
  if (!iso) return "—"
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 10) return "just now"
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  return `${h}h ago`
}

export default async function Page({ params }: PageProps) {
  const { id } = await params

  let eventId = id
  let eventSlug = id

  if (!isUuid(id)) {
    const { data } = await supabaseAdmin
      .from("events")
      .select("id,slug")
      .eq("slug", id)
      .maybeSingle()

    if (!data?.id) notFound()
    eventId = data.id
    eventSlug = data.slug
  }

  if (isUuid(id)) {
    const { data } = await supabaseAdmin
      .from("events")
      .select("slug")
      .eq("id", eventId)
      .maybeSingle()

    if (data?.slug) eventSlug = data.slug
  }

  const { data: attendees } = await supabaseAdmin
    .from("event_attendees")
    .select("*")
    .eq("event_id", eventId)

  const typedAttendees = (attendees ?? []) as EventAttendeeRow[]

  const userIds = typedAttendees
    .map((a) => a.user_id)
    .filter((v): v is string => !!v)

  let userMap = new Map<string, { email: string | null; name: string | null }>()

  if (userIds.length > 0) {
    const { data } = await supabaseAdmin.auth.admin.listUsers()

    const filtered = data.users.filter((u) => userIds.includes(u.id))

    userMap = new Map(
      filtered.map((u) => [
        u.id,
        {
          email: u.email ?? null,
          name:
            (u.user_metadata?.full_name as string) ??
            (u.user_metadata?.name as string) ??
            null,
        },
      ])
    )
  }

  const { data: presenceRows } = await supabaseAdmin
    .from("event_presence")
    .select("user_id,last_seen")
    .eq("event_id", eventId)

  const presence = (presenceRows ?? []) as PresenceRow[]

  const now = Date.now()
  const ACTIVE_WINDOW = 30_000

  const loggedIn = new Set(presence.map((p) => p.user_id))

  const active = new Set(
    presence
      .filter((p) => {
        if (!p.last_seen) return false
        return now - new Date(p.last_seen).getTime() <= ACTIVE_WINDOW
      })
      .map((p) => p.user_id)
  )
const { data: sessions } = await supabaseAdmin
  .from("event_sessions")
  .select("id,title")
  .eq("event_id", eventId)

const presenceMap = new Map(presence.map((p) => [p.user_id, p]))

  return (
    <div className="space-y-6 p-6">
    

      <div className="space-y-6">
        <h1 className="text-3xl font-semibold text-white">Registrants</h1>

<div className="grid gap-4 md:grid-cols-3">
  <Stat label="Total" value={typedAttendees.length} />
  <Stat label="Logged In" value={loggedIn.size} />
  <Stat label="In Event Now" value={active.size} />
</div>

<section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
  <div className="text-xs uppercase tracking-[0.18em] text-violet-100/45">
    Presenter Workflow
  </div>
  <h2 className="mt-2 text-xl font-semibold text-white">
    Tag presenters and prepare session access
  </h2>
  <p className="mt-2 max-w-3xl text-sm leading-6 text-white/60">
    This area will become the control surface for marking registrants as
    presenters, assigning them to sessions, and sending presenter access links.
  </p>

  <div className="mt-5 grid gap-3 md:grid-cols-3">
    <WorkflowCard
      title="1. Identify presenters"
      description="Mark which registrants are speakers, panelists, or moderators."
    />
    <WorkflowCard
      title="2. Assign sessions"
      description="Attach presenters to the sessions they need access to."
    />
    <WorkflowCard
      title="3. Send access"
      description="Send presenter links after assignments are confirmed."
    />
  </div>
</section>

        <div className="overflow-hidden rounded-3xl border border-white/10">
          {typedAttendees.map((a, i) => {
            const user = a.user_id ? userMap.get(a.user_id) : null
            const p = a.user_id ? presenceMap.get(a.user_id) : null
            const isActive = a.user_id ? active.has(a.user_id) : false

            return (
              <div
                key={i}
                className="grid border-b border-white/10 px-5 py-4 md:grid-cols-5"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        isActive ? "bg-green-400" : "bg-white/20"
                      }`}
                    />
                    <span className="text-white">
                      {user?.name || user?.email || a.user_id}
                    </span>
                  </div>
                </div>

                <div className="text-white/70">{user?.email || "—"}</div>

                <div className="text-white/50">
                  {a.created_at ? new Date(a.created_at).toLocaleString() : "—"}
                </div>

<div className="flex items-center gap-3 text-sm">
  {p?.last_seen ? (
    isActive ? (
      <span className="text-green-300">In event</span>
    ) : (
      <span className="text-white/60">Seen {timeAgo(p.last_seen)}</span>
    )
  ) : (
    <span className="text-white/30">Never</span>
  )}
</div>

<PresenterControls
  eventId={eventId}
  eventSlug={eventSlug}
  userId={a.user_id}
  initialIsPresenter={a.is_presenter}
  initialSessionId={a.session_id}
  sessions={sessions ?? []}
/>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 p-5">
      <div className="text-xs text-white/40">{label}</div>
      <div className="text-3xl text-white">{value}</div>
    </div>
  )
}
function WorkflowCard({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="text-sm font-semibold text-white">{title}</div>
      <div className="mt-2 text-sm leading-6 text-white/55">
        {description}
      </div>
    </div>
  )
}