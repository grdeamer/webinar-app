import Link from "next/link"
import NetworkingRoom from "@/components/NetworkingRoom"
import { getEventBySlug } from "@/lib/events"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export default async function EventNetworkingPage(props: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await props.params
  const event = await getEventBySlug(slug)

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-4xl font-semibold mb-6">{event.title} Networking</h1>

        <NetworkingRoom eventSlug={slug} />

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
