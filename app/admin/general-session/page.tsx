import { supabaseAdmin } from "@/lib/supabase/admin"
import AdminGeneralSessionEditor from "./ui"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export default async function AdminGeneralSessionPage() {
  const { data, error } = await supabaseAdmin
    .from("general_session_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle()

  if (error) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-2xl font-bold">General Session</h1>
        <p className="mt-3 text-white/70">{error.message}</p>
      </div>
    )
  }

  const initial =
    data || {
      id: 1,
      title: "General Session",
      source_type: "mp4",
      mp4_path: null,
      m3u8_url: null,
      rtmp_url: null,
      poster_url: null,
      is_published: false,
      publish_state: "draft",
      publish_at: null,
      presenter_key: null,
      updated_at: new Date().toISOString(),
    }

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">General Session</h1>
        <p className="mt-1 text-sm text-white/60">
          Zoom-style publish controls + player source (MP4 / HLS / RTMP) + Q&amp;A.
        </p>

        <div className="mt-3 flex items-center gap-2">
          <a
            href="/admin/general-session/qa"
            className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
          >
            Manage Q&amp;A
          </a>
          <a
            href="/presenter"
            className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
          >
            Open Presenter Mode
          </a>
          <a
            href="/admin/dev-tools"
            className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
          >
            Open Dev Tools
          </a>
        </div>
      </div>

      <AdminGeneralSessionEditor initial={initial} />
    </div>
  )
}