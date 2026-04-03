export type MeetingPlatform = "zoom" | "teams" | "webex" | "meet" | "other" | ""

export function detectMeetingPlatform(url?: string | null): MeetingPlatform {
  if (!url) return ""

  try {
    const host = new URL(url).hostname.toLowerCase()

    if (host.includes("zoom.us")) return "zoom"
    if (host.includes("teams.microsoft.com")) return "teams"
    if (host.includes("webex.com")) return "webex"
    if (host.includes("meet.google.com")) return "meet"

    return "other"
  } catch {
    return ""
  }
}