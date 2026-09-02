import { notFound } from "next/navigation"
import { supabaseAdmin } from "@/lib/supabase/admin"
import AdminEventPageEditorPreview from "@/components/page-editor/AdminEventPageEditorPreview"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export default async function LegacyPageBuilderPage(props: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await props.params
  const { data: event } = await supabaseAdmin
    .from("events")
    .select("id")
    .eq("slug", slug)
    .maybeSingle()

  if (!event?.id) notFound()
  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-950">
      <AdminEventPageEditorPreview
        eventSlug={slug}
        eventAdminId={event.id}
      />
    </div>
  )
}
