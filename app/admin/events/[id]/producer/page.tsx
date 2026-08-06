import { redirect } from "next/navigation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export default async function AdminProducerPage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params

  redirect(`/admin/events/${id}/producer/room`)
}
