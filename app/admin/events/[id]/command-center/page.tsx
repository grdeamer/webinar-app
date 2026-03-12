import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { isAdminFromCookie } from "@/lib/adminToken"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getEventLiveState } from "@/lib/app/liveState"
import type { EventBreakout } from "@/lib/types"
import EventCommandCenter from "@/components/admin/EventCommandCenter"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export default async function AdminEventCommandCenterPage(props: {
  params: Promise<{ id: string }>
}) {
  const cookieStore = await cookies()
  const token = cookieStore.get("admin_token")?.value
  const isAdmin = Boolean(await isAdminFromCookie(token))

  if (!isAdmin) {
    redirect("/admin/login")
  }

  const { id } = await props.params

  const [{ data: event, error: eventError }, { data: breakoutRows, error: breakoutError }, liveState] =
    await Promise.all([
      supabaseAdmin
        .from("events")
        .select("id,slug,title")
        .eq("id", id)
        .single(),
      supabaseAdmin
        .from("event_breakouts")
        .select(
          "id,event_id,title,description,join_link,start_at,end_at,speaker_name,speaker_avatar_url,manual_live,auto_open,created_at"
        )
        .eq("event_id", id)
        .order("start_at", { ascending: true, nullsFirst: false }),
      getEventLiveState(id),
    ])

  if (eventError) throw new Error(eventError.message)
  if (breakoutError && breakoutError.code !== "42P01") throw new Error(breakoutError.message)

  const breakouts = (((breakoutRows as EventBreakout[] | null) ?? []).map((item) => ({
    ...item,
    created_at: item.created_at ?? "",
  })))

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <EventCommandCenter
          eventId={event.id}
          eventSlug={event.slug}
          eventTitle={event.title}
          initialLiveState={liveState}
          breakouts={breakouts}
        />
      </div>
    </main>
  )
}