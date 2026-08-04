import { NextResponse } from "next/server"
import { getEventBySlug } from "@/lib/events"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const allowedOrigin = "https://letstrainonline.live"

const responseHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Vary: "Origin",
}

function json(data: unknown, status = 200): Response {
  return NextResponse.json(data, { status, headers: responseHeaders })
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: responseHeaders })
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { slug } = await context.params

  try {
    const event = await getEventBySlug(slug)

    const [liveStateResult, agendaResult] = await Promise.all([
      supabaseAdmin
        .from("event_live_state")
        .select("updated_at")
        .eq("event_id", event.id)
        .maybeSingle(),
      supabaseAdmin
        .from("event_agenda_items")
        .select(
          "id,title,description,speaker,track,location,start_at,end_at,sort_index,status,button_text,button_url,is_visible,updated_at"
        )
        .eq("event_id", event.id)
        .eq("is_visible", true)
        .order("start_at", { ascending: true })
        .order("sort_index", { ascending: true }),
    ])

    if (liveStateResult.error) {
      return json({ error: liveStateResult.error.message }, 500)
    }

    if (agendaResult.error) {
      return json({ error: agendaResult.error.message }, 500)
    }

    return json({
      event: {
        id: event.id,
        slug: event.slug,
        title: event.title,
      },
      sync_token: liveStateResult.data?.updated_at ?? null,
      agenda: agendaResult.data || [],
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load event runtime"
    const status = message.startsWith("Event not found") ? 404 : 500
    return json({ error: message }, status)
  }
}
