import { supabaseAdmin } from "@/lib/supabase/admin"
import { decryptPublishingSecret } from "./credentials"

export type PublishDestinationRow = {
  id: string
  event_id: string
  name: string
  protocol: "ftp" | "ftps"
  host: string
  port: number
  username: string
  password_ciphertext: string
  password_iv: string
  password_tag: string
  remote_path: string
  public_url: string | null
  last_tested_at: string | null
  last_published_at: string | null
  last_status: string | null
  last_error: string | null
}

export async function loadPublishDestination(id: string, eventId: string) {
  const { data, error } = await supabaseAdmin
    .from("event_publish_destinations")
    .select("*")
    .eq("id", id)
    .eq("event_id", eventId)
    .single()

  if (error || !data) throw new Error(error?.message || "Publish destination not found")
  const row = data as PublishDestinationRow

  return {
    row,
    connection: {
      host: row.host,
      port: row.port,
      user: row.username,
      password: decryptPublishingSecret({
        ciphertext: row.password_ciphertext,
        iv: row.password_iv,
        tag: row.password_tag,
      }),
      secure: row.protocol === "ftps",
      remotePath: row.remote_path,
    },
  }
}
