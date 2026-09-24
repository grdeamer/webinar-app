import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  const headers = { "Cache-Control": "no-store, private" }
  if (error && (error.name === "AuthRetryableFetchError" || (error.status ?? 0) >= 500 || (!error.status && error.name !== "AuthSessionMissingError"))) {
    return NextResponse.json({ error: "Access check unavailable" }, { status: 503, headers })
  }
  if (error || !user) return NextResponse.json({ allowed: false }, { status: 401, headers })
  const { data: profile, error: profileError } = await supabaseAdmin.from("profiles")
    .select("role,is_active").eq("id", user.id).maybeSingle()
  // A temporary database outage is not evidence that the owner disabled access.
  if (profileError) return NextResponse.json({ error: "Access check unavailable" }, { status: 503, headers })
  const allowed = profile?.is_active !== false && ["admin", "event_member"].includes(profile?.role ?? "")
  return NextResponse.json({ allowed }, { status: allowed ? 200 : 403, headers })
}
