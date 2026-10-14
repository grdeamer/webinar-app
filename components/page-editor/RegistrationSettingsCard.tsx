"use client"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { normalizeRegistrationConfig, record } from "@/lib/registration/schema"
export default function RegistrationSettingsCard({ value, onChange }: { value: unknown; onChange: (value: Record<string, unknown>) => void }) {
  const { slug } = useParams<{ slug: string }>()
  const [sessions, setSessions] = useState<{ id: string; title: string }[]>([])
  useEffect(() => { if (slug) fetch(`/api/admin/page-editor/event/${encodeURIComponent(slug)}/registration-sessions`).then((r) => r.json()).then((data) => setSessions(data.sessions ?? [])).catch(() => setSessions([])) }, [slug])
  const settings = record(value), config = normalizeRegistrationConfig({ registrationSettings: settings })
  const update = (patch: Record<string, unknown>) => onChange({ ...settings, ...patch })
  return <div className="space-y-3 rounded-xl border border-white/15 p-3 text-sm">
    <h3 className="font-semibold">Published registration rules</h3>
    <p className="text-xs text-white/60">These rules take effect when you publish this page. Preview states do not change access.</p>
    <label className="block">Registration mode<select aria-label="Registration mode" value={config.mode} onChange={(e) => update({ mode: e.target.value })} className="mt-1 w-full rounded-lg bg-slate-900 p-2"><option value="open">Open</option><option value="approval_required">Organizer approval</option><option value="invite_only">Invited emails only</option><option value="closed">Closed</option></select></label>
    <p className="text-xs text-white/60">For invitation-only events, add invited emails in People first.</p>
    <label className="block">Event capacity (blank = unlimited)<input aria-label="Event registration capacity" type="number" min={1} max={1000000} value={config.capacity ?? ""} onChange={(e) => update({ capacity: e.target.value ? Number(e.target.value) : null })} className="mt-1 w-full rounded-lg bg-slate-900 p-2" /></label>
    <label className="flex items-center gap-2"><input type="checkbox" checked={config.allowWaitlist} onChange={(e) => update({ allowWaitlist: e.target.checked })} />Allow event waitlist</label>
    <fieldset className="space-y-2"><legend>Sessions offered for registration</legend>{sessions.length ? sessions.map((session) => <label className="flex gap-2" key={session.id}><input type="checkbox" checked={config.sessions.some((s) => s.id === session.id)} onChange={(e) => update({ sessions: e.target.checked ? [...config.sessions, { id: session.id, title: session.title, capacity: null, allowWaitlist: false }] : config.sessions.filter((s) => s.id !== session.id) })} />{session.title}</label>) : <p className="text-xs text-white/60">Add sessions in Program to offer them here.</p>}</fieldset>
    {config.sessions.map((s) => <div key={s.id} className="space-y-2 border-t border-white/10 pt-2"><p className="break-all text-xs">{sessions.find((session) => session.id === s.id)?.title ?? "Selected session"}</p><label>Seat limit<input type="number" min={1} value={s.capacity ?? ""} onChange={(e) => update({ sessions: config.sessions.map((v) => v.id === s.id ? { ...v, capacity: e.target.value ? Number(e.target.value) : null } : v) })} className="w-full rounded-lg bg-slate-900 p-2" /></label><label className="flex gap-2"><input type="checkbox" checked={s.allowWaitlist} onChange={(e) => update({ sessions: config.sessions.map((v) => v.id === s.id ? { ...v, allowWaitlist: e.target.checked } : v) })} />Allow session waitlist</label></div>)}
  </div>
}
