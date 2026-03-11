import Link from "next/link"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { ClassMaterialsBubble, type Material } from "@/components/ClassMaterialsBubble"
import { AdminMaterialsEditor } from "@/components/AdminMaterialsEditor"
import AdminWebinarExperienceEditor from "@/components/AdminWebinarExperienceEditor"
import AdminWebinarScheduleEditor from "@/components/admin/AdminWebinarScheduleEditor"
import AdminRefreshButton from "@/components/admin/AdminRefreshButton"
import AdminLogoutButton from "@/components/admin/AdminLogoutButton"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
}

async function toSignedUrl(maybeStorageUrl: string | null, expiresIn = 60 * 60) {
  if (!maybeStorageUrl) return null
  if (!maybeStorageUrl.startsWith("storage:")) return maybeStorageUrl

  const raw = maybeStorageUrl.replace("storage:", "")
  const firstSlash = raw.indexOf("/")
  if (firstSlash === -1) return null

  const bucket = raw.slice(0, firstSlash)
  const path = raw.slice(firstSlash + 1)

  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, expiresIn)
  if (error) return null
  return data.signedUrl
}

export default async function AdminWebinarDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params

  if (!id || typeof id !== "string" || !isUuid(id)) {
    return <ErrorState message="Invalid webinar ID" />
  }

  const { data: webinar, error } = await supabaseAdmin.from("webinars").select("*").eq("id", id).single()
  if (error || !webinar) {
    return <ErrorState message="Webinar not found" />
  }

  const materialsRaw: Material[] = (webinar.materials ?? []) as Material[]
  const agendaSigned = await toSignedUrl(webinar.agenda_pdf_url)
  const materialsSigned: Material[] = await Promise.all(
    materialsRaw.map(async (m) => ({ ...m, url: (await toSignedUrl(m.url)) ?? m.url }))
  )

  return (
    <main className="min-h-screen bg-slate-950 p-10 text-white">
      <div className="flex items-center justify-between gap-3">
        <Link href="/admin/webinars" className="text-white/70 hover:text-white">
          ← Back to webinars
        </Link>
        <AdminLogoutButton />
      </div>

      <section className="mt-8 overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.14),transparent_26%),linear-gradient(135deg,rgba(2,6,23,1),rgba(15,23,42,0.96),rgba(30,41,59,0.94))] p-6 shadow-2xl shadow-black/25">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <div className="inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-white/70">
              Webinar detail · v10 experience editor
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight lg:text-4xl">{webinar.title}</h1>
            {webinar.description ? <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70">{webinar.description}</p> : null}

            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
              {agendaSigned ? (
                <a href={agendaSigned} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-white hover:bg-white/15 transition">
                  Agenda (PDF) <span aria-hidden>↗</span>
                </a>
              ) : (
                <div className="text-sm text-white/40">No agenda uploaded</div>
              )}
              <ClassMaterialsBubble materials={materialsSigned} />
              <AdminRefreshButton scopeType="webinar" scopeId={webinar.id} />
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/25">
            <div className="relative aspect-[4/3] bg-slate-900">
              {webinar.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={webinar.thumbnail_url} alt={webinar.title} className="h-full w-full object-cover opacity-90" />
              ) : (
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.24),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.18),transparent_35%)]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5">
                <div className="text-xs uppercase tracking-[0.2em] text-white/45">Attendee portal preview</div>
                <div className="mt-2 text-2xl font-semibold">{webinar.speaker || webinar.presenter || "Speaker line not set"}</div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/65">
                  {webinar.playback_m3u8_url ? <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-emerald-200">HLS ready</span> : null}
                  {webinar.playback_mp4_url ? <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-sky-200">MP4 ready</span> : null}
                  {!webinar.playback_m3u8_url && !webinar.playback_mp4_url ? <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1">No embedded playback yet</span> : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <AdminWebinarScheduleEditor
        webinarId={webinar.id}
        initialWebinarDate={webinar.webinar_date ?? null}
        initialDurationMinutes={webinar.duration_minutes ?? 60}
        initialTimezone={webinar.timezone ?? null}
      />

      <AdminWebinarExperienceEditor
        webinarId={webinar.id}
        initialSpeaker={webinar.speaker}
        initialThumbnailUrl={webinar.thumbnail_url}
        initialPlaybackType={webinar.playback_type}
        initialPlaybackMp4Url={webinar.playback_mp4_url}
        initialPlaybackM3u8Url={webinar.playback_m3u8_url}
        initialSpeakerCards={webinar.speaker_cards}
      />

      <AdminMaterialsEditor webinarId={webinar.id} initialAgendaUrl={webinar.agenda_pdf_url} initialMaterials={materialsRaw} />

      <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="mb-4 text-xl font-semibold">Webinar details</h2>
        <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2 xl:grid-cols-4">
          <Detail label="Date" value={webinar.date ?? webinar.webinar_date ?? "—"} />
          <Detail label="Presenter" value={webinar.presenter ?? "—"} />
          <Detail label="Status" value={webinar.status ?? "—"} />
          <Detail label="Created" value={webinar.created_at ? new Date(webinar.created_at).toLocaleString() : "—"} />
        </div>
      </div>
    </main>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-white/50">{label}</div>
      <div>{value}</div>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <main className="min-h-screen bg-slate-950 p-10 text-white">
      <div className="flex items-center justify-between">
        <Link href="/admin/webinars" className="text-white/70 hover:text-white">← Back to webinars</Link>
        <AdminLogoutButton />
      </div>
      <div className="mt-8 text-red-400">{message}</div>
    </main>
  )
}