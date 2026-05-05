import { notFound } from "next/navigation"
import { getEventBySlug } from "@/lib/events"
import { getSessionById } from "@/lib/repos/sessionsRepo"
import PresenterPageClient from "@/components/live/PresenterPageClient"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export default async function PresenterSessionPage(props: {
  params: Promise<{ slug: string; id: string }>
}) {
  const { slug, id } = await props.params

  const event = await getEventBySlug(slug)
  if (!event) notFound()

  const session = await getSessionById(event.id, id)
  if (!session) notFound()

  return (
    <PresenterPageClient
      eventTitle={event.title}
      sessionTitle={session.title}
      sessionId={session.id}
      slug={slug}
    />
  )
}