import { supabaseAdmin } from "@/lib/supabase/admin"
import { getEventBySlug } from "@/lib/events"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type Sponsor = {
  id: string
  name: string
  description: string | null
  logo_url: string | null
  website_url: string | null
  tier: string | null
}

export default async function SponsorsPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params
  const event = await getEventBySlug(slug)

  const { data, error } = await supabaseAdmin
    .from("event_sponsors")
    .select("id,name,description,logo_url,website_url,tier")
    .eq("event_id", event.id)
    .order("sort_index", { ascending: true })

  if (error) throw new Error(error.message)
  const sponsors = (data || []) as Sponsor[]

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h1 className="text-2xl font-bold">Sponsor Booths</h1>
      <p className="mt-2 text-white/60">Thanks to the teams who make this possible.</p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {sponsors.map((s) => (
          <div key={s.id} className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-lg font-semibold">{s.name}</div>
              {s.tier ? <div className="text-xs text-white/60">{s.tier}</div> : null}
            </div>
            {s.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.logo_url} alt={s.name} className="mt-3 h-12 object-contain" />
            ) : null}
            {s.description ? <div className="mt-3 text-sm text-white/70 whitespace-pre-wrap">{s.description}</div> : null}
            {s.website_url ? (
              <a
                href={s.website_url}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex rounded-xl border border-white/10 bg-white/5 px-4 py-2 hover:bg-white/10"
              >
                Visit booth →
              </a>
            ) : null}
          </div>
        ))}
        {sponsors.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-white/60">
            No sponsors yet.
          </div>
        ) : null}
      </div>
    </div>
  )
}
