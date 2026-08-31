import "server-only"

import { getLiveKitRoomService } from "@/lib/live/livekit/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

export type CloudServiceState = "operational" | "degraded" | "unavailable" | "configured"

export type CloudService = {
  id: string
  name: string
  layer: string
  state: CloudServiceState
  latencyMs: number | null
  detail: string
}

export type CloudAuditItem = {
  id: string
  category: string
  summary: string
  actor: string
  createdAt: string
  eventId: string | null
}

export type CloudDeployment = {
  id: string
  provider: "vercel" | "jupiter-publish"
  status: string
  environment: string
  commitSha: string | null
  url: string | null
  createdAt: string | null
  eventId: string | null
}

type ProbeResult<T> =
  | { ok: true; value: T; error: null; latencyMs: number }
  | { ok: false; value: null; error: string; latencyMs: number }

async function probe<T>(work: PromiseLike<T>, timeoutMs = 5_000): Promise<ProbeResult<T>> {
  const started = Date.now()
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    const value = await Promise.race([
      Promise.resolve(work),
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error("Health check timed out")), timeoutMs)
      }),
    ])
    return { ok: true, value, error: null, latencyMs: Date.now() - started }
  } catch (error) {
    return { ok: false, value: null, error: error instanceof Error ? error.message : "Health check failed", latencyMs: Date.now() - started }
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

function stateForLatency(latencyMs: number): CloudServiceState {
  return latencyMs > 1_500 ? "degraded" : "operational"
}

function currentVercelDeployment(): CloudDeployment {
  const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.NEXT_PUBLIC_APP_URL || "app.jupiter.events"
  const deployed = Boolean(process.env.VERCEL || process.env.VERCEL_ENV)
  return {
    id: process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA || "local",
    provider: "vercel",
    status: deployed ? "ready" : "local",
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
    commitSha: process.env.VERCEL_GIT_COMMIT_SHA || null,
    url: productionUrl ? `https://${productionUrl.replace(/^https?:\/\//, "")}` : null,
    createdAt: null,
    eventId: null,
  }
}

function configuredService(id: string, name: string, layer: string, configured: boolean, detail: string): CloudService {
  return {
    id,
    name,
    layer,
    state: configured ? "configured" : "unavailable",
    latencyMs: null,
    detail: configured ? detail : `${name} credentials are not configured`,
  }
}

export async function getPlatformCloudSnapshot() {
  const cutoff = new Date(Date.now() - 45_000).toISOString()
  const databaseProbe = probe(Promise.resolve(supabaseAdmin.from("events").select("id", { count: "exact", head: true })).then((result) => {
    if (result.error) throw new Error(result.error.message)
    return result
  }))
  const storageProbe = probe(supabaseAdmin.storage.listBuckets().then((result) => {
    if (result.error) throw result.error
    return result
  }))
  const liveKitConfigured = Boolean(process.env.LIVEKIT_URL && process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET)
  const liveKitProbe = liveKitConfigured ? probe(getLiveKitRoomService().listRooms()) : Promise.resolve(null)

  const [database, storage, liveKit, events, registrants, sessions, messages, publishes, presence, audit, campaigns, publishHistory] = await Promise.all([
    databaseProbe,
    storageProbe,
    liveKitProbe,
    supabaseAdmin.from("events").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("event_registrants").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("event_sessions").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("event_email_messages").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("event_publish_deployments").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabaseAdmin.from("event_presence").select("user_id,event_id").gte("last_seen", cutoff),
    supabaseAdmin.from("jupiter_audit_events").select("id,event_id,actor_email,category,summary,created_at").order("created_at", { ascending: false }).limit(20),
    supabaseAdmin.from("event_email_campaigns").select("id,event_id,campaign_type,status,recipient_count,requested_by,created_at").order("created_at", { ascending: false }).limit(8),
    supabaseAdmin.from("event_publish_deployments").select("id,event_id,status,created_by,created_at").order("created_at", { ascending: false }).limit(8),
  ])

  const services: CloudService[] = [
    database.ok
      ? { id: "database", name: "Data Cloud", layer: "Supabase Postgres", state: stateForLatency(database.latencyMs), latencyMs: database.latencyMs, detail: `${database.value.count ?? 0} event workspaces available` }
      : { id: "database", name: "Data Cloud", layer: "Supabase Postgres", state: "unavailable", latencyMs: database.latencyMs, detail: database.error },
    storage.ok
      ? { id: "storage", name: "Asset Cloud", layer: "Supabase Storage", state: stateForLatency(storage.latencyMs), latencyMs: storage.latencyMs, detail: `${storage.value.data?.length ?? 0} storage namespaces connected` }
      : { id: "storage", name: "Asset Cloud", layer: "Supabase Storage", state: "unavailable", latencyMs: storage.latencyMs, detail: storage.error },
    liveKit && liveKit.ok
      ? { id: "media", name: "Media Cloud", layer: "LiveKit", state: stateForLatency(liveKit.latencyMs), latencyMs: liveKit.latencyMs, detail: `${liveKit.value.length} live media rooms visible` }
      : liveKit
        ? { id: "media", name: "Media Cloud", layer: "LiveKit", state: "unavailable", latencyMs: liveKit.latencyMs, detail: liveKit.error }
        : configuredService("media", "Media Cloud", "LiveKit", false, "Browser media configured"),
    configuredService("email", "Communications", "Resend", Boolean(process.env.RESEND_API_KEY), "Transactional delivery configured"),
    configuredService("delivery", "Delivery Cloud", "Vercel", Boolean(process.env.VERCEL || process.env.VERCEL_ENV), "Production runtime active"),
  ]

  const auditItems: CloudAuditItem[] = [
    ...(audit.data ?? []).map((row) => ({ id: row.id, category: row.category, summary: row.summary, actor: row.actor_email || "Jupiter system", createdAt: row.created_at, eventId: row.event_id })),
    ...(campaigns.data ?? []).map((row) => ({ id: `email-${row.id}`, category: "communications", summary: `${row.campaign_type.replace(/_/g, " ")} ${row.status} for ${row.recipient_count} recipients`, actor: row.requested_by ? "Event operator" : "Jupiter system", createdAt: row.created_at, eventId: row.event_id })),
    ...(publishHistory.data ?? []).map((row) => ({ id: `publish-${row.id}`, category: "delivery", summary: `Experience deployment ${row.status}`, actor: row.created_by ? "Event operator" : "Jupiter system", createdAt: row.created_at, eventId: row.event_id })),
  ].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 20)

  const activeAudience = new Set((presence.data ?? []).map((row) => `${row.event_id}:${row.user_id}`)).size
  const activeEvents = new Set((presence.data ?? []).map((row) => row.event_id)).size
  const overallState: CloudServiceState = services.some((service) => service.state === "unavailable")
    ? "degraded"
    : services.some((service) => service.state === "degraded")
      ? "degraded"
      : "operational"

  return {
    generatedAt: new Date().toISOString(),
    overallState,
    region: process.env.VERCEL_REGION || "iad1",
    services,
    deployment: currentVercelDeployment(),
    usage: {
      events: events.count ?? 0,
      registrants: registrants.count ?? 0,
      sessions: sessions.count ?? 0,
      emailMessages: messages.count ?? 0,
      publishedDeployments: publishes.count ?? 0,
      activeAudience,
      activeEvents,
    },
    audit: auditItems,
  }
}

