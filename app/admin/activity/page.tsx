import { supabaseAdmin } from "@/lib/supabase/admin"
import ActivityTreeClient from "./tree-client"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export default async function AdminActivityPage() {
  const { data: liveState } = await supabaseAdmin.from("event_live_state").select("event_id").eq("is_live", true).order("updated_at", { ascending: false }).limit(1).maybeSingle()
  const { data: event } = liveState?.event_id
    ? await supabaseAdmin.from("events").select("title").eq("id", liveState.event_id).maybeSingle()
    : { data: null }

  return <ActivityTreeClient roomKey="general" eventTitle={event?.title ?? "Jupiter Platform"} />
}
