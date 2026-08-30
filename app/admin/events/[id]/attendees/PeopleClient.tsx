"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Check, CircleCheckBig, Download, Mail, Plus, RefreshCw, Search, Trash2, Upload, UserRound, Users, X } from "lucide-react"

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
type Session = { id: string; code: string | null; title: string; starts_at: string | null; ends_at: string | null; external_join_url: string | null }
type OperationProgress = {
  state: "idle" | "running" | "complete" | "error"
  percent: number
  title: string
  detail: string
}

const idleProgress = (): OperationProgress => ({ state: "idle", percent: 0, title: "", detail: "" })

function OperationProgressPanel({ progress, destructive = false }: { progress: OperationProgress; destructive?: boolean }) {
  if (progress.state === "idle") return null
  const complete = progress.state === "complete"
  const failed = progress.state === "error"
  const accent = failed ? "bg-red-400" : destructive ? "bg-gradient-to-r from-red-400 to-amber-300" : "bg-gradient-to-r from-cyan-400 via-emerald-400 to-green-300"

  return <div className={`mt-4 rounded-2xl border p-4 ${complete ? "border-emerald-300/25 bg-emerald-400/[.08]" : failed ? "border-red-300/20 bg-red-400/[.06]" : "border-white/10 bg-black/25"}`} aria-live="polite">
    <div className="flex items-center gap-3">
      <span className={`grid size-10 shrink-0 place-items-center rounded-full ${complete ? "bg-emerald-400/15 text-emerald-300" : failed ? "bg-red-400/15 text-red-300" : "bg-white/[.07] text-white/75"}`}>
        {complete ? <CircleCheckBig size={22} strokeWidth={2.25} /> : failed ? <X size={20} /> : <RefreshCw size={19} className="animate-spin" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3"><strong className="text-sm text-white">{progress.title}</strong><span className={`text-sm font-semibold tabular-nums ${complete ? "text-emerald-300" : "text-white/75"}`}>{progress.percent}%</span></div>
        <p className="mt-1 text-xs leading-5 text-white/50">{progress.detail}</p>
      </div>
    </div>
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[.08]" role="progressbar" aria-label={progress.title} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent}>
      <div className={`h-full rounded-full transition-[width] duration-500 ease-out ${accent}`} style={{ width: `${progress.percent}%` }} />
    </div>
  </div>
}

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

export default function PeopleClient({ 
  eventId, 
  eventSlug, 
  eventTitle,
  initialAttendees = [],
  initialSessions = []
}: { 
  eventId: string; 
  eventSlug: string; 
  eventTitle: string;
  initialAttendees?: Person[];
  initialSessions?: Session[];
}) {
  const [people, setPeople] = useState<Person[]>(initialAttendees)
  const [sessions, setSessions] = useState<Session[]>(initialSessions)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<"everyone" | Role>("everyone")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false) // Start with false since we have initial data
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkSelection, setBulkSelection] = useState<Set<string>>(() => new Set())
  const [removeOpen, setRemoveOpen] = useState(false)
  const [importProgress, setImportProgress] = useState<OperationProgress>(idleProgress)
  const [removeProgress, setRemoveProgress] = useState<OperationProgress>(idleProgress)
  const [newPerson, setNewPerson] = useState({ first_name: "", last_name: "", email: "", role: "registrant" as Role })
  const [editMode, setEditMode] = useState(false)
  const [editPerson, setEditPerson] = useState({ first_name: "", last_name: "", email: "", role: "registrant" as Role, district_meeting_url: "" })
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
      // Fallback to initial data if API fails
      console.warn("API load failed, using initial data:", loadError)
      if (initialAttendees.length > 0) {
        setPeople(initialAttendees)
        setSessions(initialSessions)
        setSelectedId((current) => current && initialAttendees.some((person) => person.id === current) ? current : initialAttendees[0]?.id || null)
      } else {
        setError(loadError instanceof Error ? loadError.message : "Could not load people")
      }
    } finally {
      setLoading(false)
    }
  }, [eventId, initialAttendees, initialSessions])

  useEffect(() => {
    // Only load from API if we don't have initial data
    if (initialAttendees.length === 0) {
      void load()
    }
  }, [load, initialAttendees.length])

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
  const selectedPeople = people.filter((person) => bulkSelection.has(person.id))
  const allVisibleSelected = visiblePeople.length > 0 && visiblePeople.every((person) => bulkSelection.has(person.id))
  const removingEveryone = people.length > 0 && bulkSelection.size === people.length

  function toggleBulkMode() {
    setBulkMode((current) => !current)
    setBulkSelection(new Set())
    setRemoveOpen(false)
    setRemoveProgress(idleProgress())
  }

  function openRemoveDialog() {
    setRemoveProgress(idleProgress())
    setRemoveOpen(true)
  }

  function closeRemoveDialog() {
    if (busy === "remove") return
    setRemoveOpen(false)
    setRemoveProgress(idleProgress())
    if (removeProgress.state === "complete") {
      setBulkSelection(new Set())
      setBulkMode(false)
    }
  }

  function toggleBulkPerson(personId: string) {
    setBulkSelection((current) => {
      const next = new Set(current)
      if (next.has(personId)) next.delete(personId)
      else next.add(personId)
      return next
    })
  }

  function toggleVisiblePeople() {
    setBulkSelection((current) => {
      const next = new Set(current)
      if (allVisibleSelected) visiblePeople.forEach((person) => next.delete(person.id))
      else visiblePeople.forEach((person) => next.add(person.id))
      return next
    })
  }

  function startEditing() {
    if (!selected) return
    const assignedSession = selected.session_ids.length > 0
      ? sessions.find((session) => session.id === selected.session_ids[0])
      : null
    setEditPerson({
      first_name: selected.first_name || "",
      last_name: selected.last_name || "",
      email: selected.email,
      role: selected.role,
      district_meeting_url: assignedSession?.external_join_url || ""
    })
    setEditMode(true)
  }

  function cancelEditing() {
    setEditMode(false)
    setEditPerson({ first_name: "", last_name: "", email: "", role: "registrant", district_meeting_url: "" })
  }

  async function savePersonEdit() {
    if (!selected || !editPerson.email) return
    setBusy("edit")
    try {
      const response = await fetch(`/api/admin/events/${eventId}/attendees/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: editPerson.first_name,
          last_name: editPerson.last_name,
          email: editPerson.email,
          role: editPerson.role,
          district_meeting_url: editPerson.district_meeting_url
        })
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to update person" }))
        throw new Error(error.error || "Failed to update person")
      }
      await load()
      setEditMode(false)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to update person")
    } finally {
      setBusy("idle")
    }
  }

  async function removeSelectedPeople() {
    if (bulkSelection.size === 0) return
    const removeCount = bulkSelection.size
    let progressTimer: ReturnType<typeof setInterval> | null = null
    setBusy("remove")
    setError(null)
    setRemoveProgress({ state: "running", percent: 5, title: "Removing selected people", detail: `Processing ${removeCount.toLocaleString()} record${removeCount === 1 ? "" : "s"}…` })
    progressTimer = setInterval(() => setRemoveProgress((current) => current.state === "running"
      ? { ...current, percent: Math.min(92, current.percent + Math.max(1, Math.ceil((92 - current.percent) * 0.12))) }
      : current), 350)
    try {
      const response = await fetch(`/api/admin/events/${eventId}/attendees/bulk-remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendee_ids: [...bulkSelection] }),
      })
      const payload = await response.json().catch((): null => null)
      if (!response.ok) throw new Error(payload?.error || "Could not remove people")
      setRemoveProgress({ state: "running", percent: 96, title: "Refreshing the directory", detail: "The removal is complete. Updating the People page now…" })
      await load()
      setRemoveProgress({ state: "complete", percent: 100, title: "Removal complete", detail: `${removeCount.toLocaleString()} ${removeCount === 1 ? "person was" : "people were"} removed successfully.` })
    } catch (removeError) {
      const message = removeError instanceof Error ? removeError.message : "Could not remove people"
      setError(message)
      setRemoveProgress({ state: "error", percent: 100, title: "Removal stopped", detail: message })
    } finally {
      if (progressTimer) clearInterval(progressTimer)
      setBusy(null)
    }
  }

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
    let progressTimer: ReturnType<typeof setInterval> | null = null
    setBusy("import")
    setError(null)
    setImportProgress({ state: "running", percent: 4, title: "Uploading attendees", detail: `Reading ${file.name} and adding people to this event…` })
    progressTimer = setInterval(() => setImportProgress((current) => current.state === "running"
      ? { ...current, percent: Math.min(92, current.percent + Math.max(1, Math.ceil((92 - current.percent) * 0.12))) }
      : current), 350)
    try {
      const form = new FormData()
      form.append("file", file)
      form.append("event_id", eventId)
      const response = await fetch("/api/admin/events/import-registrants", { method: "POST", body: form })
      const payload = await response.json().catch((): null => null)
      if (!response.ok) throw new Error(payload?.error || "Import failed")
      setImportProgress({ state: "running", percent: 96, title: "Refreshing the directory", detail: "The upload is complete. Loading the updated attendee list…" })
      await load()
      const imported = Number(payload?.imported ?? payload?.created ?? payload?.inserted ?? 0)
      setImportProgress({ state: "complete", percent: 100, title: "Upload complete", detail: imported > 0 ? `${imported.toLocaleString()} attendee${imported === 1 ? "" : "s"} added successfully.` : "The attendee file was processed successfully." })
      if (fileInput.current) fileInput.current.value = ""
    } catch (importError) {
      const message = importError instanceof Error ? importError.message : "Import failed"
      setError(message)
      setImportProgress({ state: "error", percent: 100, title: "Upload stopped", detail: message })
    } finally {
      if (progressTimer) clearInterval(progressTimer)
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
    <div className="space-y-6 text-white">
      <section className="border-b border-[#273348] pb-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div><div className="editorial-eyebrow">Event &nbsp;/&nbsp; People</div><h1 className="editorial-title mt-5">People</h1><p className="mt-3 max-w-2xl text-base text-white/55">Manage registrants, presenters, district assignments, and event access for {eventTitle}.</p></div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={toggleBulkMode} className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold ${bulkMode ? "border-red-300/25 bg-red-500/10 text-red-100" : "border-white/10 bg-white/[.05] hover:bg-white/10"}`}>{bulkMode ? <X size={16} /> : <Check size={16} />}{bulkMode ? "Exit Bulk Select" : "Bulk Select"}</button>
            <button type="button" onClick={() => { setImportOpen(!importOpen); setImportProgress(idleProgress); setAddOpen(false) }} className="inline-flex items-center gap-2 rounded-xl bg-[#3974df] px-4 py-2.5 text-sm font-semibold hover:bg-[#4f82e3]"><Upload size={16} />Import CSV</button>
            <button type="button" onClick={() => { setAddOpen(!addOpen); setImportOpen(false) }} className="inline-flex items-center gap-2 rounded-xl bg-[#6750d3] px-4 py-2.5 text-sm font-semibold hover:bg-[#765fe0]"><Plus size={16} />Add person</button>
          </div>
        </div>
      </section>

      {addOpen ? <section className="rounded-2xl border border-violet-300/15 bg-violet-500/[.06] p-5"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1.5fr_1fr_auto]"><input aria-label="First name" placeholder="First name" value={newPerson.first_name} onChange={(event) => setNewPerson({ ...newPerson, first_name: event.target.value })} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none" /><input aria-label="Last name" placeholder="Last name" value={newPerson.last_name} onChange={(event) => setNewPerson({ ...newPerson, last_name: event.target.value })} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none" /><input aria-label="Email" placeholder="Email address" type="email" value={newPerson.email} onChange={(event) => setNewPerson({ ...newPerson, email: event.target.value })} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none" /><select aria-label="Role" value={newPerson.role} onChange={(event) => setNewPerson({ ...newPerson, role: event.target.value as Role })} className="rounded-xl border border-white/10 bg-[#0a0f1c] px-4 py-3 text-sm"><option value="registrant">Registrant</option><option value="presenter">Presenter</option></select><button type="button" disabled={!newPerson.email || busy === "add"} onClick={() => void addPerson()} className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold disabled:opacity-40">{busy === "add" ? "Adding…" : "Add"}</button></div></section> : null}

      {importOpen ? <section className="rounded-2xl border border-white/10 bg-[#0c1420]/95 p-5 shadow-[0_20px_60px_rgba(0,0,0,.28)]"><div className="flex flex-wrap items-center justify-between gap-4"><div><div className="font-semibold">Import people from CSV</div><div className="mt-1 max-w-2xl text-xs leading-5 text-white/50">Bulk add people to this event. Jupiter already knows which event you are editing, so your file only needs each person’s email and optional profile or district fields.</div></div><button type="button" onClick={() => download(`people_${eventSlug}.csv`, template)} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 text-xs hover:bg-white/[.08]"><Download size={14} />Download template</button></div><div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-white/[.08] bg-black/20 p-3"><input ref={fileInput} type="file" accept=".csv,text/csv" className="min-w-0 flex-1 text-sm text-white/65 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-white/15" /><button type="button" onClick={() => void importCsv()} disabled={busy === "import"} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold shadow-[0_10px_30px_rgba(5,150,105,.18)] hover:bg-emerald-500 disabled:opacity-40">{busy === "import" ? `Uploading ${importProgress.percent}%…` : "Import people"}</button></div><OperationProgressPanel progress={importProgress} /></section> : null}

      <section className="grid gap-4 sm:grid-cols-3">
        {([{ id: "everyone", label: "Everyone", value: counts.everyone }, { id: "registrant", label: "Registrants", value: counts.registrant }, { id: "presenter", label: "Presenters", value: counts.presenter }] as const).map((item) => <button type="button" key={item.id} onClick={() => setFilter(item.id)} className={`relative flex min-h-[118px] flex-col items-start justify-between overflow-hidden rounded-2xl border px-5 py-5 text-left shadow-[0_18px_50px_rgba(0,0,0,.2)] transition ${filter === item.id ? "border-[#6750d3]/60 bg-[#15152a]" : "border-[#263249] bg-[#0a101c] hover:border-[#3b4963] hover:bg-[#0d1522]"}`}><div className="text-[11px] font-semibold uppercase tracking-[.16em] text-white/45">{item.label}</div><div className="mt-5 text-3xl font-semibold leading-none tabular-nums text-white">{item.value}</div></button>)}
      </section>

      {error ? <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div> : null}

      <section className="grid min-h-[520px] gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,.85fr)]">
        <div className="rounded-3xl border border-white/10 bg-white/[.03] p-5">
          <div className="flex items-center gap-3"><div className="relative flex-1"><Search className="absolute left-3 top-3.5 text-white/30" size={16} /><input aria-label="Search people" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search people" className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-10 pr-4 text-sm outline-none" /></div><button type="button" aria-label="Refresh people" onClick={() => void load()} className="rounded-xl border border-white/10 p-3 text-white/60"><RefreshCw className={loading ? "animate-spin" : ""} size={16} /></button></div>
          {bulkMode ? <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet-300/15 bg-violet-500/[.06] p-3"><button type="button" onClick={toggleVisiblePeople} disabled={visiblePeople.length === 0} className="inline-flex items-center gap-2 text-sm font-semibold text-violet-100 disabled:opacity-40"><span className={`flex h-5 w-5 items-center justify-center rounded border ${allVisibleSelected ? "border-violet-400 bg-violet-500" : "border-white/25 bg-black/20"}`}>{allVisibleSelected ? <Check size={14} /> : null}</span>{allVisibleSelected ? "Clear visible results" : `Select all ${visiblePeople.length} results`}</button><div className="flex items-center gap-3"><span className="text-xs text-white/50">{bulkSelection.size} selected</span>{bulkSelection.size > 0 ? <button type="button" onClick={() => setBulkSelection(new Set())} className="text-xs font-semibold text-white/65 hover:text-white">Clear</button> : null}<button type="button" disabled={bulkSelection.size === 0} onClick={() => setRemoveOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold hover:bg-red-500 disabled:opacity-35"><Trash2 size={14} />Remove</button></div></div> : null}
          <div className="mt-4 space-y-2">{visiblePeople.map((person) => { const checked = bulkSelection.has(person.id); return <button type="button" key={person.id} onClick={() => bulkMode ? toggleBulkPerson(person.id) : setSelectedId(person.id)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${bulkMode && checked ? "border-red-300/25 bg-red-500/[.08]" : !bulkMode && selectedId === person.id ? "border-violet-300/30 bg-violet-500/10" : "border-white/[.07] bg-black/15 hover:bg-white/[.05]"}`}>{bulkMode ? <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${checked ? "border-red-400 bg-red-500" : "border-white/25 bg-black/20"}`}>{checked ? <Check size={14} /> : null}</span> : <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[.07]"><UserRound size={17} /></div>}<div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{personName(person)}</div><div className="truncate text-xs text-white/45">{person.email}</div></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${person.role === "presenter" ? "bg-violet-500/15 text-violet-200" : "bg-sky-500/10 text-sky-200"}`}>{person.role}</span></button>})}{!loading && visiblePeople.length === 0 ? <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-white/40">No people match this view.</div> : null}</div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[.03] p-5">
          {bulkMode ? <div className="flex h-full min-h-[300px] flex-col"><div className="text-xs uppercase tracking-[.16em] text-white/35">Bulk selection</div><div className="mt-4 text-4xl font-semibold">{bulkSelection.size}</div><div className="mt-1 text-sm text-white/50">people selected</div><div className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-xl border border-white/[.07] bg-black/15 p-3"><div className="text-xs text-white/40">Registrants</div><div className="mt-1 text-xl font-semibold">{selectedPeople.filter((person) => person.role === "registrant").length}</div></div><div className="rounded-xl border border-white/[.07] bg-black/15 p-3"><div className="text-xs text-white/40">Presenters</div><div className="mt-1 text-xl font-semibold">{selectedPeople.filter((person) => person.role === "presenter").length}</div></div></div><div className="mt-6 rounded-xl border border-amber-300/10 bg-amber-500/[.05] p-4 text-xs leading-5 text-amber-50/65">Removal applies only to this event. It also clears the selected people’s session assignments and event access.</div><button type="button" disabled={bulkSelection.size === 0} onClick={() => setRemoveOpen(true)} className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold hover:bg-red-500 disabled:opacity-35"><Trash2 size={15} />Remove {bulkSelection.size || "selected"} from event</button></div> : !selected ? <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center text-white/40"><Users size={28} /><p className="mt-3 text-sm">Select a person to manage their role and access.</p></div> : <div className="space-y-5">{editMode ? <div className="space-y-4"><div className="text-xs uppercase tracking-[.16em] text-white/35">Edit person</div><div className="grid gap-3 md:grid-cols-2"><div><label className="text-xs font-semibold text-white/50">First name<input aria-label="First name" value={editPerson.first_name} onChange={(event) => setEditPerson({ ...editPerson, first_name: event.target.value })} className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm outline-none" /></label></div><div><label className="text-xs font-semibold text-white/50">Last name<input aria-label="Last name" value={editPerson.last_name} onChange={(event) => setEditPerson({ ...editPerson, last_name: event.target.value })} className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm outline-none" /></label></div><div className="md:col-span-2"><label className="text-xs font-semibold text-white/50">Email<input aria-label="Email" type="email" value={editPerson.email} onChange={(event) => setEditPerson({ ...editPerson, email: event.target.value })} className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm outline-none" /></label></div><div className="md:col-span-2"><label className="text-xs font-semibold text-white/50">District meeting URL<input aria-label="District meeting URL" type="url" value={editPerson.district_meeting_url} onChange={(event) => setEditPerson({ ...editPerson, district_meeting_url: event.target.value })} className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm outline-none" /></label></div><div><label className="text-xs font-semibold text-white/50">Role<select aria-label="Role" value={editPerson.role} onChange={(event) => setEditPerson({ ...editPerson, role: event.target.value as Role })} className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0a0f1c] px-4 py-2.5 text-sm"><option value="registrant">Registrant</option><option value="presenter">Presenter</option></select></label></div></div><div className="flex gap-2"><button type="button" disabled={busy === "edit" || !editPerson.email} onClick={() => void savePersonEdit()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold hover:bg-emerald-500 disabled:opacity-35">{busy === "edit" ? "Saving…" : "Save changes"}</button><button type="button" disabled={busy === "edit"} onClick={cancelEditing} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.05] px-4 py-2.5 text-sm font-semibold hover:bg-white/[.10]">Cancel</button></div></div> : <><div><div className="flex items-center justify-between"><div className="text-xs uppercase tracking-[.16em] text-white/35">Person details</div><button type="button" onClick={startEditing} className="text-xs font-semibold text-violet-200 hover:text-violet-100">Edit</button></div><h2 className="mt-2 text-xl font-semibold">{personName(selected)}</h2><p className="mt-1 text-sm text-white/50">{selected.email}</p></div><div><label className="text-xs font-semibold text-white/50">Role<select value={selected.role} disabled={busy === "role"} onChange={(event) => void updateRole(event.target.value as Role)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0f1c] px-4 py-3 text-sm"><option value="registrant">Registrant</option><option value="presenter">Presenter</option></select></label></div><div><div className="text-xs font-semibold text-white/50">Session access</div><div className="mt-2 space-y-2">{sessions.filter(session => selected.session_ids.includes(session.id)).map((session) => { const checked = selected.session_ids.includes(session.id); return <label key={session.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/[.07] bg-black/15 p-3"><div><div className="text-sm font-medium">{session.title}</div>{session.code ? <div className="text-xs text-white/35">{session.code}</div> : null}</div><input type="checkbox" checked={checked} disabled={busy === `session:${session.id}`} onChange={(event) => void toggleSession(session.id, event.target.checked)} className="h-4 w-4" /></label>})}{selected.session_ids.length === 0 ? <div className="text-sm text-white/40">No sessions assigned to this person.</div> : null}</div></div>{selected.role === "presenter" ? <div className="grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => void sendPresenterLink()} disabled={busy === "send" || selected.session_ids.length === 0} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold disabled:opacity-35"><Mail size={15} />{busy === "send" ? "Sending…" : "Send Access"}</button><button type="button" disabled={selected.session_ids.length !== 1} onClick={() => selected.session_ids[0] && navigator.clipboard.writeText(`${window.location.origin}/presenter/${eventSlug}/sessions/${selected.session_ids[0]}`)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold disabled:opacity-35"><Check size={15} />Copy Link</button></div> : <div className="rounded-xl border border-sky-300/10 bg-sky-500/[.05] p-3 text-xs leading-5 text-sky-100/65">Change this person to Presenter to enable presenter-room access.</div>}<Link href={`/admin/events/${eventId}/emails`} className="block text-center text-xs font-semibold text-sky-200/70 hover:text-sky-100">Manage Emails →</Link></>}</div>}
        </div>
      </section>

      {removeOpen ? (
        <div role="dialog" aria-modal="true" aria-labelledby="remove-people-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-5 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-red-300/15 bg-[#0b101c] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[.2em] text-red-200/55">Confirm removal</div>
                <h2 id="remove-people-title" className="mt-3 text-2xl font-semibold">Remove {bulkSelection.size} {bulkSelection.size === 1 ? "person" : "people"}?</h2>
              </div>
              <button type="button" aria-label="Close confirmation" disabled={busy === "remove"} onClick={closeRemoveDialog} className="rounded-lg border border-white/10 p-2 text-white/55 hover:bg-white/[.06] disabled:opacity-35"><X size={17} /></button>
            </div>
            <p className="mt-4 text-sm leading-6 text-white/55">They will be removed from <span className="font-semibold text-white/80">{eventTitle}</span>, including their session assignments and event access. Their global Jupiter account will not be deleted.</p>
            <OperationProgressPanel progress={removeProgress} />
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" disabled={busy === "remove"} onClick={closeRemoveDialog} className="rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/[.05] disabled:opacity-35">{removeProgress.state === "complete" ? "Done" : "Cancel"}</button>
              {removeProgress.state !== "complete" ? (
                <button type="button" disabled={busy === "remove"} onClick={() => void removeSelectedPeople()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold hover:bg-red-500 disabled:opacity-35"><Trash2 size={15} />{busy === "remove" ? `Removing ${removeProgress.percent}%…` : `Remove ${bulkSelection.size} from event`}</button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
