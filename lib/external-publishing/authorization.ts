import { NextResponse } from "next/server"
import { getEventTeamAccess, hasEventFeature } from "@/lib/eventTeamAccess"

export async function requirePublishingApiAccess(eventId: string) {
  const access = await getEventTeamAccess(eventId)
  if (!access) {
    return NextResponse.json({ error: "Event access denied" }, { status: 403 })
  }
  if (!hasEventFeature(access, "publishing")) {
    return NextResponse.json(
      { error: "Your event access does not include publishing." },
      { status: 403 },
    )
  }
  return access
}
