import Link from "next/link"
import { getEventBySlug } from "@/lib/events"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export default async function EventOnDemandPage(props: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await props.params
  const event = await getEventBySlug(slug)

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-white/50">
              On-Demand
            </div>
            <h1 className="mt-2 text-4xl font-semibold">{event.title}</h1>
            <p className="mt-3 max-w-2xl text-white/65">
              Watch recorded sessions, replay featured content, and revisit key
              presentations from this event.
            </p>
          </div>

          <Link
            href={`/events/${slug}`}
            className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10"
          >
            Back to event
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <section className="md:col-span-2 rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-4 text-sm uppercase tracking-[0.25em] text-cyan-300/80">
              Library
            </div>

            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-8 text-white/65">
              No on-demand sessions yet.
            </div>
          </section>

          <aside className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-4 text-sm uppercase tracking-[0.25em] text-white/50">
              Coming soon
            </div>

            <div className="space-y-3 text-sm text-white/70">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                Session recordings
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                Keynote replay
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                Downloadable materials
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}