import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/requireAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

function normEmail(v: unknown) {
  return typeof v === "string" ? v.trim().toLowerCase() : ""
}

function cleanOptionalString(v: unknown) {
  if (typeof v !== "string") return null
  const s = v.trim()
  return s ? s : null
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof Response) return auth

    const { id: event_id } = await context.params
    const body = await req.json().catch(() => ({}))

    const email = normEmail(body.email)
    const first_name = cleanOptionalString(body.first_name)
    const last_name = cleanOptionalString(body.last_name)

    if (!email || !email.includes("@")) {
      return json({ error: "Valid email required" }, 400)
    }

    // 1️⃣ users table (KEEP SIMPLE — no first/last here)
    const { data: user, error: userErr } = await supabaseAdmin
      .from("users")
      .upsert(
        { email },
        { onConflict: "email" }
      )
      .select("id,email")
      .single()

    if (userErr || !user?.id) {
      return json({ error: userErr?.message || "User upsert failed" }, 400)
    }

    // 2️⃣ event_attendees (legacy / access control)
    const { error: attendeeErr } = await supabaseAdmin
      .from("event_attendees")
      .upsert(
        {
          event_id,
          user_id: user.id,
        },
        { onConflict: "event_id,user_id" }
      )

    if (attendeeErr) {
      return json({ error: attendeeErr.message }, 400)
    }

    // ✅ 3️⃣ CRITICAL FIX: event_registrants (what UI reads)
    const { error: registrantErr } = await supabaseAdmin
      .from("event_registrants")
      .upsert(
        {
          event_id,
          email,
          first_name,
          last_name,
        },
        { onConflict: "event_id,email" }
      )

    if (registrantErr) {
      return json({ error: registrantErr.message }, 400)
    }

    return json({
      success: true,
      attendee: {
        user_id: user.id,
        email,
        first_name,
        last_name,
      },
    })
  } catch (err: any) {
    console.error("add-attendee error:", err)
    return json({ error: err?.message || "Server error" }, 500)
  }
}