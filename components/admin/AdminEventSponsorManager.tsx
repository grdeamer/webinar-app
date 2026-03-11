"use client"

import { useState } from "react"

type Sponsor = {
  id: string
  event_id: string
  name: string
  logo_url: string | null
  website_url: string | null
  tier: string | null
  description: string | null
  sort_index: number
}

export default function AdminEventSponsorManager({ eventId, initialSponsors }: { eventId: string; initialSponsors: Sponsor[] }) {
  const [sponsors, setSponsors] = useState<Sponsor[]>(initialSponsors || [])
  const [draft, setDraft] = useState({ name: "", logo_url: "", website_url: "", tier: "", description: "", sort_index: 0 })
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function refresh() {
    const res = await fetch(`/api/admin/event-sponsors?event_id=${encodeURIComponent(eventId)}`, { cache: "no-store" })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || "Failed")
    setSponsors(json.items || [])
  }

  async function createSponsor() {
    setBusy(true); setErr(null); setMsg(null)
    try {
      if (!draft.name.trim()) throw new Error("Sponsor name is required")
      const res = await fetch(`/api/admin/event-sponsors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, event_id: eventId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed")
      setDraft({ name: "", logo_url: "", website_url: "", tier: "", description: "", sort_index: 0 })
      await refresh()
      setMsg("Sponsor added")
    } catch (e: any) {
      setErr(e.message || "Failed")
    } finally {
      setBusy(false)
    }
  }

  async function updateSponsor(id: string, patch: Partial<Sponsor>) {
    const res = await fetch(`/api/admin/event-sponsors`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || "Failed")
    await refresh()
    setMsg("Sponsor saved")
  }

  async function deleteSponsor(id: string) {
    if (!confirm("Delete this sponsor?")) return
    const res = await fetch(`/api/admin/event-sponsors`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || "Failed")
    await refresh()
    setMsg("Sponsor deleted")
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Sponsor management</h2>
          <p className="mt-1 text-sm text-white/60">Add and edit logos, partner links, tiers, and sort order for the event homepage carousel.</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/50">{sponsors.length} sponsor{sponsors.length === 1 ? "" : "s"}</span>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <input className="rounded-xl border border-white/10 bg-white/5 px-3 py-2" placeholder="Sponsor name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        <input className="rounded-xl border border-white/10 bg-white/5 px-3 py-2" placeholder="Logo URL" value={draft.logo_url} onChange={(e) => setDraft({ ...draft, logo_url: e.target.value })} />
        <input className="rounded-xl border border-white/10 bg-white/5 px-3 py-2" placeholder="Website URL" value={draft.website_url} onChange={(e) => setDraft({ ...draft, website_url: e.target.value })} />
        <input className="rounded-xl border border-white/10 bg-white/5 px-3 py-2" placeholder="Tier" value={draft.tier} onChange={(e) => setDraft({ ...draft, tier: e.target.value })} />
        <input className="rounded-xl border border-white/10 bg-white/5 px-3 py-2" placeholder="Sort index" value={String(draft.sort_index)} onChange={(e) => setDraft({ ...draft, sort_index: Number(e.target.value || 0) })} />
        <input className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 md:col-span-2 xl:col-span-3" placeholder="Description" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button onClick={createSponsor} disabled={busy} className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold hover:bg-emerald-500 disabled:opacity-60">+ Add sponsor</button>
        {msg ? <span className="text-sm text-emerald-300">{msg}</span> : null}
        {err ? <span className="text-sm text-red-300">{err}</span> : null}
      </div>

      <div className="space-y-3">
        {sponsors.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-white/55">No sponsors yet.</div>
        ) : sponsors.map((sponsor) => (
          <div key={sponsor.id} className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 md:grid-cols-6">
            <input className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 md:col-span-2" defaultValue={sponsor.name} onBlur={(e) => updateSponsor(sponsor.id, { name: e.target.value })} />
            <input className="rounded-xl border border-white/10 bg-white/5 px-3 py-2" defaultValue={sponsor.tier || ""} onBlur={(e) => updateSponsor(sponsor.id, { tier: e.target.value })} />
            <input className="rounded-xl border border-white/10 bg-white/5 px-3 py-2" defaultValue={String(sponsor.sort_index ?? 0)} onBlur={(e) => updateSponsor(sponsor.id, { sort_index: Number(e.target.value || 0) })} />
            <button onClick={() => deleteSponsor(sponsor.id)} className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-200 hover:bg-red-500/20">Delete</button>
            <input className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 md:col-span-2" defaultValue={sponsor.logo_url || ""} placeholder="Logo URL" onBlur={(e) => updateSponsor(sponsor.id, { logo_url: e.target.value })} />
            <input className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 md:col-span-2" defaultValue={sponsor.website_url || ""} placeholder="Website URL" onBlur={(e) => updateSponsor(sponsor.id, { website_url: e.target.value })} />
            <input className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 md:col-span-2" defaultValue={sponsor.description || ""} placeholder="Description" onBlur={(e) => updateSponsor(sponsor.id, { description: e.target.value })} />
          </div>
        ))}
      </div>
    </section>
  )
}
