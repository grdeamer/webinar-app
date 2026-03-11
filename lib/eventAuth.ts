import { cookies } from "next/headers"
import { supabaseAdmin } from "@/lib/supabase/admin"
import type { EventRow } from "@/lib/events"
import type { EventUser } from "@/lib/types"

export function eventEmailCookieName(slug: string) {
  return `evt_email_${slug}`
}

export async function getEventBySlugAdmin(slug: string): Promise<EventRow | null> {
  const { data } = await supabaseAdmin
    .from("events")
    .select("id,slug,title,description,start_at,end_at")
    .eq("slug", slug)
    .maybeSingle()

  return (data as EventRow | null) ?? null
}

export async function getEventEmailFromCookies(slug: string): Promise<string | null> {
  const c = await cookies()
  const v = c.get(eventEmailCookieName(slug))?.value || null
  return v ? v.toLowerCase() : null
}

async function hasEventAccess(eventId: string, userId: string) {
  const { data: scoped } = await supabaseAdmin
    .from("event_user_webinars")
    .select("webinar_id")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .limit(1)

  if ((scoped?.length ?? 0) > 0) return true

  try {
    const { data: attendee } = await supabaseAdmin
      .from("event_attendees")
      .select("event_id,user_id")
      .eq("event_id", eventId)
      .eq("user_id", userId)
      .maybeSingle()

    return Boolean(attendee)
  } catch {
    return false
  }
}

export async function getEventUserOrNull(opts: { slug: string }) {
  const email = await getEventEmailFromCookies(opts.slug)
  if (!email) return null

  const event = await getEventBySlugAdmin(opts.slug)
  if (!event) return null

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id,email,username,role")
    .eq("email", email)
    .maybeSingle()

  if (!user) return null

  const typedUser = user as EventUser

  const allowed = await hasEventAccess(event.id, typedUser.id)
  if (!allowed) return null

  return { event, user: typedUser }
}
