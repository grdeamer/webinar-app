import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST() {
  const supabase = await createClient()
  await supabase.auth.signOut({ scope: "local" })
  const res = NextResponse.json({ ok: true })

  res.cookies.set("admin_token", "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  })

  return res
}
