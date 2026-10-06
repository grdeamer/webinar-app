import "server-only"
import { createHmac } from "node:crypto"
export function previewTopic(id: string) {
  const secret = process.env.ZOOM_BRIDGE_AGENT_TOKEN
  if (!secret) throw new Error("Controller is not configured")
  return `io-preview:${createHmac("sha256", secret).update(id).digest("hex")}`
}
export function previewLeaseActive(until: string | null | undefined) {
  return Boolean(until && Date.parse(until) > Date.now())
}
