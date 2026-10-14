import { requireEventPageFeature } from "@/lib/eventTeamAccess"
import { supabaseAdmin } from "@/lib/supabase/admin"
import RegistrationManager from "./RegistrationManager"
export default async function RegistrationManagement({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireEventPageFeature(id, "people")
  const { data, error } = await supabaseAdmin.from("event_registrants").select("id,email,first_name,last_name,registration_status,registration_answers").eq("event_id", id).in("registration_status", ["pending_approval", "waitlisted"]).order("created_at").limit(500)
  if (error) throw new Error("Unable to load registrations")
  return <main className="space-y-5 p-6"><h1 className="text-2xl font-semibold">Registration review</h1><p>Approve registrations and promote waitlisted attendees when seats are available. Showing the oldest 500 pending requests.</p><RegistrationManager eventId={id} people={data ?? []} /></main>
}
