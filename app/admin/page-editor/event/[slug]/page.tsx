import { notFound, redirect } from "next/navigation"
import { supabaseAdmin } from "@/lib/supabase/admin"

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
  redirect(`/admin/events/${event.id}/page-editor`)
}
