import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/requireAdmin"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function pageActivity(path: string) {
  const normalizedPath = path.split(/[?#]/, 1)[0].slice(0, 240)
  const eventMatch = normalizedPath.match(/^\/admin\/events\/([^/]+)/)
  const rawEventId = eventMatch?.[1] ? decodeURIComponent(eventMatch[1]) : null
  const eventId = rawEventId && UUID_PATTERN.test(rawEventId) ? rawEventId : null

  if (normalizedPath === "/admin") return { label: "Viewed Mission Control", path: normalizedPath, eventId }
  if (normalizedPath === "/admin/events") return { label: "Viewed the event directory", path: normalizedPath, eventId }
  if (normalizedPath === "/admin/users") return { label: "Viewed Team & Access", path: normalizedPath, eventId }
  if (normalizedPath === "/admin/activity") return { label: "Viewed Live Activity", path: normalizedPath, eventId }
  if (normalizedPath === "/admin/cloud") return { label: "Viewed Jupiter Cloud", path: normalizedPath, eventId }
  if (/\/producer(?:\/|$)/.test(normalizedPath)) return { label: "Opened the Producer Room", path: normalizedPath, eventId }
  if (/\/agenda(?:\/|$)/.test(normalizedPath)) return { label: "Opened Run of Show", path: normalizedPath, eventId }
  if (/\/attendees(?:\/|$)/.test(normalizedPath)) return { label: "Viewed People", path: normalizedPath, eventId }
  if (/\/program(?:\/|$)/.test(normalizedPath)) return { label: "Viewed Program", path: normalizedPath, eventId }
  if (/\/districts(?:\/|$)/.test(normalizedPath)) return { label: "Viewed Districts", path: normalizedPath, eventId }
  if (/\/communications(?:\/|$)/.test(normalizedPath)) return { label: "Viewed Communications", path: normalizedPath, eventId }
  if (/\/publish(?:\/|$)/.test(normalizedPath)) return { label: "Viewed Publishing", path: normalizedPath, eventId }
  if (eventMatch) return { label: "Opened an event workspace", path: normalizedPath, eventId }
  return { label: "Viewed an administrative page", path: normalizedPath, eventId }
}

export async function GET(request: NextRequest) {
  const { profile } = await requireAdmin()
  if (profile.team_role !== "owner") {
    return NextResponse.json({ error: "Only the account owner can view user activity." }, { status: 403 })
  }

  const userId = request.nextUrl.searchParams.get("userId") ?? ""
  if (!UUID_PATTERN.test(userId)) {
    return NextResponse.json({ error: "A valid user is required." }, { status: 400 })
  }

  await supabaseAdmin
    .from("admin_user_activity")
    .delete()
    .eq("user_id", userId)
    .lt("created_at", new Date(Date.now() - 90 * 24 * 60 * 60_000).toISOString())

  const [{ data, error }, authResult] = await Promise.all([
    supabaseAdmin
      .from("admin_user_activity")
      .select("id,action,label,path,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(40),
    supabaseAdmin.auth.admin.getUserById(userId),
  ])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const activity = [...(data ?? [])]
  const lastSignInAt = authResult.data.user?.last_sign_in_at ?? null
  const hasMatchingSignIn = lastSignInAt && activity.some((item) => item.action === "sign_in" && Math.abs(new Date(item.created_at).getTime() - new Date(lastSignInAt).getTime()) < 5 * 60_000)
  if (lastSignInAt && !hasMatchingSignIn) {
    activity.push({ id: "auth-last-sign-in", action: "sign_in", label: "Signed in to Jupiter", path: null, created_at: lastSignInAt })
    activity.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  return NextResponse.json({ activity: activity.slice(0, 40) })
}

export async function POST(request: NextRequest) {
  const { user } = await requireAdmin()
  const body = await request.json().catch(() => null)
  const action = body?.action === "sign_in" ? "sign_in" : body?.action === "view_page" ? "view_page" : null
  if (!action) return NextResponse.json({ error: "Unsupported activity." }, { status: 400 })

  const activity = action === "sign_in"
    ? { label: "Signed in to Jupiter", path: null as string | null, eventId: null as string | null }
    : pageActivity(typeof body?.path === "string" ? body.path : "/admin")

  await supabaseAdmin
    .from("admin_user_activity")
    .delete()
    .eq("user_id", user.id)
    .lt("created_at", new Date(Date.now() - 90 * 24 * 60 * 60_000).toISOString())

  const since = new Date(Date.now() - 60_000).toISOString()
  const duplicateQuery = supabaseAdmin
    .from("admin_user_activity")
    .select("id")
    .eq("user_id", user.id)
    .eq("action", action)
    .gte("created_at", since)
    .limit(1)
  const { data: duplicate } = activity.path
    ? await duplicateQuery.eq("path", activity.path)
    : await duplicateQuery.is("path", null)

  if (!duplicate?.length) {
    const { error } = await supabaseAdmin.from("admin_user_activity").insert({
      user_id: user.id,
      event_id: activity.eventId,
      action,
      label: activity.label,
      path: activity.path,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
