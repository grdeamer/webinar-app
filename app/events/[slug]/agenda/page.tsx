import Link from "next/link"
import { getEventBySlug } from "@/lib/events"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export default async function EventAgendaPage(props: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await props.params
  const event = await getEventBySlug(slug)

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-4xl font-semibold mb-6">{event.title} Agenda</h1>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-white/70">
          No agenda items yet.
        </div>

        <Link
          href={`/events/${slug}`}
          className="inline-block mt-6 text-cyan-300"
        >
          ← Back to event
        </Link>
      </div>
    </main>
  )
}