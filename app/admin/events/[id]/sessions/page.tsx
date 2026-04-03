import { supabaseAdmin } from "@/lib/supabase/admin"
import SessionsEditor from "./ui"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type SessionRow = {
  id: string
  event_id: string
  code: string
  title: string
  description: string | null
  starts_at: string | null
  ends_at: string | null
  presenter: string | null
  join_link: string | null
  room_key: string | null
  manual_live: boolean | null
  playback_type: string | null
  playback_mp4_url: string | null
  playback_m3u8_url: string | null
  sort_order: number | null
  created_at: string | null
  updated_at: string | null

  session_kind: string | null
  visibility_mode: string | null
  delivery_mode: string | null
  external_platform: string | null
  external_join_url: string | null
  live_provider: string | null
  live_room_name: string | null
  is_general_session: boolean | null
  runtime_status: string | null
  chat_enabled: boolean | null
  qa_enabled: boolean | null
  lower_panel_enabled: boolean | null
}

type EventRow = {
  id: string
  slug: string
  title: string
}

export default async function AdminEventSessionsPage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params

  const [{ data: event, error: eventError }, { data: sessions, error: sessionsError }] =
    await Promise.all([
      supabaseAdmin.from("events").select("id,slug,title").eq("id", id).single(),
      supabaseAdmin
        .from("event_sessions")
        .select(
          `
          id,event_id,code,title,description,starts_at,ends_at,presenter,
          join_link,room_key,manual_live,playback_type,playback_mp4_url,playback_m3u8_url,
          sort_order,created_at,updated_at,
          session_kind,visibility_mode,delivery_mode,external_platform,external_join_url,
          live_provider,live_room_name,is_general_session,runtime_status,
          chat_enabled,qa_enabled,lower_panel_enabled
        `
        )
        .eq("event_id", id)
        .order("sort_order", { ascending: true })
        .order("starts_at", { ascending: true, nullsFirst: false }),
    ])

  if (eventError || !event) {
    throw new Error(eventError?.message || "Event not found")
  }

  if (sessionsError) {
    throw new Error(sessionsError.message)
  }

  return (
    <SessionsEditor
      event={event as EventRow}
      initialSessions={(sessions || []) as SessionRow[]}
    />
  )
}