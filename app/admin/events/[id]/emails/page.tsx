import { notFound } from "next/navigation"
import { supabaseAdmin } from "@/lib/supabase/admin"
import CommunicationsClient from "./CommunicationsClient"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export default async function EventEmailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [{ data: event, error: eventError }, { data: people, error: peopleError }, { data: assignments, error: assignmentsError }, { data: history, error: historyError }] = await Promise.all([
    supabaseAdmin.from("events").select("id,title").eq("id", id).maybeSingle(),
    supabaseAdmin.from("event_registrants").select("id,email,tag").eq("event_id", id),
    supabaseAdmin.from("event_registrant_sessions").select("registrant_id").eq("event_id", id),
    supabaseAdmin.from("event_email_campaigns").select("id,campaign_type,mode,status,recipient_count,accepted_count,failed_count,created_at").eq("event_id", id).order("created_at", { ascending: false }).limit(8),
  ])

  if (eventError || !event) notFound()
  if (peopleError || assignmentsError || historyError) {
    throw new Error(peopleError?.message || assignmentsError?.message || historyError?.message || "Unable to load communications")
  }
  const presenterIds = new Set((people || []).filter((person) => String(person.tag || "").toLowerCase().includes("presenter")).map((person) => person.id))
  const assignedPresenterIds = new Set((assignments || []).map((assignment) => assignment.registrant_id).filter((id) => presenterIds.has(id)))
  const missingEmails = (people || []).filter((person) => !String(person.email || "").includes("@")).length

  const uniqueValidEmails = new Set((people || []).map((person) => String(person.email || "").trim().toLowerCase()).filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))

  return <CommunicationsClient eventId={id} eventTitle={event.title} counts={{
    everyone: people?.length || 0,
    sendable: uniqueValidEmails.size,
    presenters: presenterIds.size,
    presentersMissingSessions: presenterIds.size - assignedPresenterIds.size,
    missingEmails,
  }} history={history || []} />
}
