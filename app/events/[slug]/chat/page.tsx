import Link from "next/link"
import EventChatRoom from "@/components/EventChatRoom"
import { getEventBySlug } from "@/lib/events"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export default async function EventChatPage(props: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await props.params
  const event = await getEventBySlug(slug)

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-6">
          <div className="text-xs uppercase tracking-[0.28em] text-white/45">
            Engage
          </div>
          <h1 className="mt-2 text-4xl font-semibold">{event.title} Engage</h1>
          <p className="mt-3 max-w-2xl text-white/60">
            Event-wide conversation lives here. Chat, audience energy, and shared discussion
            belong to the whole event experience.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 md:p-6">
          <EventChatRoom eventSlug={slug} roomKey="general" />
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