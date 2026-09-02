import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
}

function unauthorizedApi() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

async function requestEventId(req: NextRequest): Promise<string | null> {
  const queryId = req.nextUrl.searchParams.get("event_id") ?? req.nextUrl.searchParams.get("eventId")
  if (queryId) return queryId
  if (req.method === "GET" || req.method === "HEAD") return null

  const contentType = req.headers.get("content-type") ?? ""
  try {
    if (contentType.includes("application/json")) {
      const body = await req.clone().json()
      return String(body?.event_id ?? body?.eventId ?? (req.nextUrl.pathname === "/api/admin/events" ? body?.id : "") ?? "") || null
    }
    if (contentType.includes("multipart/form-data")) {
      const body = await req.clone().formData()
      return String(body.get("event_id") ?? body.get("eventId") ?? "") || null
    }
  } catch {
    return null
  }
  return null
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow the legacy admin login page path if it still exists.
  if (pathname === "/admin/login") {
    return NextResponse.next()
  }

  const res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value)
            res.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    if (pathname.startsWith("/api/admin/")) {
      return unauthorizedApi()
    }

    const url = req.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle()

  const isAdmin = profile?.role === "admin"
  const isEventMember = profile?.role === "event_member"
  const isActive = profile?.is_active !== false

  if (profileError || (!isAdmin && !isEventMember) || !isActive) {
    if (pathname.startsWith("/api/admin/")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const url = req.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }

  if (isEventMember) {
    if (pathname === "/admin/events" || pathname === "/api/admin/access-context") {
      return res
    }

    const pageEditorMatch = pathname.match(/^\/admin\/page-editor\/event\/([^/]+)$/)
    if (pageEditorMatch) {
      const { data: event } = await supabase.from("events").select("id").eq("slug", decodeURIComponent(pageEditorMatch[1])).maybeSingle()
      const { data: membership } = event ? await supabase.from("event_team_members").select("role,is_active").eq("event_id", event.id).eq("user_id", user.id).maybeSingle() : { data: null }
      if (membership?.is_active && membership.role === "event_admin") return res
      const url = req.nextUrl.clone()
      url.pathname = "/admin/events"
      return NextResponse.redirect(url)
    }

    const scopedApiPrefixes = [
      "/api/admin/event-agenda",
      "/api/admin/event-access",
      "/api/admin/event-display-sync",
      "/api/admin/event-survey",
      "/api/admin/event-sessions",
      "/api/admin/sessions/",
      "/api/admin/page-editor/event/",
      "/api/admin/page-editor/upload-",
      "/api/admin/events/import-",
    ]
    const isScopedApi = pathname === "/api/admin/events" || scopedApiPrefixes.some((prefix) => pathname.startsWith(prefix))
    if (isScopedApi) {
      let eventId = await requestEventId(req)
      const editorMatch = pathname.match(/^\/api\/admin\/page-editor\/event\/([^/]+)\/(?:elements|pages|collaboration)$/)
      if (!eventId && editorMatch) {
        const { data: event } = await supabase.from("events").select("id").eq("slug", decodeURIComponent(editorMatch[1])).maybeSingle()
        eventId = event?.id ?? null
      }
      const { data: membership } = eventId ? await supabase.from("event_team_members").select("role,is_active").eq("event_id", eventId).eq("user_id", user.id).maybeSingle() : { data: null }
      const producerEndpoint = ["/api/admin/event-agenda", "/api/admin/event-access", "/api/admin/event-display-sync", "/api/admin/event-survey"].some((prefix) => pathname.startsWith(prefix))
      if (membership?.is_active && (membership.role === "event_admin" || (membership.role === "producer" && producerEndpoint))) return res
      return NextResponse.json({ error: "Your event role does not allow this action." }, { status: 403 })
    }

    const pageMatch = pathname.match(/^\/admin\/events\/([^/]+)(?:\/(.*))?$/)
    const apiMatch = pathname.match(/^\/api\/admin\/events\/([^/]+)(?:\/(.*))?$/)
    const match = pageMatch ?? apiMatch

    if (!match) {
      if (pathname.startsWith("/api/admin/")) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      const url = req.nextUrl.clone()
      url.pathname = "/admin/events"
      return NextResponse.redirect(url)
    }

    const eventRef = decodeURIComponent(match[1])
    const { data: membership } = await supabase
      .from("event_team_members")
      .select("role,is_active,event_id")
      .eq("event_id", eventRef)
      .eq("user_id", user.id)
      .maybeSingle()

    if (!membership || membership.is_active === false) {
      if (apiMatch) return NextResponse.json({ error: "Event access denied" }, { status: 403 })
      const url = req.nextUrl.clone()
      url.pathname = "/admin/events"
      return NextResponse.redirect(url)
    }

    const suffix = match[2] ?? ""
    const role = membership.role as "event_admin" | "producer" | "viewer"
    const viewerPage = suffix === "" || suffix === "analytics"
    const producerPage = viewerPage || suffix === "agenda" || suffix === "routing" || suffix.startsWith("producer")
    const viewerApi = req.method === "GET" && ["workspace-context", "live-state"].includes(suffix)
    const producerApi = viewerApi || suffix.startsWith("live/") || suffix.startsWith("producer/")
    const allowed = apiMatch
      ? role === "event_admin" || (role === "producer" ? producerApi : viewerApi)
      : role === "event_admin" || (role === "producer" ? producerPage : viewerPage)

    if (!allowed) {
      if (apiMatch) return NextResponse.json({ error: "Your event role does not allow this action." }, { status: 403 })
      const url = req.nextUrl.clone()
      url.pathname = `/admin/events/${eventRef}`
      return NextResponse.redirect(url)
    }
  }

  return res
}
