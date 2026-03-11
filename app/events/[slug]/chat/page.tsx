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
        <h1 className="text-4xl font-semibold mb-6">{event.title} Chat</h1>

        <EventChatRoom eventSlug={slug} roomKey="general" />

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
