import { cookies } from "next/headers"
import { supabaseAdmin } from "@/lib/supabase/admin"
import type { EventRow } from "@/lib/events"
import type { EventUser } from "@/lib/types"

export function eventEmailCookieName(slug: string) {
  return `evt_email_${slug}`
}

export function eventUserCookieName(slug: string) {
  return `evt_user_${slug}`
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

  const exact = c.get(eventEmailCookieName(slug))?.value || null
  if (exact) return exact.trim().toLowerCase()

  const fallback = c.get("evt_email_last")?.value || null
  if (fallback) return fallback.trim().toLowerCase()

  return null
}

export async function getEventUserIdFromCookies(slug: string): Promise<string | null> {
  const c = await cookies()

  const exact = c.get(eventUserCookieName(slug))?.value || null
  if (exact) return exact

  const fallback = c.get("evt_user_last")?.value || null
  if (fallback) return fallback

  return null
}

async function hasEventAccess(eventId: string, userId: string) {
  const { data: scoped } = await supabaseAdmin
    .from("event_user_webinars")
    .select("webinar_id")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .limit(1)

  if ((scoped?.length ?? 0) > 0) return true

  const { data: attendeeByUser } = await supabaseAdmin
    .from("event_attendees")
    .select("event_id")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle()

  if (attendeeByUser) return true

  return false
}

export async function getEventUserOrNull(opts: { slug: string }) {
  const userId = await getEventUserIdFromCookies(opts.slug)
  if (!userId) return null

  const event = await getEventBySlugAdmin(opts.slug)
  if (!event) return null

  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select("id,email")
    .eq("id", userId)
    .maybeSingle()

  if (error) {
    console.error("getEventUserOrNull user lookup failed:", error.message)
    return null
  }

  if (!user) return null

  const typedUser: EventUser = {
    id: user.id,
    email: user.email,
    username: null,
    role: null,
  }

  const allowed = await hasEventAccess(event.id, typedUser.id)

  if (!allowed) return null

  return { event, user: typedUser }
}