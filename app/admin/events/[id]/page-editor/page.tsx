import { notFound, redirect } from "next/navigation"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export default async function EventPageEditorRedirect(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params

  const { data: event } = await supabaseAdmin
    .from("events")
    .select("slug")
    .eq("id", id)
    .single()

  if (!event?.slug) {
    notFound()
  }

  redirect(`/admin/page-editor/event/${event.slug}`)
}