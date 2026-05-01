import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params
  const eventId = id
  const { userId, isPresenter } = await req.json()

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from("event_attendees")
    .update({ is_presenter: isPresenter })
    .eq("event_id", eventId)
    .eq("user_id", userId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}