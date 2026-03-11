"use client"

import React from "react"

type Profile = {
  id: string
  name: string
  title: string | null
  company: string | null
  bio: string | null
  interests: string | null
  created_at: string
}

function getSessionId() {
  const key = "attendee_session_id"
  if (typeof window === "undefined") return ""
  let v = localStorage.getItem(key)
  if (!v) {
    v = crypto.randomUUID()
    localStorage.setItem(key, v)
  }
  return v
}

export default function NetworkingRoom({ eventSlug }: { eventSlug: string }) {
  const sessionId = React.useMemo(() => getSessionId(), [])
  const [me, setMe] = React.useState({ name: "", title: "", company: "", bio: "", interests: "" })
  const [profiles, setProfiles] = React.useState<Profile[]>([])
  const [busy, setBusy] = React.useState(false)

  async function refresh() {
    const res = await fetch(`/api/events/${eventSlug}/networking`, { cache: "no-store" })
    const json = await res.json()
    setProfiles(json.profiles || [])
  }

  React.useEffect(() => {
    refresh()
    const id = setInterval(refresh, 8000)
    return () => clearInterval(id)
  }, [eventSlug])

  async function save() {
    if (!me.name.trim()) return alert("Name is required")
    setBusy(true)
    try {
      await fetch(`/api/events/${eventSlug}/networking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          name: me.name.trim(),
          title: me.title.trim() || null,
          company: me.company.trim() || null,
          bio: me.bio.trim() || null,
          interests: me.interests.trim() || null,
        }),
      })
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <section className="rounded-2xl border border-white/10 bg-black/20 p-5">
        <h2 className="text-lg font-semibold">Your profile</h2>
        <p className="mt-1 text-sm text-white/60">Share a quick intro so people can connect.</p>

        <div className="mt-4 space-y-3">
          <input className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm" placeholder="Name *" value={me.name} onChange={(e) => setMe({ ...me, name: e.target.value })} />
          <div className="flex gap-2">
            <input className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm" placeholder="Title" value={me.title} onChange={(e) => setMe({ ...me, title: e.target.value })} />
            <input className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm" placeholder="Company" value={me.company} onChange={(e) => setMe({ ...me, company: e.target.value })} />
          </div>
          <textarea className="w-full min-h-[90px] rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm" placeholder="Bio" value={me.bio} onChange={(e) => setMe({ ...me, bio: e.target.value })} />
          <input className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm" placeholder="Interests (comma-separated)" value={me.interests} onChange={(e) => setMe({ ...me, interests: e.target.value })} />
          <button disabled={busy} className="w-full rounded-xl bg-emerald-600 px-4 py-2 font-semibold hover:bg-emerald-500 disabled:opacity-60" onClick={save}>
            Save / Update
          </button>
        </div>
      </section>

      <section className="lg:col-span-2 rounded-2xl border border-white/10 bg-black/20 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">People here</h2>
          <button className="text-xs rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 hover:bg-white/10" onClick={refresh}>Refresh</button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {profiles.map((p) => (
            <div key={p.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="font-semibold">{p.name}</div>
              <div className="mt-1 text-sm text-white/60">
                {[p.title, p.company].filter(Boolean).join(" • ")}
              </div>
              {p.bio ? <div className="mt-2 text-sm text-white/80 whitespace-pre-wrap">{p.bio}</div> : null}
              {p.interests ? <div className="mt-2 text-xs text-white/50">Interests: {p.interests}</div> : null}
            </div>
          ))}
          {profiles.length === 0 ? <div className="text-white/60">No profiles yet.</div> : null}
        </div>
      </section>
    </div>
  )
}
