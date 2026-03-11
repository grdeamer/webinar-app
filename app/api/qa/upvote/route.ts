// app/api/qa/upvote/route.ts

import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import crypto from "crypto"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

function makeToken() {
  return crypto.randomBytes(24).toString("hex")
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const qa_message_id = String(body?.qa_message_id || "").trim()

    if (!qa_message_id) {
      return json({ error: "Missing qa_message_id." }, 400)
    }

    const cookieStore = await cookies()
    let voterToken = cookieStore.get("qa_voter_token")?.value

    if (!voterToken) {
      voterToken = makeToken()
    }

    const { error: voteInsertError } = await supabaseAdmin
      .from("qa_votes")
      .insert({
        qa_message_id,
        voter_token: voterToken,
      })

    if (voteInsertError) {
      if (String(voteInsertError.message || "").toLowerCase().includes("duplicate")) {
        const res = json({ ok: true, duplicate: true })
        if (!cookieStore.get("qa_voter_token")) {
          res.cookies.set("qa_voter_token", voterToken, {
            httpOnly: true,
            sameSite: "lax",
            secure: true,
            path: "/",
            maxAge: 60 * 60 * 24 * 365,
          })
        }
        return res
      }
      return json({ error: voteInsertError.message }, 400)
    }

    const { data: current, error: readError } = await supabaseAdmin
      .from("qa_messages")
      .select("upvotes")
      .eq("id", qa_message_id)
      .single()

    if (readError) return json({ error: readError.message }, 400)

    const nextUpvotes = Number(current?.upvotes || 0) + 1

    const { error: updateError } = await supabaseAdmin
      .from("qa_messages")
      .update({ upvotes: nextUpvotes })
      .eq("id", qa_message_id)

    if (updateError) return json({ error: updateError.message }, 400)

    const res = json({ ok: true, upvotes: nextUpvotes })
    if (!cookieStore.get("qa_voter_token")) {
      res.cookies.set("qa_voter_token", voterToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      })
    }

    return res
  } catch (e: any) {
    return json({ error: e?.message || "Failed to upvote." }, 500)
  }
}