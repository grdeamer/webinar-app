import { notFound } from "next/navigation"
import { supabaseAdmin } from "@/lib/supabase/admin"
import CommunicationsClient from "./CommunicationsClient"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export default async function EventEmailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [{ data: event }, { data: people }, { data: assignments }] = await Promise.all([
    supabaseAdmin.from("events").select("id,title").eq("id", id).maybeSingle(),
    supabaseAdmin.from("event_registrants").select("id,email,tag").eq("event_id", id),
    supabaseAdmin.from("event_registrant_sessions").select("registrant_id").eq("event_id", id),
  ])

  if (!event) notFound()
  const presenterIds = new Set((people || []).filter((person) => String(person.tag || "").toLowerCase().includes("presenter")).map((person) => person.id))
  const assignedPresenterIds = new Set((assignments || []).map((assignment) => assignment.registrant_id).filter((id) => presenterIds.has(id)))
  const missingEmails = (people || []).filter((person) => !String(person.email || "").includes("@")).length

  return <CommunicationsClient eventId={id} eventTitle={event.title} counts={{
    everyone: people?.length || 0,
    presenters: presenterIds.size,
    presentersMissingSessions: presenterIds.size - assignedPresenterIds.size,
    missingEmails,
  }} />
}
