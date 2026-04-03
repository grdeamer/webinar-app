import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { eventEmailCookieName, eventUserCookieName } from "@/lib/eventAuth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

async function getUserByEmail(email: string) {
  const normalized = email.trim().toLowerCase()

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id,email")
    .ilike("email", normalized)
    .maybeSingle()

  if (error) {
    console.error("login getUserByEmail failed:", error.message)
    return null
  }

  return data ?? null
}

export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch((): null => null)
    const slug = String(body?.slug || "").trim()
    const emailRaw = String(body?.email || "").trim().toLowerCase()

    if (!slug) {
      return NextResponse.json({ error: "Missing event slug" }, { status: 400 })
    }

    if (!emailRaw || !emailRaw.includes("@")) {
      return NextResponse.json({ error: "Enter a valid email" }, { status: 400 })
    }

    const { data: event, error: eventError } = await supabaseAdmin
      .from("events")
      .select("id,slug,title")
      .eq("slug", slug)
      .maybeSingle()

    if (eventError) {
      return NextResponse.json({ error: eventError.message }, { status: 400 })
    }

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    const user = await getUserByEmail(emailRaw)

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Email not found for this event. Make sure you were added in the admin tools or CSV import.",
        },
        { status: 403 }
      )
    }

    const response = NextResponse.json({
      ok: true,
      slug,
      email: emailRaw,
      userId: user.id,
    })

    response.cookies.set(eventEmailCookieName(slug), emailRaw, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    })

    response.cookies.set(eventUserCookieName(slug), user.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    })

    response.cookies.set("evt_email_last", emailRaw, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    })

    response.cookies.set("evt_user_last", user.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    })

    return response
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Login failed" }, { status: 400 })
  }
}