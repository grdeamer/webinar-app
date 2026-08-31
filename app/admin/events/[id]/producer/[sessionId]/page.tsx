import { redirect } from "next/navigation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export default async function ProducerSessionRedirectPage(props: {
  params: Promise<{ id: string; sessionId: string }>
}) {
  const { id, sessionId } = await props.params
  redirect(`/admin/events/${id}/sessions/${sessionId}/producer`)
}
