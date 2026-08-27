"use client"

import { useEffect, useMemo, useRef, useState } from "react"

type EventSession = {
  id: string
  event_id: string
  code: string | null
  title: string
  starts_at: string | null
  ends_at: string | null
}

type EventAttendee = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  name: string
  session_ids: string[]
  source: "event_registrants" | "event_attendees"
}

type AttendeesResponse = {
  attendees: EventAttendee[]
  sessions: EventSession[]
}

function downloadBlob(filename: string, text: string, mime = "text/csv") {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function formatPersonName(attendee: EventAttendee) {
  const full = [attendee.first_name, attendee.last_name].filter(Boolean).join(" ").trim()
  return full || attendee.name || attendee.email
}

function dedupeAttendees(rows: EventAttendee[]) {
  const byEmail = new Map<string, EventAttendee>()

  for (const row of rows) {
    const key = row.email.trim().toLowerCase()
    const existing = byEmail.get(key)

    if (!existing) {
      byEmail.set(key, {
        ...row,
        session_ids: [...new Set(row.session_ids || [])],
      })
      continue
    }

    byEmail.set(key, {
      ...existing,
      id: existing.source === "event_registrants" ? existing.id : row.id,
      first_name: existing.first_name || row.first_name,
      last_name: existing.last_name || row.last_name,
      name: existing.name !== existing.email ? existing.name : row.name,
      source:
        existing.source === "event_registrants" || row.source === "event_registrants"
          ? "event_registrants"
          : "event_attendees",
      session_ids: [...new Set([...(existing.session_ids || []), ...(row.session_ids || [])])],
    })
  }

  return Array.from(byEmail.values()).sort((a, b) =>
    formatPersonName(a).localeCompare(formatPersonName(b))
  )
}

export default function ImportAttendeesUI({
  eventId,
  eventSlug,
}: {
  eventId: string
  eventSlug: string
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [attendees, setAttendees] = useState<EventAttendee[]>([])
  const [sessions, setSessions] = useState<EventSession[]>([])
  const [attendeesBusy, setAttendeesBusy] = useState(false)
  const [attendeesError, setAttendeesError] = useState<string | null>(null)

  const [selectedAttendeeId, setSelectedAttendeeId] = useState<string | null>(null)
  const [selectedAttendeeIds, setSelectedAttendeeIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState("")
  const [savingSessionId, setSavingSessionId] = useState<string | null>(null)
  const [bulkEditModalOpen, setBulkEditModalOpen] = useState(false)
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false)
  const [viewMode, setViewMode] = useState<"list" | "matrix">("list")

  const fileRef = useRef<HTMLInputElement | null>(null)
  const quickEmailRef = useRef<HTMLInputElement | null>(null)
  const quickFirstRef = useRef<HTMLInputElement | null>(null)
  const quickLastRef = useRef<HTMLInputElement | null>(null)

  const sessionTitleMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of sessions) map.set(s.id, s.title)
    return map
  }, [sessions])

  const templateText = useMemo(() => {
    const headers = ["event", "email", "first_name", "last_name", ...sessions.map((s) => s.title)]
    const sample1 = [
      eventSlug,
      "jane@company.com",
      "Jane",
      "Doe",
      ...sessions.map((_, i) => (i < 2 ? "1" : "0")),
    ]
    const sample2 = [
      eventSlug,
      "john@company.com",
      "John",
      "Smith",
      ...sessions.map((_, i) => (i % 2 === 0 ? "1" : "0")),
    ]
    return [headers.join(","), sample1.join(","), sample2.join(",")].join("\n") + "\n"
  }, [eventSlug, sessions])

  async function loadAttendees() {
    try {
      setAttendeesBusy(true)
      setAttendeesError(null)

      const res = await fetch(`/api/admin/events/${eventId}/attendees`, {
        cache: "no-store",
      })
      const json = (await res.json().catch(() => ({}))) as Partial<AttendeesResponse> & {
        error?: string
      }

      if (!res.ok) throw new Error(json.error || "Failed to load attendees")

      const deduped = dedupeAttendees(Array.isArray(json.attendees) ? json.attendees : [])
      setAttendees(deduped)
      setSessions(Array.isArray(json.sessions) ? json.sessions : [])

      setSelectedAttendeeId((prev) => {
        if (prev && deduped.some((a) => a.id === prev)) return prev
        return deduped[0]?.id || null
      })
    } catch (e: any) {
      setAttendeesError(e.message || "Failed to load attendees")
      setAttendees([])
      setSessions([])
      setSelectedAttendeeId(null)
    } finally {
      setAttendeesBusy(false)
    }
  }

  useEffect(() => {
    loadAttendees().catch(() => {})
  }, [eventId])

  const filteredAttendees = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return attendees

    return attendees.filter((a) => {
      const haystack = [
        a.email,
        a.first_name || "",
        a.last_name || "",
        formatPersonName(a),
        ...a.session_ids.map((id) => sessionTitleMap.get(id) || id),
      ]
        .join(" ")
        .toLowerCase()

      return haystack.includes(q)
    })
  }, [attendees, search, sessionTitleMap])

  // Toggle individual attendee selection
  function toggleAttendeeSelection(id: string) {
    setSelectedAttendeeIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Toggle all attendees
  function toggleSelectAll() {
    if (selectedAttendeeIds.size === filteredAttendees.length) {
      setSelectedAttendeeIds(new Set())
    } else {
      setSelectedAttendeeIds(new Set(filteredAttendees.map((a) => a.id)))
    }
  }

  // Clear selection
  function clearSelection() {
    setSelectedAttendeeIds(new Set())
  }

  // Bulk delete attendees
  async function handleBulkDelete() {
    if (selectedAttendeeIds.size === 0) {
      alert("Please select attendees to delete")
      return
    }

    const confirmed = window.confirm(
      `Are you sure you want to remove ${selectedAttendeeIds.size} attendee${selectedAttendeeIds.size === 1 ? "" : "s"} from this event? This action cannot be undone.`
    )

    if (!confirmed) return

    try {
      setBusy(true)
      setError(null)

      const res = await fetch(`/api/admin/events/${eventId}/attendees/bulk-delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendee_ids: Array.from(selectedAttendeeIds),
        }),
      })

      const json = await res.json().catch(() => ({}))

      if (!res.ok) throw new Error(json.error || "Failed to delete attendees")

      await loadAttendees()
      clearSelection()
      setBulkDeleteModalOpen(false)
      alert(`Successfully removed ${selectedAttendeeIds.size} attendee${selectedAttendeeIds.size === 1 ? "" : "s"}`)
    } catch (e: any) {
      alert(e.message || "Failed to delete attendees")
    } finally {
      setBusy(false)
    }
  }

  // Bulk edit sessions
  async function handleBulkEdit(sessionIdsToAdd: string[], sessionIdsToRemove: string[]) {
    if (selectedAttendeeIds.size === 0) {
      alert("Please select attendees to edit")
      return
    }

    try {
      setBusy(true)
      setError(null)

      const res = await fetch(`/api/admin/events/${eventId}/attendees/bulk-edit-sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendee_ids: Array.from(selectedAttendeeIds),
          add_session_ids: sessionIdsToAdd,
          remove_session_ids: sessionIdsToRemove,
        }),
      })

      const json = await res.json().catch(() => ({}))

      if (!res.ok) throw new Error(json.error || "Failed to update attendees")

      await loadAttendees()
      clearSelection()
      setBulkEditModalOpen(false)
      alert(`Successfully updated ${selectedAttendeeIds.size} attendee${selectedAttendeeIds.size === 1 ? "" : "s"}`)
    } catch (e: any) {
      alert(e.message || "Failed to update attendees")
    } finally {
      setBusy(false)
    }
  }

  const selectedAttendee =
    attendees.find((a) => a.id === selectedAttendeeId) ||
    filteredAttendees.find((a) => a.id === selectedAttendeeId) ||
    null

  async function handleQuickAdd() {
    const email = quickEmailRef.current?.value?.trim() || ""
    const first_name = quickFirstRef.current?.value?.trim() || ""
    const last_name = quickLastRef.current?.value?.trim() || ""

    if (!email) {
      alert("Email required")
      return
    }

    try {
      setBusy(true)
      setError(null)

      const res = await fetch(`/api/admin/events/${eventId}/add-attendee`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, first_name, last_name }),
      })
      const json = await res.json().catch(() => ({}))

      if (!res.ok) throw new Error(json.error || "Failed to add attendee")

      if (quickEmailRef.current) quickEmailRef.current.value = ""
      if (quickFirstRef.current) quickFirstRef.current.value = ""
      if (quickLastRef.current) quickLastRef.current.value = ""

      await loadAttendees()
    } catch (e: any) {
      alert(e.message || "Failed to add attendee")
    } finally {
      setBusy(false)
    }
  }

  async function handleImport() {
    const f = fileRef.current?.files?.[0]
    if (!f) {
      alert("Choose a CSV file")
      return
    }

    try {
      setBusy(true)
      setError(null)

      const form = new FormData()
      form.append("file", f)
      form.append("event_id", eventId)

      const res = await fetch("/api/admin/events/import-attendees", {
        method: "POST",
        body: form,
      })
      const json = await res.json().catch(() => ({}))

      if (!res.ok) throw new Error(json.error || "Import failed")

      await loadAttendees()
      alert("Import complete")
    } catch (e: any) {
      setError(e.message || "Import failed")
    } finally {
      setBusy(false)
    }
  }

  async function handleToggleSession(sessionId: string, checked: boolean) {
    if (!selectedAttendee) return

    if (selectedAttendee.source !== "event_registrants") {
      alert(
        "This attendee only exists in the legacy event_attendees table. Assign sessions by adding them as a registrant first, or re-import them through the current registrant flow."
      )
      return
    }

    const attendeeId = selectedAttendee.id
    const previousIds = selectedAttendee.session_ids || []

    setSavingSessionId(sessionId)
    setError(null)

    setAttendees((prev) =>
      prev.map((attendee) => {
        if (attendee.id !== attendeeId) return attendee

        const nextIds = checked
          ? [...new Set([...previousIds, sessionId])]
          : previousIds.filter((id) => id !== sessionId)

        return {
          ...attendee,
          session_ids: nextIds,
        }
      })
    )

    try {
      const res = await fetch(
        `/api/admin/events/${eventId}/attendees/${attendeeId}/sessions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId,
            checked,
          }),
        }
      )

      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(json.error || "Failed to update session assignment")
      }

      const nextIds = Array.isArray(json.session_ids) ? json.session_ids : []

      setAttendees((prev) =>
        prev.map((attendee) =>
          attendee.id === attendeeId
            ? {
                ...attendee,
                session_ids: nextIds,
              }
            : attendee
        )
      )
    } catch (e: any) {
      setAttendees((prev) =>
        prev.map((attendee) =>
          attendee.id === attendeeId
            ? {
                ...attendee,
                session_ids: previousIds,
              }
            : attendee
        )
      )

      setError(e.message || "Failed to update session assignment")
      alert(e.message || "Failed to update session assignment")
    } finally {
      setSavingSessionId(null)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-wrap gap-3">
          <input
            ref={quickEmailRef}
            placeholder="Email"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
          />
          <input
            ref={quickFirstRef}
            placeholder="First name"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
          />
          <input
            ref={quickLastRef}
            placeholder="Last name"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
          />
          <button
            onClick={handleQuickAdd}
            disabled={busy}
            className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            {busy ? "Working..." : "Add attendee"}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">Upload CSV</div>
            <div className="mt-1 text-sm text-white/60">
              This will import attendees and assign session access under this event.
            </div>
          </div>

          <button
            onClick={() => downloadBlob(`template_${eventSlug}.csv`, templateText)}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
          >
            Download template
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="block text-sm"
          />
          <button
            onClick={handleImport}
            disabled={busy}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            {busy ? "Importing..." : "Import"}
          </button>
        </div>

        {error ? <div className="mt-3 text-sm text-rose-200">{error}</div> : null}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">
              Current registrants ({attendees.length})
            </div>
            <div className="mt-1 text-sm text-white/60">
              Live list of attendees currently assigned to this event.
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setViewMode(viewMode === "list" ? "matrix" : "list")}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
            >
              {viewMode === "list" ? "Matrix View" : "List View"}
            </button>
            <button
              onClick={() => loadAttendees()}
              disabled={attendeesBusy}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-60"
            >
              {attendeesBusy ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedAttendeeIds.size > 0 && (
          <div className="mt-4 rounded-xl border border-sky-400/30 bg-sky-400/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-white">
                <span className="font-semibold">{selectedAttendeeIds.size}</span> attendee{selectedAttendeeIds.size === 1 ? "" : "s"} selected
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setBulkEditModalOpen(true)}
                  className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
                >
                  Edit Sessions
                </button>
                <button
                  onClick={() => setBulkDeleteModalOpen(true)}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500"
                >
                  Delete
                </button>
                <button
                  onClick={clearSelection}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="mb-4 flex items-center gap-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, or assigned session"
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
              />
              {viewMode === "list" && (
                <button
                  onClick={toggleSelectAll}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm hover:bg-white/10"
                >
                  {selectedAttendeeIds.size === filteredAttendees.length ? "Deselect All" : "Select All"}
                </button>
              )}
            </div>

            {attendeesError ? (
              <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-200">
                {attendeesError}
              </div>
            ) : null}

            {!attendeesBusy && filteredAttendees.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-5 text-sm text-white/55">
                No attendees match your search.
              </div>
            ) : null}

            {viewMode === "list" ? (
              <div className="space-y-2">
                {filteredAttendees.map((attendee) => {
                  const isSelected = selectedAttendeeId === attendee.id
                  const isBulkSelected = selectedAttendeeIds.has(attendee.id)

                  return (
                    <button
                      key={attendee.id}
                      type="button"
                      onClick={() => setSelectedAttendeeId(attendee.id)}
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        isSelected
                          ? "border-sky-400/40 bg-sky-400/10"
                          : "border-white/10 bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isBulkSelected}
                          onChange={(e) => {
                            e.stopPropagation()
                            toggleAttendeeSelection(attendee.id)
                          }}
                          className="mt-1 h-4 w-4 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-white">
                            {formatPersonName(attendee)}
                          </div>
                          <div className="mt-1 truncate text-xs text-white/50">
                            {attendee.email}
                          </div>
                        </div>

                        <span className="shrink-0 rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] text-white/60">
                          {attendee.session_ids.length} session
                          {attendee.session_ids.length === 1 ? "" : "s"}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <MatrixView
                attendees={filteredAttendees}
                sessions={sessions}
                sessionTitleMap={sessionTitleMap}
                selectedAttendeeId={selectedAttendeeId}
                setSelectedAttendeeId={setSelectedAttendeeId}
                selectedAttendeeIds={selectedAttendeeIds}
                toggleAttendeeSelection={toggleAttendeeSelection}
                onAttendeeDrop={async (attendeeId, sessionId) => {
                  // Handle drop - add session to attendee
                  const attendee = attendees.find(a => a.id === attendeeId)
                  if (attendee && attendee.source === "event_registrants") {
                    await handleToggleSession(sessionId, !attendee.session_ids.includes(sessionId))
                  }
                }}
              />
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="mb-3 text-sm font-semibold">Selected attendee</div>

            {!selectedAttendee ? (
              <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-5 text-sm text-white/55">
                Select an attendee from the list to inspect current assignments.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-base font-semibold text-white">
                    {formatPersonName(selectedAttendee)}
                  </div>
                  <div className="mt-1 text-sm text-white/60">
                    {selectedAttendee.email}
                  </div>
                  <div className="mt-2 text-xs text-white/45">
                    Source: {selectedAttendee.source}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-sm font-semibold text-white">Assigned sessions</div>

                  {selectedAttendee.session_ids.length === 0 ? (
                    <div className="mt-3 text-sm text-white/55">
                      No sessions assigned yet.
                    </div>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedAttendee.session_ids.map((id) => (
                        <span
                          key={id}
                          className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/75"
                        >
                          {sessionTitleMap.get(id) || id}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-sm font-semibold text-white">Edit session access</div>
                  <div className="mt-1 text-xs text-white/55">
                    Check or uncheck sessions to update this attendee instantly.
                  </div>

                  {selectedAttendee.source !== "event_registrants" ? (
                    <div className="mt-3 rounded-xl border border-amber-300/20 bg-amber-400/10 p-3 text-sm text-amber-100">
                      This attendee is only coming from the legacy event_attendees table, so
                      direct session editing is disabled for now.
                    </div>
                  ) : (
                    <div className="mt-4 space-y-2">
                      {sessions.map((session) => {
                        const checked = selectedAttendee.session_ids.includes(session.id)
                        const isSaving = savingSessionId === session.id

                        return (
                          <label
                            key={session.id}
                            className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-3"
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-white">
                                {session.title}
                              </div>
                              <div className="text-xs text-white/45">
                                {session.code || "No code"}
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              {isSaving ? (
                                <span className="text-xs text-white/45">Saving...</span>
                              ) : null}

                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={isSaving}
                                onChange={(e) =>
                                  handleToggleSession(session.id, e.target.checked)
                                }
                                className="h-4 w-4"
                              />
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Bulk Edit Modal */}
      {bulkEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="mb-4 text-lg font-semibold text-white">
              Edit Sessions for {selectedAttendeeIds.size} Attendee{selectedAttendeeIds.size === 1 ? "" : "s"}
            </div>
            <div className="mb-4 text-sm text-white/60">
              Select the sessions to add or remove for the selected attendees.
            </div>

            <div className="mb-4 space-y-2">
              {sessions.map((session) => (
                <label
                  key={session.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white">
                      {session.title}
                    </div>
                    <div className="text-xs text-white/45">
                      {session.code || "No code"}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        // Add to all selected
                        handleBulkEdit([session.id], [])
                      }}
                      className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        // Remove from all selected
                        handleBulkEdit([], [session.id])
                      }}
                      className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-500"
                    >
                      Remove
                    </button>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setBulkEditModalOpen(false)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {bulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="mb-4 text-lg font-semibold text-white">
              Confirm Delete
            </div>
            <div className="mb-4 text-sm text-white/60">
              Are you sure you want to remove {selectedAttendeeIds.size} attendee{selectedAttendeeIds.size === 1 ? "" : "s"} from this event? This action cannot be undone.
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setBulkDeleteModalOpen(false)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={busy}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-60"
              >
                {busy ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Matrix View Component for Visual Drag-and-Drop
function MatrixView({
  attendees,
  sessions,
  sessionTitleMap,
  selectedAttendeeId,
  setSelectedAttendeeId,
  selectedAttendeeIds,
  toggleAttendeeSelection,
  onAttendeeDrop,
}: {
  attendees: EventAttendee[]
  sessions: EventSession[]
  sessionTitleMap: Map<string, string>
  selectedAttendeeId: string | null
  setSelectedAttendeeId: (id: string | null) => void
  selectedAttendeeIds: Set<string>
  toggleAttendeeSelection: (id: string) => void
  onAttendeeDrop: (attendeeId: string, sessionId: string) => Promise<void>
}) {
  const [draggedAttendee, setDraggedAttendee] = useState<string | null>(null)
  const [highlightedSession, setHighlightedSession] = useState<string | null>(null)

  // Group attendees by their primary session
  const sessionGroups = useMemo(() => {
    const groups = new Map<string, EventAttendee[]>()
    
    // Initialize with all sessions
    sessions.forEach(session => {
      groups.set(session.id, [])
    })
    
    // Add "Unassigned" group
    groups.set("unassigned", [])
    
    // Assign attendees to their primary session
    attendees.forEach(attendee => {
      const primarySessionId = attendee.session_ids[0] || "unassigned"
      const current = groups.get(primarySessionId) || []
      current.push(attendee)
      groups.set(primarySessionId, current)
    })
    
    return groups
  }, [attendees, sessions])

  function handleDragStart(attendeeId: string) {
    setDraggedAttendee(attendeeId)
  }

  function handleDragEnd() {
    setDraggedAttendee(null)
    setHighlightedSession(null)
  }

  function handleDragOver(sessionId: string) {
    setHighlightedSession(sessionId)
  }

  function handleDragLeave() {
    setHighlightedSession(null)
  }

  async function handleDrop(sessionId: string) {
    if (draggedAttendee && sessionId !== "unassigned") {
      await onAttendeeDrop(draggedAttendee, sessionId)
    }
    setDraggedAttendee(null)
    setHighlightedSession(null)
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-white/60">
        Drag attendees between districts to reassign them. Click an attendee to select them for bulk operations.
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Unassigned */}
        <div
          className={`rounded-xl border-2 border-dashed p-4 transition ${
            highlightedSession === "unassigned"
              ? "border-sky-400 bg-sky-400/10"
              : "border-white/10 bg-black/20"
          }`}
          onDragOver={() => handleDragOver("unassigned")}
          onDragLeave={handleDragLeave}
          onDrop={() => handleDrop("unassigned")}
        >
          <div className="mb-3 text-sm font-semibold text-white">
            Unassigned ({sessionGroups.get("unassigned")?.length || 0})
          </div>
          <div className="space-y-2">
            {(sessionGroups.get("unassigned") || []).map((attendee) => (
              <div
                key={attendee.id}
                draggable
                onDragStart={() => handleDragStart(attendee.id)}
                onDragEnd={handleDragEnd}
                onClick={() => setSelectedAttendeeId(attendee.id)}
                className={`cursor-grab rounded-lg border p-2 text-left transition ${
                  selectedAttendeeId === attendee.id
                    ? "border-sky-400 bg-sky-400/10"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                } ${draggedAttendee === attendee.id ? "opacity-50" : ""}`}
              >
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={selectedAttendeeIds.has(attendee.id)}
                    onChange={(e) => {
                      e.stopPropagation()
                      toggleAttendeeSelection(attendee.id)
                    }}
                    className="mt-0.5 h-3 w-3 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-semibold text-white">
                      {formatPersonName(attendee)}
                    </div>
                    <div className="truncate text-[10px] text-white/50">
                      {attendee.email}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sessions/Districts */}
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`rounded-xl border-2 p-4 transition ${
              highlightedSession === session.id
                ? "border-sky-400 bg-sky-400/10"
                : "border-white/10 bg-black/20"
            }`}
            onDragOver={() => handleDragOver(session.id)}
            onDragLeave={handleDragLeave}
            onDrop={() => handleDrop(session.id)}
          >
            <div className="mb-3 text-sm font-semibold text-white">
              {session.title} ({sessionGroups.get(session.id)?.length || 0})
            </div>
            <div className="space-y-2">
              {(sessionGroups.get(session.id) || []).map((attendee) => (
                <div
                  key={attendee.id}
                  draggable
                  onDragStart={() => handleDragStart(attendee.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => setSelectedAttendeeId(attendee.id)}
                  className={`cursor-grab rounded-lg border p-2 text-left transition ${
                    selectedAttendeeId === attendee.id
                      ? "border-sky-400 bg-sky-400/10"
                      : "border-white/10 bg-white/5 hover:bg-white/10"
                  } ${draggedAttendee === attendee.id ? "opacity-50" : ""}`}
                >
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={selectedAttendeeIds.has(attendee.id)}
                      onChange={(e) => {
                        e.stopPropagation()
                        toggleAttendeeSelection(attendee.id)
                      }}
                      className="mt-0.5 h-3 w-3 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-semibold text-white">
                        {formatPersonName(attendee)}
                      </div>
                      <div className="truncate text-[10px] text-white/50">
                        {attendee.email}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}