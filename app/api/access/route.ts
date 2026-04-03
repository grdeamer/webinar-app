import { NextResponse } from "next/server"
import crypto from "crypto"
import jwt from "jsonwebtoken"
import { supabaseAdmin } from "../../../lib/supabaseAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type EventRegistrantRow = {
  id: string
  event_id: string
  email: string
}

type EventAttendeeRow = {
  event_id: string
  user_id: string
}

type EventRow = {
  id: string
  slug: string
  title: string | null
  start_at?: string | null
  created_at?: string | null
}

export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch((): null => null)
    const emailRaw = body?.email

    if (typeof emailRaw !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const email = emailRaw.trim().toLowerCase()
    if (!email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 })
    }

    const JWT_SECRET = process.env.JWT_SECRET
    if (!JWT_SECRET) {
      return NextResponse.json({ error: "JWT_SECRET missing" }, { status: 500 })
    }

    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .upsert({ email }, { onConflict: "email" })
      .select("id,email")
      .single()

    if (userError || !user) {
      console.error("access upsert user error:", userError)
      return NextResponse.json(
        { error: userError?.message || "Unable to access" },
        { status: 500 }
      )
    }

    let eventSlug: string | null = null
    let eventId: string | null = null

    const { data: registrants, error: registrantsError } = await supabaseAdmin
      .from("event_registrants")
      .select("id,event_id,email")
      .eq("email", email)

    if (registrantsError) {
      console.error("access registrants lookup error:", registrantsError)
    }

    if (registrants && registrants.length > 0) {
      const eventIds = Array.from(
        new Set(
          (registrants as EventRegistrantRow[])
            .map((row) => row.event_id)
            .filter(Boolean)
        )
      )

      if (eventIds.length > 0) {
        const { data: events, error: eventsError } = await supabaseAdmin
          .from("events")
          .select("id,slug,title,start_at,created_at")
          .in("id", eventIds)

        if (eventsError) {
          console.error("access events lookup error:", eventsError)
        }

        const pickedEvent =
          ((events || []) as EventRow[]).sort((a, b) => {
            const aTime = a.start_at
              ? new Date(a.start_at).getTime()
              : a.created_at
                ? new Date(a.created_at).getTime()
                : 0
            const bTime = b.start_at
              ? new Date(b.start_at).getTime()
              : b.created_at
                ? new Date(b.created_at).getTime()
                : 0
            return bTime - aTime
          })[0] || null

        if (pickedEvent?.slug) {
          eventSlug = pickedEvent.slug
          eventId = pickedEvent.id
        }
      }
    }

    if (!eventSlug) {
      const { data: eventAttendees, error: eventAttendeesError } = await supabaseAdmin
        .from("event_attendees")
        .select("event_id,user_id")
        .eq("user_id", user.id)

      if (eventAttendeesError) {
        console.error("access event_attendees lookup error:", eventAttendeesError)
      }

      if (eventAttendees && eventAttendees.length > 0) {
        const eventIds = Array.from(
          new Set(
            (eventAttendees as EventAttendeeRow[])
              .map((row) => row.event_id)
              .filter(Boolean)
          )
        )

        if (eventIds.length > 0) {
          const { data: events, error: eventsError } = await supabaseAdmin
            .from("events")
            .select("id,slug,title,start_at,created_at")
            .in("id", eventIds)

          if (eventsError) {
            console.error("access legacy events lookup error:", eventsError)
          }

          const pickedEvent =
            ((events || []) as EventRow[]).sort((a, b) => {
              const aTime = a.start_at
                ? new Date(a.start_at).getTime()
                : a.created_at
                  ? new Date(a.created_at).getTime()
                  : 0
              const bTime = b.start_at
                ? new Date(b.start_at).getTime()
                : b.created_at
                  ? new Date(b.created_at).getTime()
                  : 0
              return bTime - aTime
            })[0] || null

          if (pickedEvent?.slug) {
            eventSlug = pickedEvent.slug
            eventId = pickedEvent.id
          }
        }
      }
    }

    if (!eventSlug) {
      return NextResponse.json(
        {
          error:
            "No event access found for this email. Make sure this attendee is assigned to an event.",
        },
        { status: 403 }
      )
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: "30d",
    })

    const res = NextResponse.json({
      success: true,
      slug: eventSlug,
      event_id: eventId,
    })

    res.cookies.set({
      name: "user_token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    })

    res.cookies.set({
      name: `evt_email_${eventSlug}`,
      value: email,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: `/events/${eventSlug}`,
      maxAge: 60 * 60 * 24 * 7,
    })

    const sessionId = crypto.randomUUID()
    const ua = req.headers.get("user-agent") || null

    res.cookies.set({
      name: "attendee_session_id",
      value: sessionId,
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    })

    const { error: pErr } = await supabaseAdmin.from("attendee_sessions").upsert(
      {
        session_id: sessionId,
        user_id: user.id,
        email: user.email,
        last_seen: new Date().toISOString(),
        user_agent: ua,
      },
      { onConflict: "session_id" }
    )

    if (pErr) {
      console.error("presence upsert error:", pErr)
    }

    return res
  } catch (err) {
    console.error("access route error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}