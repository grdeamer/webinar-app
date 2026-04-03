import { NextResponse } from "next/server"
import { ensureEventLiveProgramState } from "@/lib/live/state"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// TEMP bridge: use your current live event id for General Session
const GENERAL_SESSION_EVENT_ID = "219335b5-2390-47ce-88b8-0670c2980f93"

export async function GET() {
  try {
    const state = await ensureEventLiveProgramState(GENERAL_SESSION_EVENT_ID)
    return NextResponse.json({ state })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to load General Session program state" },
      { status: 500 }
    )
  }
}