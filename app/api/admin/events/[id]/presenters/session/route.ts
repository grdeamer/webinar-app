import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params
  const { userId, sessionId } = await req.json()

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from("event_attendees")
    .update({ session_id: sessionId || null })
    .eq("event_id", id)
    .eq("user_id", userId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}