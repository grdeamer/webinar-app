"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Check, Download, Mail, Plus, RefreshCw, Search, Upload, UserRound, Users } from "lucide-react"

type Role = "registrant" | "presenter"
type Person = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  name: string
  session_ids: string[]
  role: Role
  created_at: string | null
  source: "event_registrants"
}
type Session = { id: string; code: string | null; title: string }

function personName(person: Person) {
  return [person.first_name, person.last_name].filter(Boolean).join(" ").trim() || person.name || person.email
}

function download(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }))
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export default function PeopleClient({ eventId, eventSlug, eventTitle }: { eventId: string; eventSlug: string; eventTitle: string }) {
  const [people, setPeople] = useState<Person[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<"everyone" | Role>("everyone")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [newPerson, setNewPerson] = useState({ first_name: "", last_name: "", email: "", role: "registrant" as Role })
  const fileInput = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/events/${eventId}/attendees`, { cache: "no-store" })
      const payload = await response.json().catch((): null => null)
      if (!response.ok) throw new Error(payload?.error || "Could not load people")
      const rows = (payload.attendees || []) as Person[]
      rows.sort((a, b) => personName(a).localeCompare(personName(b)))
      setPeople(rows)
      setSessions(payload.sessions || [])
      setSelectedId((current) => current && rows.some((person) => person.id === current) ? current : rows[0]?.id || null)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load people")
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => { void load() }, [load])

  const counts = useMemo(() => ({
    everyone: people.length,
    registrant: people.filter((person) => person.role === "registrant").length,
    presenter: people.filter((person) => person.role === "presenter").length,
  }), [people])

  const visiblePeople = useMemo(() => {
    const query = search.trim().toLowerCase()
    return people.filter((person) => {
      if (filter !== "everyone" && person.role !== filter) return false
      if (!query) return true
      return `${personName(person)} ${person.email}`.toLowerCase().includes(query)
    })
  }, [filter, people, search])

  const selected = people.find((person) => person.id === selectedId) || null

  async function addPerson() {
    setBusy("add")
    setError(null)
    try {
      const response = await fetch(`/api/admin/events/${eventId}/add-attendee`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPerson),
      })
      const payload = await response.json().catch((): null => null)
      if (!response.ok) throw new Error(payload?.error || "Could not add person")
      setNewPerson({ first_name: "", last_name: "", email: "", role: "registrant" })
      setAddOpen(false)
      await load()
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "Could not add person")
    } finally {
      setBusy(null)
    }
  }

  async function importCsv() {
    const file = fileInput.current?.files?.[0]
    if (!file) return
    setBusy("import")
    setError(null)
    try {
      const form = new FormData()
      form.append("file", file)
      form.append("event_id", eventId)
      const response = await fetch("/api/admin/events/import-registrants", { method: "POST", body: form })
      const payload = await response.json().catch((): null => null)
      if (!response.ok) throw new Error(payload?.error || "Import failed")
      setImportOpen(false)
      if (fileInput.current) fileInput.current.value = ""
      await load()
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Import failed")
    } finally {
      setBusy(null)
    }
  }

  async function updateRole(role: Role) {
    if (!selected) return
    const previous = selected.role
    setPeople((current) => current.map((person) => person.id === selected.id ? { ...person, role } : person))
    setBusy("role")
    try {
      const response = await fetch(`/api/admin/events/${eventId}/attendees/${selected.id}/role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      })
      const payload = await response.json().catch((): null => null)
      if (!response.ok) throw new Error(payload?.error || "Could not update role")
    } catch (roleError) {
      setPeople((current) => current.map((person) => person.id === selected.id ? { ...person, role: previous } : person))
      setError(roleError instanceof Error ? roleError.message : "Could not update role")
    } finally {
      setBusy(null)
    }
  }

  async function toggleSession(sessionId: string, checked: boolean) {
    if (!selected) return
    const previous = selected.session_ids
    const next = checked ? [...new Set([...previous, sessionId])] : previous.filter((id) => id !== sessionId)
    setPeople((current) => current.map((person) => person.id === selected.id ? { ...person, session_ids: next } : person))
    setBusy(`session:${sessionId}`)
    try {
      const response = await fetch(`/api/admin/events/${eventId}/attendees/${selected.id}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, checked }),
      })
      const payload = await response.json().catch((): null => null)
      if (!response.ok) throw new Error(payload?.error || "Could not update session access")
    } catch (sessionError) {
      setPeople((current) => current.map((person) => person.id === selected.id ? { ...person, session_ids: previous } : person))
      setError(sessionError instanceof Error ? sessionError.message : "Could not update session access")
    } finally {
      setBusy(null)
    }
  }

  async function sendPresenterLink() {
    if (!selected) return
    setBusy("send")
    setError(null)
    try {
      const response = await fetch(`/api/admin/events/${eventId}/emails/send-presenter-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrantId: selected.id }),
      })
      const payload = await response.json().catch((): null => null)
      if (!response.ok) throw new Error(payload?.error || "Could not send presenter access")
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Could not send presenter access")
    } finally {
      setBusy(null)
    }
  }

  const template = ["event_slug,email,first_name,last_name,tag,notes,session_code_1", `${eventSlug},jane@company.com,Jane,Doe,Registrant,,`].join("\n")

  return (
    <div className="space-y-5 text-white">
      <section className="rounded-3xl border border-white/10 bg-white/[.035] p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div><div className="text-[10px] font-black uppercase tracking-[.2em] text-violet-100/45">Event directory</div><h1 className="mt-3 text-3xl font-semibold">People</h1><p className="mt-2 text-sm text-white/55">Add and manage everyone connected to {eventTitle}.</p></div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { setAddOpen(!addOpen); setImportOpen(false) }} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold hover:bg-violet-500"><Plus size={16} />Add Person</button>
            <button type="button" onClick={() => { setImportOpen(!importOpen); setAddOpen(false) }} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.05] px-4 py-2.5 text-sm font-semibold hover:bg-white/10"><Upload size={16} />Import CSV</button>
          </div>
        </div>
      </section>

      {addOpen ? <section className="rounded-2xl border border-violet-300/15 bg-violet-500/[.06] p-5"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1.5fr_1fr_auto]"><input aria-label="First name" placeholder="First name" value={newPerson.first_name} onChange={(event) => setNewPerson({ ...newPerson, first_name: event.target.value })} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none" /><input aria-label="Last name" placeholder="Last name" value={newPerson.last_name} onChange={(event) => setNewPerson({ ...newPerson, last_name: event.target.value })} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none" /><input aria-label="Email" placeholder="Email address" type="email" value={newPerson.email} onChange={(event) => setNewPerson({ ...newPerson, email: event.target.value })} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none" /><select aria-label="Role" value={newPerson.role} onChange={(event) => setNewPerson({ ...newPerson, role: event.target.value as Role })} className="rounded-xl border border-white/10 bg-[#0a0f1c] px-4 py-3 text-sm"><option value="registrant">Registrant</option><option value="presenter">Presenter</option></select><button type="button" disabled={!newPerson.email || busy === "add"} onClick={() => void addPerson()} className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold disabled:opacity-40">{busy === "add" ? "Adding…" : "Add"}</button></div></section> : null}

      {importOpen ? <section className="rounded-2xl border border-white/10 bg-white/[.04] p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><div className="font-semibold">Import people from CSV</div><div className="mt-1 text-xs text-white/45">Bulk add registrants, then promote presenters in the directory.</div></div><button type="button" onClick={() => download(`people_${eventSlug}.csv`, template)} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs"><Download size={14} />Template</button></div><div className="mt-4 flex flex-wrap items-center gap-3"><input ref={fileInput} type="file" accept=".csv,text/csv" className="text-sm text-white/60" /><button type="button" onClick={() => void importCsv()} disabled={busy === "import"} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold disabled:opacity-40">{busy === "import" ? "Importing…" : "Import people"}</button></div></section> : null}

      <section className="grid gap-3 sm:grid-cols-3">
        {([{ id: "everyone", label: "Everyone", value: counts.everyone }, { id: "registrant", label: "Registrants", value: counts.registrant }, { id: "presenter", label: "Presenters", value: counts.presenter }] as const).map((item) => <button type="button" key={item.id} onClick={() => setFilter(item.id)} className={`rounded-2xl border p-4 text-left transition ${filter === item.id ? "border-violet-300/30 bg-violet-500/10" : "border-white/10 bg-white/[.035] hover:bg-white/[.06]"}`}><div className="text-xs text-white/45">{item.label}</div><div className="mt-1 text-2xl font-semibold">{item.value}</div></button>)}
      </section>

      {error ? <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div> : null}

      <section className="grid min-h-[520px] gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,.85fr)]">
        <div className="rounded-3xl border border-white/10 bg-white/[.03] p-5">
          <div className="flex items-center gap-3"><div className="relative flex-1"><Search className="absolute left-3 top-3.5 text-white/30" size={16} /><input aria-label="Search people" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search people" className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-10 pr-4 text-sm outline-none" /></div><button type="button" aria-label="Refresh people" onClick={() => void load()} className="rounded-xl border border-white/10 p-3 text-white/60"><RefreshCw className={loading ? "animate-spin" : ""} size={16} /></button></div>
          <div className="mt-4 space-y-2">{visiblePeople.map((person) => <button type="button" key={person.id} onClick={() => setSelectedId(person.id)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${selectedId === person.id ? "border-violet-300/30 bg-violet-500/10" : "border-white/[.07] bg-black/15 hover:bg-white/[.05]"}`}><div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[.07]"><UserRound size={17} /></div><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{personName(person)}</div><div className="truncate text-xs text-white/45">{person.email}</div></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${person.role === "presenter" ? "bg-violet-500/15 text-violet-200" : "bg-sky-500/10 text-sky-200"}`}>{person.role}</span></button>)}{!loading && visiblePeople.length === 0 ? <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-white/40">No people match this view.</div> : null}</div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[.03] p-5">
          {!selected ? <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center text-white/40"><Users size={28} /><p className="mt-3 text-sm">Select a person to manage their role and access.</p></div> : <div className="space-y-5"><div><div className="text-xs uppercase tracking-[.16em] text-white/35">Person details</div><h2 className="mt-2 text-xl font-semibold">{personName(selected)}</h2><p className="mt-1 text-sm text-white/50">{selected.email}</p></div><div><label className="text-xs font-semibold text-white/50">Role<select value={selected.role} disabled={busy === "role"} onChange={(event) => void updateRole(event.target.value as Role)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0f1c] px-4 py-3 text-sm"><option value="registrant">Registrant</option><option value="presenter">Presenter</option></select></label></div><div><div className="text-xs font-semibold text-white/50">Session access</div><div className="mt-2 space-y-2">{sessions.map((session) => { const checked = selected.session_ids.includes(session.id); return <label key={session.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/[.07] bg-black/15 p-3"><div><div className="text-sm font-medium">{session.title}</div>{session.code ? <div className="text-xs text-white/35">{session.code}</div> : null}</div><input type="checkbox" checked={checked} disabled={busy === `session:${session.id}`} onChange={(event) => void toggleSession(session.id, event.target.checked)} className="h-4 w-4" /></label>})}{sessions.length === 0 ? <div className="text-sm text-white/40">No sessions have been created yet.</div> : null}</div></div>{selected.role === "presenter" ? <div className="grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => void sendPresenterLink()} disabled={busy === "send" || selected.session_ids.length === 0} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold disabled:opacity-35"><Mail size={15} />{busy === "send" ? "Sending…" : "Send Access"}</button><button type="button" disabled={selected.session_ids.length !== 1} onClick={() => selected.session_ids[0] && navigator.clipboard.writeText(`${window.location.origin}/presenter/${eventSlug}/sessions/${selected.session_ids[0]}`)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold disabled:opacity-35"><Check size={15} />Copy Link</button></div> : <div className="rounded-xl border border-sky-300/10 bg-sky-500/[.05] p-3 text-xs leading-5 text-sky-100/65">Change this person to Presenter to enable presenter-room access.</div>}<Link href={`/admin/events/${eventId}/emails`} className="block text-center text-xs font-semibold text-sky-200/70 hover:text-sky-100">Open Communications →</Link></div>}
        </div>
      </section>
    </div>
  )
}
