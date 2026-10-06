import "server-only"
import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from "node:crypto"
import { supabaseAdmin } from "@/lib/supabase/admin"
import type { ZoomRoom } from "./types"
export const TABLE = "zoom_bridge_rooms"
export type RoomRow = { id: string; worker_name: string; meeting_id: string; passcode_ciphertext: string; desired_running: boolean; desired_original_sound: boolean; desired_camera: boolean; desired_microphone: boolean; publish_mode: ZoomRoom["publishMode"]; revision: string; observed: ZoomRoom["observed"]; last_seen: string | null; preview_until?: string | null }
function key() {
  const k = Buffer.from(process.env.ZOOM_BRIDGE_ENCRYPTION_KEY || "", "base64")
  if (k.length !== 32) throw new Error("Zoom Bridge encryption is not configured.")
  return k
}
export function seal(value: string) {
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", key(), iv)
  const data = Buffer.concat([cipher.update(value, "utf8"), cipher.final()])
  return [iv, cipher.getAuthTag(), data].map(x => x.toString("base64url")).join(":")
}
export function unseal(value: string) {
  const [iv, tag, data] = value.split(":").map(x => Buffer.from(x, "base64url"))
  const cipher = createDecipheriv("aes-256-gcm", key(), iv); cipher.setAuthTag(tag)
  return Buffer.concat([cipher.update(data), cipher.final()]).toString("utf8")
}
export function agentAuthorized(request: Request) {
  const expected = process.env.ZOOM_BRIDGE_AGENT_TOKEN
  const actual = request.headers.get("authorization")?.replace(/^Bearer /, "")
  return Boolean(expected && actual && Buffer.byteLength(expected) === Buffer.byteLength(actual) && timingSafeEqual(Buffer.from(expected), Buffer.from(actual)))
}
export async function rows(): Promise<RoomRow[]> {
  const { data, error } = await supabaseAdmin.from(TABLE).select("*").order("created_at")
  if (error) throw new Error("Zoom Bridge profiles could not be loaded.")
  return data ?? []
}
export function publicRoom(r: RoomRow): ZoomRoom {
  return { id: r.id, name: r.worker_name, meetingId: r.meeting_id, hasPasscode: Boolean(r.passcode_ciphertext), running: r.desired_running, originalSound: r.desired_original_sound, camera: r.desired_camera, microphone: r.desired_microphone, publishMode: r.publish_mode, revision: r.revision, observed: r.observed ?? {}, lastSeen: r.last_seen }
}
