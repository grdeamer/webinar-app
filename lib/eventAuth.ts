import { cookies } from "next/headers"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { verifyAttendeeToken } from "@/lib/registration/tokens"
import { getActiveRegistrant } from "@/lib/registration/server"
import type { EventRow } from "@/lib/events"
import type { EventUser } from "@/lib/types"
export function eventEmailCookieName(slug: string) { return `evt_email_${slug}` }
export function eventUserCookieName(slug: string) { return `evt_user_${slug}` }
export async function getEventBySlugAdmin(slug: string): Promise<EventRow | null> {
  const { data, error } = await supabaseAdmin.from("events").select("id,slug,title,description,start_at,end_at").eq("slug", slug).maybeSingle()
  return error ? null : data as EventRow | null
}
export async function getEventEmailFromCookies(slug: string): Promise<string | null> {
  const identity = verifyAttendeeToken((await cookies()).get("user_token")?.value, slug)
  if (!identity) return null
  const event = await getEventBySlugAdmin(slug)
  if (!event || (identity.eventId && identity.eventId !== event.id)) return null
  return await getActiveRegistrant(event.id, identity.email) ? identity.email : null
}
export async function getEventUserIdFromCookies(slug: string): Promise<string | null> {
  const email = await getEventEmailFromCookies(slug)
  if (!email) return null
  const { data } = await supabaseAdmin.from("users").select("id").eq("email", email).maybeSingle()
  return data?.id ?? null
}
export async function getEventUserOrNull(opts: { slug: string }) {
  const email = await getEventEmailFromCookies(opts.slug)
  if (!email) return null
  const event = await getEventBySlugAdmin(opts.slug)
  if (!event) return null
  const { data } = await supabaseAdmin.from("users").select("id,email").eq("email", email).maybeSingle()
  // Imported people need no legacy event_attendees row to enter.
  const user: EventUser = { id: data?.id ?? "", email, username: null, role: null }
  return { event, user }
}
