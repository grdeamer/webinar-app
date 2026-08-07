import ExternalPublishingClient from "./ui"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export default async function PublishingPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  return <ExternalPublishingClient eventId={id} />
}
