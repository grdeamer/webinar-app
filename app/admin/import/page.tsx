import { supabaseAdmin } from "@/lib/supabase/admin"
import AdminHeader from "@/components/admin/AdminHeader"
import ImportRegistrantsClient from "./ImportRegistrantsClient"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export default async function AdminImportPage(props: {
  searchParams?: Promise<{ eventId?: string }>
}) {
  const searchParams = (await props.searchParams) ?? {}
  const initialSelectedEventId = searchParams.eventId ?? ""

  const { data: events, error } = await supabaseAdmin
    .from("events")
    .select("id,slug,title,start_at")
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Registrant Session Import"
        subtitle="Upload a CSV to assign registrants to an event and one or more sessions."
      />

      <ImportRegistrantsClient
        initialEvents={(events || []) as any[]}
        initialSelectedEventId={initialSelectedEventId}
      />
    </div>
  )
}