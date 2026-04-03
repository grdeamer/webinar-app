import type { LiveProvider } from "@/lib/types"

function must(name: string, value: string | undefined) {
  if (!value) throw new Error(`Missing env: ${name}`)
  return value
}

export function getLiveProvider(): LiveProvider {
  const provider = (process.env.LIVE_PROVIDER || "livekit").trim().toLowerCase()

  if (provider === "livekit" || provider === "ivs" || provider === "cloudflare") {
    return provider
  }

  throw new Error(`Unsupported LIVE_PROVIDER: ${provider}`)
}

export function getLiveKitUrl() {
  return must("LIVEKIT_URL", process.env.LIVEKIT_URL)
}

export function getLiveKitApiKey() {
  return must("LIVEKIT_API_KEY", process.env.LIVEKIT_API_KEY)
}

export function getLiveKitApiSecret() {
  return must("LIVEKIT_API_SECRET", process.env.LIVEKIT_API_SECRET)
}

export function getLiveKitWebhookSecret() {
  return must("LIVEKIT_WEBHOOK_SECRET", process.env.LIVEKIT_WEBHOOK_SECRET)
}

export function buildEventRoomName(eventId: string) {
  return `event_${eventId.replace(/[^a-zA-Z0-9_-]/g, "")}`
}