import Link from "next/link"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { isAdminFromCookie } from "@/lib/adminToken"
import { supabaseAdmin } from "@/lib/supabase/admin"
import DirectorModePanel from "@/components/admin/DirectorModePanel"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Params = {
  params: Promise<{ id: string }>
}

export default async function AdminEventDirectorPage(props: Params) {
  const cookieStore = await cookies()
  const token = cookieStore.get("admin_token")?.value
  const isAdmin = Boolean(await isAdminFromCookie(token))

  if (!isAdmin) {
    redirect("/admin/login")
  }

  const { id } = await props.params

  const { data: event, error: eventError } = await supabaseAdmin
    .from("events")
    .select("id,title,slug")
    .eq("id", id)
    .maybeSingle()

  if (eventError) throw new Error(eventError.message)
  if (!event) throw new Error("Event not found")

  const { data: breakouts, error: breakoutsError } = await supabaseAdmin
    .from("event_breakouts")
    .select("id,title")
    .eq("event_id", id)
    .order("start_at", { ascending: true, nullsFirst: false })

  if (breakoutsError) throw new Error(breakoutsError.message)

  const { data: liveState, error: liveStateError } = await supabaseAdmin
    .from("event_live_state")
    .select("event_id,mode,breakout_id,force_redirect,updated_at")
    .eq("event_id", id)
    .maybeSingle()

  if (liveStateError) throw new Error(liveStateError.message)

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-white/45">Admin / Director</div>
            <h1 className="mt-2 text-3xl font-bold">{event.title}</h1>
          </div>

          <div className="flex gap-3">
            <Link
              href={`/admin/events/${id}`}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
            >
              Back to event
            </Link>
            <Link
              href={`/events/${event.slug}`}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
            >
              Open event
            </Link>
          </div>
        </div>

        <DirectorModePanel
          eventId={event.id}
          eventSlug={event.slug}
          initialState={
            liveState || {
              event_id: event.id,
              mode: "lobby",
              breakout_id: null,
              force_redirect: false,
              updated_at: null,
            }
          }
          breakouts={(breakouts || []).map((b) => ({
            id: String(b.id),
            title: String(b.title || "Untitled breakout"),
          }))}
        />
      </div>
    </main>
  )
}