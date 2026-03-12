import { supabaseAdmin } from "@/lib/supabase/admin"
import { getEventLiveState } from "@/lib/app/liveState"
import type { EventBreakout } from "@/lib/types"
import AdminEventEditor from "./ui"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export default async function AdminEventDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params

  const [{ data, error }, { data: breakoutRows, error: breakoutError }, liveState] = await Promise.all([
    supabaseAdmin
      .from("events")
      .select("id,slug,title,description,start_at,end_at,event_sponsors(*)")
      .eq("id", id)
      .single(),
    supabaseAdmin
      .from("event_breakouts")
      .select(
        "id,event_id,title,description,join_link,start_at,end_at,speaker_name,speaker_avatar_url,manual_live,auto_open,created_at"
      )
      .eq("event_id", id)
      .order("start_at", { ascending: true }),
    getEventLiveState(id),
  ])

  if (error) throw new Error(error.message)
  if (breakoutError && breakoutError.code !== "42P01") throw new Error(breakoutError.message)

  const initialBreakouts = (((breakoutRows as EventBreakout[] | null) ?? []).map((item) => ({
    ...item,
    created_at: item.created_at ?? "",
  })))

  return (
    <AdminEventEditor
      initial={data}
      initialBreakouts={initialBreakouts}
      initialLiveState={liveState}
      importRegistrantsHref={`/admin/import?eventId=${id}`}
      directorHref={`/admin/events/${id}/director`}
      commandCenterHref={`/admin/events/${id}/command-center`}
    />
  )
}