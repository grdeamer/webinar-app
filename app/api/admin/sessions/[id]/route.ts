import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/requireAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type RouteContext = {
  params: Promise<{ id: string }>
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

export async function DELETE(_req: Request, context: RouteContext): Promise<Response> {
  const authResult = await requireAdmin()
  if (authResult instanceof Response) return authResult

  const { id } = await context.params

  if (!isUuid(id)) {
    return NextResponse.json({ error: "Invalid session id" }, { status: 400 })
  }

  try {
    const { error } = await supabaseAdmin
      .from("event_sessions")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Delete session error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Delete session unexpected error:", error)
    return NextResponse.json({ error: "Failed to delete session" }, { status: 500 })
  }
}