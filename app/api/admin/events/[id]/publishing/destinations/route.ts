import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { encryptPublishingSecret } from "@/lib/external-publishing/credentials"
import { requirePublishingApiAccess } from "@/lib/external-publishing/authorization"

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

function readDestinationInput(body: Record<string, unknown> | null, requirePassword: boolean) {
  const name = String(body?.name || "").trim().slice(0, 100)
  const host = String(body?.host || "").trim().slice(0, 255)
  const username = String(body?.username || "").trim().slice(0, 255)
  const password = String(body?.password || "")
  const remotePath = String(body?.remote_path || "").trim().slice(0, 1000)
  const protocol = body?.protocol === "ftp" ? "ftp" : "ftps"
  const port = Number(body?.port || 21)
  const publicUrl = body?.public_url ? String(body.public_url).trim().slice(0, 1000) : null

  if (!name || !host || !username || !remotePath || (requirePassword && !password)) {
    return { error: `Name, host, username, remote folder${requirePassword ? ", and password are" : " are"} required` } as const
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535 || remotePath.includes("..")) {
    return { error: "Port or remote folder is invalid" } as const
  }

  return { value: { name, protocol, host, port, username, password, remote_path: remotePath, public_url: publicUrl } } as const
}

function destinationWriteError(error: { code?: string; message: string }) {
  if (error.code === "23505") {
    return json({ error: "A destination with this name already exists. Edit the existing destination instead." }, 409)
  }
  return json({ error: error.message }, 400)
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const access = await requirePublishingApiAccess(id)
  if (access instanceof NextResponse) return access
  const { data, error } = await supabaseAdmin
    .from("event_publish_destinations")
    .select("*")
    .eq("event_id", id)
    .order("created_at", { ascending: true })

  if (error) return json({ error: error.message }, 400)
  return json({ destinations: (data ?? []).map(publicDestination) })
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const access = await requirePublishingApiAccess(id)
  if (access instanceof NextResponse) return access
  const body = await request.json().catch((): null => null) as Record<string, unknown> | null
  const parsed = readDestinationInput(body, true)
  if ("error" in parsed) return json({ error: parsed.error }, 400)
  const input = parsed.value

  let encrypted
  try {
    encrypted = encryptPublishingSecret(input.password)
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Credential encryption failed" }, 500)
  }

  const { data, error } = await supabaseAdmin
    .from("event_publish_destinations")
    .insert({
      event_id: id,
      name: input.name,
      protocol: input.protocol,
      host: input.host,
      port: input.port,
      username: input.username,
      password_ciphertext: encrypted.ciphertext,
      password_iv: encrypted.iv,
      password_tag: encrypted.tag,
      remote_path: input.remote_path,
      public_url: input.public_url,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single()

  if (error) return destinationWriteError(error)
  return json({ destination: publicDestination(data) }, 201)
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const access = await requirePublishingApiAccess(id)
  if (access instanceof NextResponse) return access
  const body = await request.json().catch((): null => null) as Record<string, unknown> | null
  const destinationId = String(body?.destination_id || "").trim()
  if (!destinationId) return json({ error: "Destination is required" }, 400)

  const parsed = readDestinationInput(body, false)
  if ("error" in parsed) return json({ error: parsed.error }, 400)
  const input = parsed.value

  const { data: existing, error: lookupError } = await supabaseAdmin
    .from("event_publish_destinations")
    .select("id")
    .eq("id", destinationId)
    .eq("event_id", id)
    .maybeSingle()

  if (lookupError) return json({ error: lookupError.message }, 400)
  if (!existing) return json({ error: "Publish destination not found" }, 404)

  const updates: Record<string, unknown> = {
    name: input.name,
    protocol: input.protocol,
    host: input.host,
    port: input.port,
    username: input.username,
    remote_path: input.remote_path,
    public_url: input.public_url,
    last_status: null,
    last_error: null,
    updated_at: new Date().toISOString(),
  }

  if (input.password) {
    try {
      const encrypted = encryptPublishingSecret(input.password)
      updates.password_ciphertext = encrypted.ciphertext
      updates.password_iv = encrypted.iv
      updates.password_tag = encrypted.tag
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : "Credential encryption failed" }, 500)
    }
  }

  const { data, error } = await supabaseAdmin
    .from("event_publish_destinations")
    .update(updates)
    .eq("id", destinationId)
    .eq("event_id", id)
    .select("*")
    .single()

  if (error) return destinationWriteError(error)
  return json({ destination: publicDestination(data) })
}
