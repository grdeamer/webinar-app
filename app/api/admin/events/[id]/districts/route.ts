import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/requireAdmin"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type NodeKind = "zone" | "region" | "district"
const kindToSessionKind: Record<NodeKind, string> = {
  zone: "district_zone",
  region: "district_region",
  district: "district",
}
const sessionKindToKind: Record<string, NodeKind> = {
  district_zone: "zone",
  district_region: "region",
  district: "district",
  breakout: "district",
}

function clean(value: unknown, max = 500) {
  const result = String(value ?? "").trim()
  return result ? result.slice(0, max) : null
}

function code(value: unknown) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
}

async function loadNodes(eventId: string) {
  const { data, error } = await supabaseAdmin
    .from("event_sessions")
    .select("id,event_id,code,title,presenter,external_join_url,external_platform,district_parent_id,session_kind,sort_order")
    .eq("event_id", eventId)
    .in("session_kind", ["district_zone", "district_region", "district", "breakout"])
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true })
  if (error) throw new Error(error.message)
  return (data || []).map((row) => ({ ...row, node_type: sessionKindToKind[row.session_kind] }))
}

async function assertEvent(eventId: string) {
  const { data, error } = await supabaseAdmin.from("events").select("id").eq("id", eventId).maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error("Event not found")
}

async function validateParent(eventId: string, nodeType: NodeKind, parentId: string | null) {
  if (nodeType === "zone") {
    if (parentId) throw new Error("Zones must stay at the top level")
    return null
  }
  if (!parentId) throw new Error(`${nodeType === "region" ? "Regions" : "Districts"} need a parent`)
  const { data, error } = await supabaseAdmin
    .from("event_sessions")
    .select("id,event_id,session_kind")
    .eq("id", parentId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data || data.event_id !== eventId) throw new Error("Parent node is not part of this event")
  const parentType = sessionKindToKind[data.session_kind]
  if (nodeType === "region" && parentType !== "zone") throw new Error("Regions must sit inside a Zone")
  if (nodeType === "district" && parentType !== "region") throw new Error("Districts must sit inside a Region")
  return parentId
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (auth instanceof Response) return auth
  try {
    const { id } = await context.params
    await assertEvent(id)
    return NextResponse.json({ nodes: await loadNodes(id) })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load districts" }, { status: 400 })
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (auth instanceof Response) return auth
  try {
    const { id: eventId } = await context.params
    await assertEvent(eventId)
    const body = await request.json().catch(() => ({}))
    const action = clean(body.action, 30)

    if (action === "create") {
      const nodeType = clean(body.node_type, 20) as NodeKind
      if (!kindToSessionKind[nodeType]) throw new Error("Choose Zone, Region, or District")
      const title = clean(body.title, 200)
      if (!title) throw new Error("Name is required")
      const parentId = await validateParent(eventId, nodeType, clean(body.parent_id, 100))
      const nodes = await loadNodes(eventId)
      const siblings = nodes.filter((node) => (node.district_parent_id || null) === parentId && node.node_type === nodeType)
      const nodeCode = code(body.code) || `${nodeType.slice(0, 1).toUpperCase()}${String(siblings.length + 1).padStart(3, "0")}`
      const { data, error } = await supabaseAdmin.from("event_sessions").insert({
        event_id: eventId,
        code: nodeCode,
        title,
        presenter: nodeType === "district" ? clean(body.presenter, 200) : null,
        external_join_url: nodeType === "district" ? clean(body.external_join_url, 2000) : null,
        external_platform: nodeType === "district" ? clean(body.external_platform, 50) : null,
        district_parent_id: parentId,
        session_kind: kindToSessionKind[nodeType],
        visibility_mode: nodeType === "district" ? "assigned" : "hidden",
        delivery_mode: nodeType === "district" ? "external" : "directory",
        sort_order: siblings.length,
      }).select("id").single()
      if (error) throw new Error(error.message)
      return NextResponse.json({ ok: true, id: data.id, nodes: await loadNodes(eventId) })
    }

    if (action === "update") {
      const nodeId = clean(body.id, 100)
      if (!nodeId) throw new Error("Missing node id")
      const { data: existing, error: existingError } = await supabaseAdmin
        .from("event_sessions")
        .select("id,event_id,session_kind")
        .eq("id", nodeId)
        .eq("event_id", eventId)
        .maybeSingle()
      if (existingError) throw new Error(existingError.message)
      if (!existing || !sessionKindToKind[existing.session_kind]) throw new Error("District node not found")
      const nodeType = sessionKindToKind[existing.session_kind]
      const patch: Record<string, unknown> = {}
      if (body.title !== undefined) patch.title = clean(body.title, 200)
      if (body.code !== undefined) patch.code = code(body.code)
      if (nodeType === "district") {
        if (body.presenter !== undefined) patch.presenter = clean(body.presenter, 200)
        if (body.external_join_url !== undefined) patch.external_join_url = clean(body.external_join_url, 2000)
        if (body.external_platform !== undefined) patch.external_platform = clean(body.external_platform, 50)
      }
      const { error } = await supabaseAdmin.from("event_sessions").update(patch).eq("id", nodeId).eq("event_id", eventId)
      if (error) throw new Error(error.message)
      return NextResponse.json({ ok: true, nodes: await loadNodes(eventId) })
    }

    if (action === "move") {
      const nodeId = clean(body.id, 100)
      const parentId = clean(body.parent_id, 100)
      if (!nodeId) throw new Error("Missing node id")
      const { data: existing, error: existingError } = await supabaseAdmin
        .from("event_sessions")
        .select("id,event_id,session_kind")
        .eq("id", nodeId)
        .eq("event_id", eventId)
        .maybeSingle()
      if (existingError) throw new Error(existingError.message)
      if (!existing || !sessionKindToKind[existing.session_kind]) throw new Error("District node not found")
      const nodeType = sessionKindToKind[existing.session_kind]
      const validParent = await validateParent(eventId, nodeType, parentId)
      const sortOrder = Math.max(0, Math.floor(Number(body.sort_order) || 0))
      const { error } = await supabaseAdmin.from("event_sessions").update({ district_parent_id: validParent, sort_order: sortOrder }).eq("id", nodeId).eq("event_id", eventId)
      if (error) throw new Error(error.message)
      return NextResponse.json({ ok: true, nodes: await loadNodes(eventId) })
    }

    if (action === "delete") {
      const nodeId = clean(body.id, 100)
      if (!nodeId) throw new Error("Missing node id")
      const { count, error: countError } = await supabaseAdmin.from("event_sessions").select("id", { count: "exact", head: true }).eq("event_id", eventId).eq("district_parent_id", nodeId)
      if (countError) throw new Error(countError.message)
      if ((count || 0) > 0) throw new Error("Move or remove this node’s children first")
      const { error } = await supabaseAdmin.from("event_sessions").delete().eq("id", nodeId).eq("event_id", eventId)
      if (error) throw new Error(error.message)
      return NextResponse.json({ ok: true, nodes: await loadNodes(eventId) })
    }

    throw new Error("Unsupported district action")
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update districts" }, { status: 400 })
  }
}
