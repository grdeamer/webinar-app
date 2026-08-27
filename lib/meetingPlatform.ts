export type MeetingPlatform = 
  | "zoom" 
  | "teams" 
  | "webex" 
  | "meet" 
  | "goto" 
  | "google-meet" 
  | "ringcentral" 
  | "chime" 
  | "bluejeans" 
  | "other" 
  | ""

export function detectMeetingPlatform(url?: string | null): MeetingPlatform {
  if (!url) return ""

  try {
    const host = new URL(url).hostname.toLowerCase()

    if (host.includes("zoom.us")) return "zoom"
    if (host.includes("teams.microsoft.com")) return "teams"
    if (host.includes("webex.com")) return "webex"
    if (host.includes("meet.google.com")) return "meet"
    if (host.includes("gotomeeting.com") || host.includes("gotowebinar.com")) return "goto"
    if (host.includes("meet.google.com")) return "google-meet"
    if (host.includes("ringcentral.com")) return "ringcentral"
    if (host.includes("chime.aws")) return "chime"
    if (host.includes("bluejeans.com")) return "bluejeans"

    return "other"
  } catch {
    return ""
  }
}