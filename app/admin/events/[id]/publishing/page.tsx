import ExternalPublishingClient from "./ui"
import { requireEventPageFeature } from "@/lib/eventTeamAccess"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export default async function PublishingPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  await requireEventPageFeature(id, "publishing")
  return <ExternalPublishingClient eventId={id} />
}
