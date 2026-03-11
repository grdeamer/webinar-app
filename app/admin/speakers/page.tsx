import Link from "next/link"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { parseSpeakerCards } from "@/lib/eventExperience"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export default async function AdminSpeakersOverviewPage() {
  const { data, error } = await supabaseAdmin
    .from("webinars")
    .select("id,title,speaker,presenter,speaker_cards,thumbnail_url,playback_type")
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) throw new Error(error.message)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Speakers</h1>
        <p className="mt-1 text-white/60">Jump into webinar detail pages to manage structured speaker cards, headshots, and playback-ready poster art.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {(data || []).map((webinar: any) => {
          const speakers = parseSpeakerCards(webinar.speaker_cards, webinar.speaker, webinar.presenter)
          return (
            <Link key={webinar.id} href={`/admin/webinars/${webinar.id}`} className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10">
              <div className="grid gap-4 p-5 md:grid-cols-[120px_1fr] md:items-center">
                <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                  {webinar.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={webinar.thumbnail_url} alt={webinar.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs uppercase tracking-[0.2em] text-white/35">Poster</div>
                  )}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-lg font-semibold">{webinar.title}</div>
                    {webinar.playback_type ? <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] text-emerald-200">{String(webinar.playback_type).toUpperCase()}</span> : null}
                  </div>
                  <div className="mt-2 text-sm text-white/55">{speakers.length} speaker card{speakers.length === 1 ? "" : "s"}</div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {speakers.slice(0, 4).map((speaker) => (
                      <span key={speaker.name} className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/70">{speaker.name}</span>
                    ))}
                    {speakers.length === 0 ? <span className="text-sm text-white/45">No speaker cards yet.</span> : null}
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
