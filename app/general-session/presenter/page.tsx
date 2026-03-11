import { cookies } from "next/headers"
import { isAdminFromCookie } from "@/lib/adminToken"
import { supabaseAdmin } from "@/lib/supabase/admin"
import PresenterControlRoom from "./ui"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type SettingsRow = {
  id: number
  title: string | null
  presenter_key: string | null
  is_published: boolean
}

export default async function GeneralSessionPresenterPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const key =
    typeof searchParams?.key === "string"
      ? searchParams.key
      : Array.isArray(searchParams?.key)
      ? searchParams.key[0]
      : ""

  const cookieStore = await cookies()
  const token = cookieStore.get("admin_token")?.value

  const isAdmin = Boolean(await isAdminFromCookie(token))

  const { data } = await supabaseAdmin
    .from("general_session_settings")
    .select("id,title,presenter_key,is_published")
    .eq("id", 1)
    .maybeSingle<SettingsRow>()

  const settings: SettingsRow =
    data ?? {
      id: 1,
      title: "General Session",
      presenter_key: null,
      is_published: false,
    }

  const isPresenter =
    Boolean(key) &&
    Boolean(settings.presenter_key) &&
    key === settings.presenter_key

  if (!isAdmin && !isPresenter) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-6">
        <div className="mx-auto w-full max-w-3xl">
          <h1 className="text-2xl font-bold">Presenter Control Room</h1>

          <p className="mt-2 text-white/70">
            This page requires a presenter key.
          </p>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
            <div className="font-semibold">How to open this page</div>

            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>
                Go to <span className="font-mono">/admin/general-session</span>{" "}
                and generate a presenter key.
              </li>

              <li>
                Open:
                <div className="mt-2 rounded-xl border border-white/10 bg-black/30 p-3 font-mono text-xs break-all">
                  /general-session/presenter?key=YOUR_KEY
                </div>
              </li>
            </ol>
          </div>
        </div>
      </main>
    )
  }

  const canBypassPublish = Boolean(isAdmin || isPresenter)

  return (
    <PresenterControlRoom
      title={settings.title || "General Session"}
      presenterKey={key}
      canBypassPublish={canBypassPublish}
    />
  )
}