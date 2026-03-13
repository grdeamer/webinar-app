import { supabaseAdmin } from "@/lib/supabase/admin"
import AdminHeader from "@/components/admin/AdminHeader"
import ImportRegistrantsClient from "./ImportRegistrantsClient"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type SearchParams = {
  eventId?: string
}

type EventOption = {
  id: string
  slug: string
  title: string | null
  start_at: string | null
}

export default async function AdminImportPage(props: {
  searchParams?: Promise<SearchParams>
}) {
  const searchParams = (await props.searchParams) ?? {}
  const initialSelectedEventId = searchParams.eventId ?? ""

  const { data, error } = await supabaseAdmin
    .from("events")
    .select("id,slug,title,start_at")
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  const events: EventOption[] = (data || []).map((row) => ({
    id: String(row.id),
    slug: String(row.slug),
    title: row.title ? String(row.title) : null,
    start_at: row.start_at ? String(row.start_at) : null,
  }))

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Registrant Session Import"
        subtitle="Upload a CSV to assign registrants to an event and one or more session codes."
      />

      <ImportRegistrantsClient
        initialEvents={events}
        initialSelectedEventId={initialSelectedEventId}
      />
    </div>
  )
}