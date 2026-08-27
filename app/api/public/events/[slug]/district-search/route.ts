import { NextResponse } from "next/server"
import {
  districtPlatformLabel,
  externalPlatformFromUrl,
  findDistrictAssignmentByQuery,
  isDistrictLookupWindowOpen,
} from "@/lib/districtAccess"
import { getEventBySlug } from "@/lib/events"
import { publicEventHeaders } from "@/lib/publicEventCors"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const NOT_FOUND_MESSAGE =
  "No assignment found. Please check your name or try your email address."

function json(request: Request, data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: publicEventHeaders(request),
  })
}

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: publicEventHeaders(request) })
}

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params
    const query = String(new URL(request.url).searchParams.get("query") || "").trim()

    if (query.length < 3 || query.length > 320) {
      return json(
        request,
        { found: false, error: "Enter your full name or the email address on your registration." },
        400
      )
    }

    const event = await getEventBySlug(slug)
    if (!(await isDistrictLookupWindowOpen(event.id))) {
      return json(
        request,
        { found: false, error: "District room lookup is not open right now." },
        200
      )
    }

    const assignment = await findDistrictAssignmentByQuery(event.id, query)
    if (!assignment) {
      return json(request, { found: false, error: NOT_FOUND_MESSAGE }, 200)
    }

    return json(request, {
      found: true,
      name: assignment.registrantName,
      district: assignment.session.title,
      district_name: assignment.session.title,
      district_code: assignment.session.code,
      manager: assignment.session.presenter,
      meeting_link: assignment.session.external_join_url,
      platform: externalPlatformFromUrl(assignment.session.external_join_url),
      platform_label: districtPlatformLabel(assignment.session.external_join_url),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to search district rooms"
    if (message.startsWith("Event not found")) {
      return json(request, { found: false, error: message }, 404)
    }
    console.error("district search error", error)
    return json(request, { found: false, error: "Unable to search right now." }, 500)
  }
}
