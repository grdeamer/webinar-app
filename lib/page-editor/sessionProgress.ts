export type TimelineSession = {
  id: string
  title: string
  track?: string | null
  start_at?: string | null
  end_at?: string | null
  status?: string | null
}

// Schedule progress never changes the producer-controlled live status.
export function sessionProgress(session: TimelineSession, now: number) {
  const start = Date.parse(session.start_at || "")
  const end = Date.parse(session.end_at || "")
  if (session.status === "cancelled") return { fraction: 0, label: "Cancelled", active: false }
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return { fraction: 0, label: "Time to be confirmed", active: false }
  if (!now) return { fraction: 0, label: "Scheduled", active: false }
  if (end === start) return { fraction: now >= start ? 1 : 0, label: "Milestone", active: false }
  if (session.status === "complete") return { fraction: 1, label: "Complete", active: false }
  if (now < start) return { fraction: 0, label: `Starts in ${Math.ceil((start - now) / 60000)} min`, active: false }
  if (now >= end) return { fraction: 1, label: session.status === "live" ? "Over scheduled time" : "Scheduled time ended", active: false }
  return { fraction: (now - start) / (end - start), label: `${Math.ceil((end - now) / 60000)} min remaining`, active: true }
}

export function timelineGroups(sessions: TimelineSession[], track = "") {
  const groups = new Map<string, TimelineSession[]>()
  const sorted = [...sessions].sort((a, b) => (Date.parse(a.start_at || "") || 0) - (Date.parse(b.start_at || "") || 0))
  for (const session of sorted) {
    const name = session.track?.trim() || "General"
    if (track.trim() && name.toLowerCase() !== track.trim().toLowerCase()) continue
    const existing = Array.from(groups.keys()).find(key => key.toLowerCase() === name.toLowerCase()) || name
    groups.set(existing, [...(groups.get(existing) || []), session])
  }
  return Array.from(groups, ([name, items]) => ({ name, items }))
}
