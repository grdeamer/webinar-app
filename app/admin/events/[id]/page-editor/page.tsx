import { notFound } from "next/navigation"
import AdminEventPageEditorPreview from "@/components/page-editor/AdminEventPageEditorPreview"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export default async function EventPageEditorPage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params

  const { data: event } = await supabaseAdmin
    .from("events")
    .select("id, slug")
    .eq("id", id)
    .single()

  if (!event?.slug) {
    notFound()
  }

  return (
    <AdminEventPageEditorPreview
      eventSlug={event.slug}
      eventAdminId={event.id}
    />
  )
}
