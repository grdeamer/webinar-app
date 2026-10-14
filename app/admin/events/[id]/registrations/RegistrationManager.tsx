"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
type Person = { id: string; email: string; first_name: string | null; last_name: string | null; registration_status: string; registration_answers: Record<string, unknown> }
export default function RegistrationManager({ eventId, people }: { eventId: string; people: Person[] }) {
  const router = useRouter(), [busy, setBusy] = useState(false), [error, setError] = useState("")
  async function update(id: string, status: string) { setBusy(true); setError(""); try { const r = await fetch(`/api/admin/events/${eventId}/registrations/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }); const d = await r.json(); if (!r.ok) throw new Error(d.error); router.refresh() } catch (e) { setError(e instanceof Error ? e.message : "Update failed") } finally { setBusy(false) } }
  return <div className="space-y-3">{error ? <p role="alert">{error}</p> : null}{!people.length ? <p>No registrations are waiting for review.</p> : people.map((p) => <article key={p.id} className="space-y-3 rounded-xl border border-white/15 p-4"><h2>{p.first_name} {p.last_name} · {p.email}</h2><p>{p.registration_status.replaceAll("_", " ")}</p><dl>{Object.entries(p.registration_answers ?? {}).map(([key, value]) => <div key={key}><dt className="text-xs opacity-60">{key}</dt><dd>{String(value)}</dd></div>)}</dl><div className="flex gap-3"><button disabled={busy} onClick={() => update(p.id, "approved")} className="rounded-lg bg-violet-600 px-4 py-2">Approve / confirm seat</button><button disabled={busy} onClick={() => update(p.id, "declined")} className="rounded-lg border px-4 py-2">Decline</button></div></article>)}</div>
}
