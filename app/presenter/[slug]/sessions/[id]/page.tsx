import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getEventBySlug } from "@/lib/events"
import { getSessionById } from "@/lib/repos/sessionsRepo"
import PresenterPageClient from "@/components/live/PresenterPageClient"
import {
  presenterAssignmentIsActive,
  verifyPresenterAccessToken,
} from "@/lib/presenterAccess"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const metadata: Metadata = {
  referrer: "no-referrer",
  robots: { index: false, follow: false },
}

export default async function PresenterSessionPage(props: {
  params: Promise<{ slug: string; id: string }>
  searchParams: Promise<{ access?: string }>
}) {
  const { slug, id } = await props.params
  const { access = "" } = await props.searchParams

  const event = await getEventBySlug(slug)
  if (!event) notFound()

  const session = await getSessionById(event.id, id)
  if (!session) notFound()

  const presenterAccess = verifyPresenterAccessToken(access)
  if (
    !presenterAccess ||
    presenterAccess.eventId !== String(event.id) ||
    presenterAccess.sessionId !== String(session.id) ||
    !(await presenterAssignmentIsActive(presenterAccess))
  ) {
    notFound()
  }

  return (
    <PresenterPageClient
      eventTitle={event.title}
      sessionTitle={session.title}
      sessionId={session.id}
      slug={slug}
      presenterAccessToken={access}
    />
  )
}
