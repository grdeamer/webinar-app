import "server-only"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { defaultSourceProfile, type SourceProfile } from "./source-profile"
import type { ZoomSource } from "./types"
export const SOURCE_TABLE = "zoom_bridge_source"
export type SourceRow = { id: string; source_profile?: SourceProfile; source_kind: ZoomSource["kind"]; meeting_id: string; passcode_ciphertext: string; desired_running: boolean; revision: string; observed: ZoomSource["observed"]; last_seen: string | null }
export async function sourceRow(): Promise<SourceRow | null> {
  const { data, error } = await supabaseAdmin.from(SOURCE_TABLE).select("*").eq("id", "program").maybeSingle()
  if (error) throw new Error("Program source could not be loaded.")
  return data
}
export function publicSource(row: SourceRow): ZoomSource {
  return { profile: { ...defaultSourceProfile, ...row.source_profile }, kind: row.source_kind, meetingId: row.source_kind === "zoom" ? row.meeting_id : "", hasPasscode: row.source_kind === "zoom" && Boolean(row.passcode_ciphertext), running: row.desired_running, revision: row.revision, observed: row.observed ?? {}, lastSeen: row.last_seen }
}
