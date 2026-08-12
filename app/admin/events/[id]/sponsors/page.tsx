import { notFound } from "next/navigation"
import AdminEventSponsorManager from "@/components/admin/AdminEventSponsorManager"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type EventRow = {
  id: string
  slug: string
  title: string
}

type SponsorRow = {
  id: string
  event_id: string
  name: string
  logo_url: string | null
  website_url: string | null
  tier: string | null
  description: string | null
  sort_index: number | null
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

export default async function AdminEventAssetsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const eventQuery = supabaseAdmin.from("events").select("id,slug,title")
  const { data, error: eventError } = isUuid(id)
    ? await eventQuery.eq("id", id).maybeSingle()
    : await eventQuery.eq("slug", id).maybeSingle()
  const event = (data as EventRow | null) ?? null

  if (eventError) throw new Error(eventError.message)
  if (!event) notFound()

  const { data: sponsorRows, error: sponsorsError } = await supabaseAdmin
    .from("event_sponsors")
    .select("id,event_id,name,logo_url,website_url,tier,description,sort_index")
    .eq("event_id", event.id)
    .order("sort_index", { ascending: true })

  if (sponsorsError) throw new Error(sponsorsError.message)

  const sponsors = ((sponsorRows ?? []) as SponsorRow[]).map((sponsor) => ({
    ...sponsor,
    sort_index: sponsor.sort_index ?? 0,
  }))

  return (
    <div className="space-y-6 p-6 text-white">
      <section className="rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.12),transparent_38%),rgba(255,255,255,0.04)] p-8">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-100/50">
          Media Library
        </div>
        <h1 className="mt-3 text-3xl font-semibold">Media &amp; Sponsors</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/60">
          Manage the sponsor logos, partner links, tiers, and descriptions shown across {event.title}.
        </p>
      </section>

      <AdminEventSponsorManager eventId={event.id} initialSponsors={sponsors} />
    </div>
  )
}
