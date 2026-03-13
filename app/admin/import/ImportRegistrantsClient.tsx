"use client"

import { useEffect, useMemo, useState } from "react"

type EventOption = {
  id: string
  slug: string
  title: string
  start_at: string | null
}

type PreviewRow = {
  rowNumber: number
  eventSlug: string | null
  resolvedEventId: string | null
  email: string
  firstName: string | null
  lastName: string | null
  tag: string | null
  notes: string | null
  sessionCodes: string[]
  resolvedSessionIds?: string[]
  missingSessionCodes?: string[]
  valid: boolean
  errors: string[]
}

type PreviewResponse = {
  success: boolean
  summary: {
    totalRows: number
    validRows: number
    invalidRows: number
    eventsDetected: number
    sessionsToAutoCreate?: number
  }
  rows: PreviewRow[]
}

type CommitResponse = {
  success: boolean
  summary: {
    totalRows: number
    registrantsCreated: number
    registrantsUpdated: number
    assignmentsWritten: number
    sessionsAutoCreated?: number
  }
}

type ImportStatus = "idle" | "running" | "success" | "error"

export default function ImportRegistrantsClient({
  initialEvents,
  initialSelectedEventId = "",
}: {
  initialEvents: EventOption[]
  initialSelectedEventId?: string
}) {
  const [selectedEventId, setSelectedEventId] = useState<string>(initialSelectedEventId)
  const [file, setFile] = useState<File | null>(null)

  const [previewLoading, setPreviewLoading] = useState(false)
  const [commitLoading, setCommitLoading] = useState(false)
  const [templateLoading, setTemplateLoading] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [commitResult, setCommitResult] = useState<CommitResponse | null>(null)
  const [rawResponse, setRawResponse] = useState<any>(null)

  const [importStatus, setImportStatus] = useState<ImportStatus>("idle")
  const [importMessage, setImportMessage] = useState<string>("")
  const [progressPct, setProgressPct] = useState<number>(0)

  const selectedEvent = useMemo(
    () => initialEvents.find((e) => e.id === selectedEventId) || null,
    [initialEvents, selectedEventId]
  )

  const exampleCsv = useMemo(
    () =>
      [
        "event_slug,email,first_name,last_name,session_code_1,session_code_2,session_code_3,session_code_4,tag,notes",
        `${selectedEvent?.slug || "oncology-summit-2026"},jane@example.com,Jane,Smith,OPENING,CLINICAL,,,VIP,Top client`,
        `${selectedEvent?.slug || "oncology-summit-2026"},bob@example.com,Bob,Jones,OPENING,REIMBURSE,CLOSING,,Attendee,Needs follow-up`,
      ].join("\n"),
    [selectedEvent?.slug]
  )

  useEffect(() => {
    if (importStatus !== "running") return

    setProgressPct(8)

    const id = window.setInterval(() => {
      setProgressPct((current) => {
        if (current >= 92) return current
        const step = Math.max(1, Math.round((92 - current) / 6))
        return Math.min(92, current + step)
      })
    }, 350)

    return () => window.clearInterval(id)
  }, [importStatus])

  async function downloadTemplate() {
    if (!selectedEventId) {
      setError("Choose an event before downloading the template.")
      return
    }

    try {
      setTemplateLoading(true)
      setError(null)

      const res = await fetch(
        `/api/admin/events/import-registrants/template?event_id=${encodeURIComponent(selectedEventId)}`,
        { method: "GET" }
      )

      if (!res.ok) {
        const json = await res.json().catch((): Record<string, unknown> => ({}))
        throw new Error((json?.error as string) || "Failed to download template")
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `registrants_template_${selectedEvent?.slug || "event"}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      setError(e?.message || "Failed to download template")
    } finally {
      setTemplateLoading(false)
    }
  }

  async function runPreview() {
    if (!file) {
      setError("Choose a CSV file first.")
      return
    }

    try {
      setPreviewLoading(true)
      setError(null)
      setCommitResult(null)
      setPreview(null)
      setRawResponse(null)
      setImportStatus("idle")
      setImportMessage("")
      setProgressPct(0)

      const fd = new FormData()
      fd.append("file", file)
      if (selectedEventId) fd.append("event_id", selectedEventId)

      const res = await fetch("/api/admin/events/import-registrants/preview", {
        method: "POST",
        body: fd,
      })

      const json = await res.json().catch((): Record<string, unknown> => ({}))
      setRawResponse(json)

      if (!res.ok || !json?.success) {
        throw new Error((json?.error as string) || "Preview failed")
      }

      setPreview(json as PreviewResponse)
    } catch (e: any) {
      setError(e?.message || "Preview failed")
    } finally {
      setPreviewLoading(false)
    }
  }

  async function runImport() {
    if (!file) {
      setError("Choose a CSV file first.")
      return
    }

    try {
      setCommitLoading(true)
      setError(null)
      setCommitResult(null)
      setRawResponse(null)
      setImportStatus("running")
      setImportMessage("Uploading CSV and processing registrants...")
      setProgressPct(10)

      const fd = new FormData()
      fd.append("file", file)
      if (selectedEventId) fd.append("event_id", selectedEventId)

      const res = await fetch("/api/admin/events/import-registrants", {
        method: "POST",
        body: fd,
      })

      const json = await res.json().catch((): Record<string, unknown> => ({}))
      setRawResponse(json)

      if (!res.ok || !json?.success) {
        throw new Error((json?.error as string) || "Import failed")
      }

      const typedJson = json as CommitResponse
      setCommitResult(typedJson)
      setImportStatus("success")
      setProgressPct(100)

      const summary = typedJson.summary
      setImportMessage(
        `Imported ${summary.totalRows} rows. ${summary.registrantsCreated} created, ${summary.registrantsUpdated} updated, ${summary.assignmentsWritten} assignments written${summary.sessionsAutoCreated != null ? `, ${summary.sessionsAutoCreated} sessions auto-created` : ""}.`
      )
    } catch (e: any) {
      setImportStatus("error")
      setProgressPct(100)
      setImportMessage(e?.message || "Import failed")
      setError(e?.message || "Import failed")
    } finally {
      setCommitLoading(false)
    }
  }

  const validPreviewRows = preview?.rows?.filter((r) => r.valid) || []
  const invalidPreviewRows = preview?.rows?.filter((r) => !r.valid) || []

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <h2 className="text-xl font-semibold">Import CSV</h2>
            <p className="mt-2 text-sm text-white/60">
              Upload a CSV that maps registrants to an event and one or more session codes.
            </p>

            <div className="mt-6 grid gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-white/80">
                  Event
                </label>
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none"
                  disabled={previewLoading || commitLoading || templateLoading}
                >
                  <option value="">Use CSV event_slug values</option>
                  {initialEvents.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.title} {event.slug ? `(${event.slug})` : ""}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-white/45">
                  Leave blank to let the CSV decide by <span className="font-mono">event_slug</span>.
                  Choose an event to force all rows into one event.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white/80">
                  CSV file
                </label>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-white file:mr-4 file:rounded-xl file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-white/15"
                  disabled={previewLoading || commitLoading}
                />
                {file ? (
                  <div className="mt-2 text-xs text-emerald-300">
                    Selected: {file.name}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={downloadTemplate}
                  disabled={templateLoading || !selectedEventId || commitLoading}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {templateLoading ? "Preparing template..." : "Download CSV template"}
                </button>

                <button
                  type="button"
                  onClick={runPreview}
                  disabled={previewLoading || commitLoading || !file}
                  className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {previewLoading ? "Previewing..." : "Preview import"}
                </button>

                <button
                  type="button"
                  onClick={runImport}
                  disabled={commitLoading || previewLoading || !file}
                  className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {commitLoading ? "Importing..." : "Run import"}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <div className="text-sm font-semibold text-white/80">How this works</div>
            <ul className="mt-3 space-y-2 text-sm text-white/60">
              <li>1. Create the event first.</li>
              <li>2. Session codes in the CSV can now be auto-created if missing.</li>
              <li>3. Use a unique session code for each session in the event.</li>
              <li>4. Upload a CSV using those session codes.</li>
              <li>5. Preview first, then run the import.</li>
            </ul>

            <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-100/90">
              Import replaces existing session assignments for each registrant row in the file.
            </div>
          </div>
        </div>

        {importStatus !== "idle" ? (
          <div
            className={[
              "mt-6 rounded-2xl border p-5",
              importStatus === "running" ? "border-sky-500/20 bg-sky-500/10" : "",
              importStatus === "success" ? "border-emerald-500/20 bg-emerald-500/10" : "",
              importStatus === "error" ? "border-red-500/25 bg-red-500/10" : "",
            ].join(" ")}
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-white">
                  {importStatus === "running" && "Importing registrants..."}
                  {importStatus === "success" && "Import completed"}
                  {importStatus === "error" && "Import failed"}
                </div>
                {importMessage ? (
                  <div className="mt-1 text-sm text-white/75">{importMessage}</div>
                ) : null}
              </div>

              <div
                className={[
                  "flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold",
                  importStatus === "running" ? "bg-sky-500/20 text-sky-200" : "",
                  importStatus === "success" ? "bg-emerald-500/20 text-emerald-200" : "",
                  importStatus === "error" ? "bg-red-500/20 text-red-200" : "",
                ].join(" ")}
              >
                {importStatus === "running" ? "…" : importStatus === "success" ? "✓" : "✕"}
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between text-xs text-white/60">
                <span>Status</span>
                <span>{progressPct}%</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className={[
                    "h-full rounded-full transition-all duration-300",
                    importStatus === "running" ? "bg-sky-500" : "",
                    importStatus === "success" ? "bg-emerald-500" : "",
                    importStatus === "error" ? "bg-red-500" : "",
                  ].join(" ")}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
        ) : null}

        {error && importStatus !== "error" ? (
          <div className="mt-6 rounded-2xl border border-red-500/25 bg-red-500/10 px-5 py-4 text-sm text-red-100">
            <div className="font-semibold">Import error</div>
            <div className="mt-1">{error}</div>
          </div>
        ) : null}

        {commitResult ? (
          <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
            <div className="text-sm font-semibold text-emerald-100">Import summary</div>
            <div className="mt-4 grid gap-4 md:grid-cols-5">
              <Stat label="Rows" value={commitResult.summary.totalRows} />
              <Stat label="Created" value={commitResult.summary.registrantsCreated} />
              <Stat label="Updated" value={commitResult.summary.registrantsUpdated} />
              <Stat label="Assignments" value={commitResult.summary.assignmentsWritten} />
              <Stat label="Sessions Auto-Created" value={commitResult.summary.sessionsAutoCreated || 0} />
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-semibold">CSV format</h2>
        <p className="mt-2 text-sm text-white/60">
          Use this exact header format. Missing session codes can now be created automatically during import.
        </p>

        <pre className="mt-4 overflow-auto rounded-2xl border border-white/10 bg-black/40 p-5 text-xs text-slate-200">
          {exampleCsv}
        </pre>
      </section>

      {preview ? (
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Preview results</h2>
              <p className="mt-1 text-sm text-white/60">
                Review the rows before you import.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-5">
            <Stat label="Total rows" value={preview.summary.totalRows} />
            <Stat label="Valid rows" value={preview.summary.validRows} />
            <Stat label="Invalid rows" value={preview.summary.invalidRows} />
            <Stat label="Events detected" value={preview.summary.eventsDetected} />
            <Stat label="Sessions to Auto-Create" value={preview.summary.sessionsToAutoCreate || 0} />
          </div>

          {invalidPreviewRows.length ? (
            <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-5">
              <div className="text-sm font-semibold text-red-100">
                Invalid rows ({invalidPreviewRows.length})
              </div>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-white/50">
                    <tr>
                      <th className="px-3 py-2">Row</th>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">Event</th>
                      <th className="px-3 py-2">Session Codes</th>
                      <th className="px-3 py-2">Errors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invalidPreviewRows.map((row) => (
                      <tr key={`bad-${row.rowNumber}`} className="border-t border-white/10 align-top">
                        <td className="px-3 py-3">{row.rowNumber}</td>
                        <td className="px-3 py-3">{row.email || "—"}</td>
                        <td className="px-3 py-3">{row.eventSlug || "—"}</td>
                        <td className="px-3 py-3">
                          {row.sessionCodes.length ? row.sessionCodes.join(", ") : "—"}
                        </td>
                        <td className="px-3 py-3 text-red-100">
                          {row.errors.join(" • ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {validPreviewRows.length ? (
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
              <div className="text-sm font-semibold text-white/80">
                Valid rows ({validPreviewRows.length})
              </div>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-white/50">
                    <tr>
                      <th className="px-3 py-2">Row</th>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Event</th>
                      <th className="px-3 py-2">Session Codes</th>
                      <th className="px-3 py-2">Will auto-create</th>
                      <th className="px-3 py-2">Tag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validPreviewRows.slice(0, 100).map((row) => (
                      <tr key={`good-${row.rowNumber}`} className="border-t border-white/10">
                        <td className="px-3 py-3">{row.rowNumber}</td>
                        <td className="px-3 py-3">{row.email}</td>
                        <td className="px-3 py-3">
                          {[row.firstName, row.lastName].filter(Boolean).join(" ") || "—"}
                        </td>
                        <td className="px-3 py-3">{row.eventSlug || "—"}</td>
                        <td className="px-3 py-3">
                          {row.sessionCodes.length ? row.sessionCodes.join(", ") : "—"}
                        </td>
                        <td className="px-3 py-3">
                          {row.missingSessionCodes?.length ? (
                            <span className="text-amber-200">
                              {row.missingSessionCodes.join(", ")}
                            </span>
                          ) : (
                            <span className="text-emerald-300">None</span>
                          )}
                        </td>
                        <td className="px-3 py-3">{row.tag || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {validPreviewRows.length > 100 ? (
                <div className="mt-3 text-xs text-white/45">
                  Showing first 100 valid rows.
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {rawResponse ? (
        <details className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <summary className="cursor-pointer text-sm font-semibold text-white/80">
            Debug response
          </summary>
          <pre className="mt-4 overflow-auto rounded-2xl border border-white/10 bg-black/40 p-5 text-xs text-slate-200">
            {JSON.stringify(rawResponse, null, 2)}
          </pre>
        </details>
      ) : null}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-xs text-white/50">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-white">{value}</div>
    </div>
  )
}