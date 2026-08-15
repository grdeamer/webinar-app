import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { lookupGeoFromHeaders } from "@/lib/app/geo"
import { cleanName, cleanQuestion } from "@/lib/qa"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export async function POST(req: Request): Promise<Response> {
  try {
    const body = (await req.json().catch((): null => null)) as
      | {
          room_key?: string
          event_id?: string
          name?: string
          question?: string
        }
      | null

    const eventId = String(body?.event_id || "").trim()
    const roomKey = String(body?.room_key || "").trim()
    const question = cleanQuestion(body?.question).slice(0, 800)
    const sessionMatch = /^session:([0-9a-f-]{36})$/i.exec(roomKey)

    if (!isUuid(eventId) || !sessionMatch || !isUuid(sessionMatch[1]) || !question) {
      return NextResponse.json(
        { error: "This Q&A room is not available." },
        { status: 400 }
      )
    }

    const [{ data: session }, { data: settings }] = await Promise.all([
      supabaseAdmin
        .from("event_sessions")
        .select("id")
        .eq("id", sessionMatch[1])
        .eq("event_id", eventId)
        .maybeSingle(),
      supabaseAdmin
        .from("qa_room_settings")
        .select("is_locked")
        .eq("room_key", roomKey)
        .maybeSingle(),
    ])

    if (!session) {
      return NextResponse.json({ error: "This Q&A room is not available." }, { status: 404 })
    }
    if (settings?.is_locked) {
      return NextResponse.json({ error: "Q&A is currently closed." }, { status: 403 })
    }

    const geo = lookupGeoFromHeaders(req.headers)

    const { error } = await supabaseAdmin
      .from("qa_messages")
      .insert({
        room_key: roomKey,
        event_id: eventId,
        name: cleanName(body.name) ?? "Anonymous",
        question,
        status: "pending",
        is_featured: false,

        origin_region: geo.region,
        origin_country: geo.country,
        origin_city: geo.city,
        origin_lat: geo.lat,
        origin_lng: geo.lng,
        origin_source: geo.source,
      })

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to submit question",
      },
      { status: 500 }
    )
  }
}
