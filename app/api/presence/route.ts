import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const { event_id, user_id } = body

    if (!event_id || !user_id) {
      return new Response("Missing data", { status: 400 })
    }

    await supabaseAdmin
      .from("event_presence")
      .upsert(
        {
          event_id,
          user_id,
          last_seen: new Date().toISOString(),
        },
        { onConflict: "event_id,user_id" }
      )

    return new Response("ok", { status: 200 })
  } catch (err) {
    console.error("Presence error:", err)
    return new Response("error", { status: 500 })
  }
}