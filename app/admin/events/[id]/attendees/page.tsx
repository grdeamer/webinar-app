import { notFound } from "next/navigation"
import { supabaseAdmin } from "@/lib/supabase/admin"
import PeopleClient from "./PeopleClient"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export default async function PeoplePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: event, error } = await supabaseAdmin
    .from("events")
    .select("id,slug,title")
    .eq("id", id)
    .maybeSingle()

  if (error || !event) notFound()
  return <PeopleClient eventId={event.id} eventSlug={event.slug} eventTitle={event.title} />
}