export async function getCloudDeployments(): Promise<CloudDeployment[]> {
  const { data } = await supabaseAdmin
    .from("event_publish_deployments")
    .select("id,event_id,status,created_at")
    .order("created_at", { ascending: false })
    .limit(20)

  const eventDeployments: CloudDeployment[] = (data ?? []).map((row) => ({
      id: row.id,
      provider: "jupiter-publish" as const,
      status: row.status,
      environment: "event experience",
      commitSha: null as string | null,
      url: null as string | null,
      createdAt: row.created_at,
      eventId: row.event_id,
    }))

  return [currentVercelDeployment(), ...eventDeployments]
}

export async function getEventInfrastructureSnapshot(eventId: string) {
  const cutoff = new Date(Date.now() - 45_000).toISOString()
  const [eventResult, sessionsResult, registrants, presence, campaigns, messages, publishDestinations, publishDeployments, audit] = await Promise.all([
    supabaseAdmin.from("events").select("id,title,slug,event_theme,live_provider,updated_at").eq("id", eventId).maybeSingle(),
    supabaseAdmin.from("event_sessions").select("id,live_provider,live_room_name,delivery_mode").eq("event_id", eventId),
    supabaseAdmin.from("event_registrants").select("id", { count: "exact", head: true }).eq("event_id", eventId),
    supabaseAdmin.from("event_presence").select("user_id").eq("event_id", eventId).gte("last_seen", cutoff),
    supabaseAdmin.from("event_email_campaigns").select("id", { count: "exact", head: true }).eq("event_id", eventId),
    supabaseAdmin.from("event_email_messages").select("id", { count: "exact", head: true }).eq("event_id", eventId),
    supabaseAdmin.from("event_publish_destinations").select("id,last_status,last_tested_at,last_published_at").eq("event_id", eventId),
    supabaseAdmin.from("event_publish_deployments").select("id,status,created_at").eq("event_id", eventId).order("created_at", { ascending: false }).limit(10),
    supabaseAdmin.from("jupiter_audit_events").select("id,actor_email,category,summary,created_at").eq("event_id", eventId).order("created_at", { ascending: false }).limit(10),
  ])

  if (eventResult.error || !eventResult.data) throw new Error(eventResult.error?.message || "Event not found")
  const sessions = sessionsResult.data ?? []
  const liveSessions = sessions.filter((session) => session.delivery_mode === "livekit" || session.live_provider === "livekit")
  const liveKitConfigured = Boolean(process.env.LIVEKIT_URL && process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET)
  const mediaReady = liveKitConfigured && liveSessions.every((session) => Boolean(session.live_room_name))
  const destinations = publishDestinations.data ?? []
  const hasSuccessfulPublish = (publishDeployments.data ?? []).some((deployment) => deployment.status === "published")

  const checks = [
    { id: "data", label: "Data namespace", state: "ready" as const, detail: "Event data is isolated and queryable" },
    { id: "identity", label: "Audience identity", state: (registrants.count ?? 0) > 0 ? "ready" as const : "attention" as const, detail: `${registrants.count ?? 0} registered people` },
    { id: "program", label: "Program services", state: sessions.length > 0 ? "ready" as const : "attention" as const, detail: `${sessions.length} sessions provisioned` },
    { id: "media", label: "Media routing", state: mediaReady ? "ready" as const : "attention" as const, detail: liveKitConfigured ? `${liveSessions.length} LiveKit sessions configured` : "LiveKit credentials missing" },
    { id: "communications", label: "Communications", state: process.env.RESEND_API_KEY ? "ready" as const : "attention" as const, detail: `${campaigns.count ?? 0} campaigns · ${messages.count ?? 0} messages` },
    { id: "delivery", label: "Experience delivery", state: hasSuccessfulPublish || destinations.length === 0 ? "ready" as const : "attention" as const, detail: destinations.length ? `${destinations.length} external destinations` : "Jupiter-hosted experience active" },
  ]
  const readyCount = checks.filter((check) => check.state === "ready").length

  return {
    generatedAt: new Date().toISOString(),
    event: eventResult.data,
    readiness: Math.round((readyCount / checks.length) * 100),
    checks,
    region: process.env.VERCEL_REGION || "iad1",
    deploymentModel: "Jupiter managed",
    redundancy: "Single-region managed",
    usage: {
      registrants: registrants.count ?? 0,
      sessions: sessions.length,
      activeAudience: new Set((presence.data ?? []).map((row) => row.user_id)).size,
      campaigns: campaigns.count ?? 0,
      messages: messages.count ?? 0,
      publishes: publishDeployments.data?.length ?? 0,
    },
    deployments: publishDeployments.data ?? [],
    audit: (audit.data ?? []).map((row) => ({ id: row.id, category: row.category, summary: row.summary, actor: row.actor_email || "Jupiter system", createdAt: row.created_at, eventId })),
  }
}
