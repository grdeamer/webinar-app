import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { lookupGeoFromIp } from "@/lib/app/geo"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request): Promise<Response> {
  try {
    const body = (await req.json().catch((): null => null)) as
      | {
          room_key?: string
          event_id?: string
          name?: string
          question?: string
          origin_lat?: number | null
          origin_lng?: number | null
        }
      | null

    if (!body?.room_key || !body?.question) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const forwardedFor = req.headers.get("x-forwarded-for")
    const realIp = req.headers.get("x-real-ip")

    const ip =
      forwardedFor?.split(",")[0]?.trim() ||
      realIp?.trim() ||
      null

    const hasBrowserLat =
      typeof body.origin_lat === "number" && Number.isFinite(body.origin_lat)
    const hasBrowserLng =
      typeof body.origin_lng === "number" && Number.isFinite(body.origin_lng)

    const browserLat = hasBrowserLat ? body.origin_lat : null
    const browserLng = hasBrowserLng ? body.origin_lng : null

    const geo =
      browserLat !== null && browserLng !== null
        ? {
            region: null,
            country: null,
            city: null,
            lat: browserLat,
            lng: browserLng,
            source: "browser",
          }
        : await lookupGeoFromIp(ip)

    const { error } = await supabaseAdmin
      .from("qa_messages")
      .insert({
        room_key: body.room_key,
        event_id: body.event_id ?? null,
        name: body.name ?? "Anonymous",
        question: body.question,
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