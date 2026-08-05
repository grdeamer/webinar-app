import { notFound } from "next/navigation"
import { supabaseAdmin } from "@/lib/supabase/admin"
import EventSettingsForm from "./ui"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type PageProps = {
  params: Promise<{ id: string }>
}

type EventSettingsRow = {
  id: string
  slug: string
  title: string
  description: string | null
  start_at: string | null
  end_at: string | null
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

export default async function EventSettingsPage({ params }: PageProps) {
  const { id } = await params
  const query = supabaseAdmin
    .from("events")
    .select("id,slug,title,description,start_at,end_at")

  const { data, error } = isUuid(id)
    ? await query.eq("id", id).maybeSingle()
    : await query.eq("slug", id).maybeSingle()

  if (error || !data) notFound()

  return <EventSettingsForm initial={data as EventSettingsRow} />
}
