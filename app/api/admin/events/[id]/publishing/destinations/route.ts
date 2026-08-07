import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/requireAdmin"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { encryptPublishingSecret } from "@/lib/external-publishing/credentials"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(value: unknown, status = 200) {
  return NextResponse.json(value, { status })
}

function publicDestination(row: Record<string, unknown>) {
  const { password_ciphertext, password_iv, password_tag, ...safe } = row
  void password_ciphertext
  void password_iv
  void password_tag
  return { ...safe, has_password: true }
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await context.params
  const { data, error } = await supabaseAdmin
    .from("event_publish_destinations")
    .select("*")
    .eq("event_id", id)
    .order("created_at", { ascending: true })

  if (error) return json({ error: error.message }, 400)
  return json({ destinations: (data ?? []).map(publicDestination) })
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await context.params
  const body = await request.json().catch((): null => null)
  const name = String(body?.name || "").trim().slice(0, 100)
  const host = String(body?.host || "").trim().slice(0, 255)
  const username = String(body?.username || "").trim().slice(0, 255)
  const password = String(body?.password || "")
  const remotePath = String(body?.remote_path || "").trim().slice(0, 1000)
  const protocol = body?.protocol === "ftp" ? "ftp" : "ftps"
  const port = Number(body?.port || 21)

  if (!name || !host || !username || !password || !remotePath) {
    return json({ error: "Name, host, username, password, and remote folder are required" }, 400)
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535 || remotePath.includes("..")) {
    return json({ error: "Port or remote folder is invalid" }, 400)
  }

  let encrypted
  try {
    encrypted = encryptPublishingSecret(password)
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Credential encryption failed" }, 500)
  }

  const { data, error } = await supabaseAdmin
    .from("event_publish_destinations")
    .insert({
      event_id: id,
      name,
      protocol,
      host,
      port,
      username,
      password_ciphertext: encrypted.ciphertext,
      password_iv: encrypted.iv,
      password_tag: encrypted.tag,
      remote_path: remotePath,
      public_url: body?.public_url ? String(body.public_url).trim().slice(0, 1000) : null,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single()

  if (error) return json({ error: error.message }, 400)
  return json({ destination: publicDestination(data) }, 201)
}
