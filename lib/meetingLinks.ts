export type MeetingProvider = "manual" | "zoom" | "teams"

export function detectProvider(urlString: string): MeetingProvider {
  try {
    const u = new URL(urlString)
    const host = u.hostname.toLowerCase()

    if (
      host.endsWith("zoom.us") ||
      host.endsWith("zoomgov.com")
    ) return "zoom"

    if (
      host === "teams.microsoft.com" ||
      host.endsWith(".teams.microsoft.com") ||
      host === "meet.lync.com"
    ) return "teams"

    return "manual"
  } catch {
    return "manual"
  }
}

export function sanitizeMeetingUrl(raw: string): string {
  const v = (raw ?? "").trim()
  if (!v) return ""

  let u: URL
  try {
    u = new URL(v)
  } catch {
    throw new Error("Please enter a valid URL (must start with https://).")
  }

  if (u.protocol !== "https:") {
    throw new Error("Join URL must start with https://")
  }

  // hardening: remove whitespace weirdness and keep canonical
  return u.toString()
}

export function defaultLabel(provider: MeetingProvider) {
  if (provider === "zoom") return "Join Zoom"
  if (provider === "teams") return "Join Teams"
  return "Join Meeting"
}