import "server-only"

import { supabaseAdmin } from "@/lib/supabase/admin"

type AuditEventInput = {
  eventId?: string | null
  actorId?: string | null
  actorEmail?: string | null
  category: string
  action: string
  summary: string
  targetType?: string | null
  targetId?: string | null
  metadata?: Record<string, unknown>
}

export async function recordAuditEvent(input: AuditEventInput): Promise<void> {
  const { error } = await supabaseAdmin.from("jupiter_audit_events").insert({
    event_id: input.eventId ?? null,
    actor_id: input.actorId ?? null,
    actor_email: input.actorEmail ?? null,
    category: input.category.slice(0, 80),
    action: input.action.slice(0, 120),
    summary: input.summary.slice(0, 500),
    target_type: input.targetType?.slice(0, 80) ?? null,
    target_id: input.targetId?.slice(0, 200) ?? null,
    metadata: input.metadata ?? {},
  })

  if (error) console.error("Jupiter audit event failed", error.message)
}
