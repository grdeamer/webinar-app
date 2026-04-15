import { supabaseAdmin } from "@/lib/supabase/admin"

export type EventRow = {
  id: string
  slug: string
  title: string
  description: string | null
  start_at: string | null
  end_at: string | null
}

export async function getEventBySlug(slug: string): Promise<EventRow> {
  const { data, error } = await supabaseAdmin
    .from("events")
    .select("id,slug,title,description,start_at,end_at")
    .eq("slug", slug)
    .order("start_at", { ascending: false, nullsFirst: true })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error(`Event not found for slug: ${slug}`)
  }

  return data as EventRow
}

export async function getEventById(id: string): Promise<EventRow> {
  const { data, error } = await supabaseAdmin
    .from("events")
    .select("id,slug,title,description,start_at,end_at")
    .eq("id", id)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error(`Event not found for id: ${id}`)
  }

  return data as EventRow
}

export async function listEvents(): Promise<EventRow[]> {
  const { data, error } = await supabaseAdmin
    .from("events")
    .select("id,slug,title,description,start_at,end_at")
    .order("start_at", { ascending: false, nullsFirst: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data || []) as EventRow[]
}