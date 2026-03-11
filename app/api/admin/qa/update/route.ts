import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/requireAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function jerr(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

type QaStatus = "pending" | "approved" | "rejected" | "answered"

type QaMessageRow = {
  status: QaStatus
}

export async function POST(req: Request) {
  try {
    await requireAdmin()
  } catch {
    return jerr("Unauthorized", 401)
  }

  try {
    const body = await req.json().catch(() => ({}))
    const action = typeof body?.action === "string" ? body.action : ""
    const id = typeof body?.id === "string" ? body.id : ""
    const roomKey = typeof body?.room_key === "string" ? body.room_key : "general"

    if (action === "lock" || action === "unlock") {
      const is_locked = action === "lock"
      const { error } = await supabaseAdmin
        .from("qa_room_settings")
        .upsert(
          { room_key: roomKey, is_locked, updated_at: new Date().toISOString() },
          { onConflict: "room_key" }
        )

      if (error) return jerr(error.message)
      return NextResponse.json({ ok: true })
    }

    if (action === "clear_answered") {
      const { error } = await supabaseAdmin
        .from("qa_messages")
        .delete()
        .eq("room_key", roomKey)
        .eq("status", "answered")

      if (error) return jerr(error.message)
      return NextResponse.json({ ok: true })
    }

    if (action === "clear_featured") {
      const { error } = await supabaseAdmin
        .from("qa_messages")
        .update({ is_featured: false, featured_at: null })
        .eq("room_key", roomKey)
        .eq("is_featured", true)

      if (error) return jerr(error.message)
      return NextResponse.json({ ok: true })
    }

    if (!id) return jerr("Missing id", 400)

    if (action === "delete") {
      const { error: clearErr } = await supabaseAdmin
        .from("qa_messages")
        .update({ is_featured: false, featured_at: null })
        .eq("room_key", roomKey)
        .eq("id", id)
        .eq("is_featured", true)

      if (clearErr) return jerr(clearErr.message)

      const { error } = await supabaseAdmin
        .from("qa_messages")
        .delete()
        .eq("id", id)
        .eq("room_key", roomKey)

      if (error) return jerr(error.message)
      return NextResponse.json({ ok: true })
    }

    if (action === "feature") {
      const { data: row, error: rowErr } = await supabaseAdmin
        .from("qa_messages")
        .select("status")
        .eq("id", id)
        .eq("room_key", roomKey)
        .maybeSingle<QaMessageRow>()

      if (rowErr) return jerr(rowErr.message)
      if (!row) return jerr("Not found", 404)
      if (row.status !== "approved" && row.status !== "answered") {
        return jerr("Only approved/answered questions can be featured.", 400)
      }

      const { error: clearErr } = await supabaseAdmin
        .from("qa_messages")
        .update({ is_featured: false, featured_at: null })
        .eq("room_key", roomKey)
        .eq("is_featured", true)

      if (clearErr) return jerr(clearErr.message)

      const { error: setErr } = await supabaseAdmin
        .from("qa_messages")
        .update({ is_featured: true, featured_at: new Date().toISOString() })
        .eq("id", id)
        .eq("room_key", roomKey)

      if (setErr) return jerr(setErr.message)
      return NextResponse.json({ ok: true })
    }

    const nextStatus: QaStatus | null =
      action === "approve"
        ? "approved"
        : action === "reject"
          ? "rejected"
          : action === "answer"
            ? "answered"
            : action === "pending"
              ? "pending"
              : null

    if (!nextStatus) return jerr("Invalid action", 400)

    const patch: {
      status: QaStatus
      answered_at: string | null
      is_featured?: boolean
      featured_at?: string | null
    } = {
      status: nextStatus,
      answered_at: nextStatus === "answered" ? new Date().toISOString() : null,
    }

    if (nextStatus === "rejected" || nextStatus === "pending") {
      patch.is_featured = false
      patch.featured_at = null
    }

    const { error } = await supabaseAdmin
      .from("qa_messages")
      .update(patch)
      .eq("id", id)
      .eq("room_key", roomKey)

    if (error) return jerr(error.message)
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error"
    console.error("admin qa update error:", err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}