"use client"

import { useMemo, useRef, useState } from "react"

type RowError = { row: number; error: string }

type SuggestedWebinar = { id: string; title: string | null }

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

export default function ImportAttendeesUI({
  eventId,
  eventSlug,
  suggestedWebinars,
}: {
  eventId: string
  eventSlug: string
  suggestedWebinars: SuggestedWebinar[]
}) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)
  const [preview, setPreview] = useState<any>(null)


  const fileRef = useRef<HTMLInputElement | null>(null)

  const suggestedHeaders = useMemo(() => {
    const cols = (suggestedWebinars || [])
      .filter((w) => !!w.title)
      .slice(0, 8)
      .map((w) => String(w.title).replaceAll(",", " ").trim())

    return ["event", "email", "first_name", "last_name", ...cols]
  }, [suggestedWebinars])

  const templateText = useMemo(() => {
    const headers = suggestedHeaders
    const sampleRow = [
      eventSlug,
      "jane@company.com",
      "Jane",
      "Doe",
      ...headers.slice(4).map(() => "1"),
    ]

    const sampleRow2 = [
      eventSlug,
      "john@company.com",
      "John",
      "Smith",
      ...headers.slice(4).map((_, i) => (i % 2 === 0 ? "1" : "0")),
    ]

    return [headers.join(","), sampleRow.join(","), sampleRow2.join(",")].join("\n") + "\n"
  }, [eventSlug, suggestedHeaders])

  async function downloadTemplate() {
    // Prefer server-generated template (includes real webinar titles), fall back to local.
    try {
      const res = await fetch(
        `/api/admin/events/import-template?event_id=${encodeURIComponent(eventId)}&format=matrix`,
        { cache: "no-store" }
      )
      if (res.ok) {
        const text = await res.text()
        downloadBlob(`attendees_template_${eventSlug}.csv`, text)
        return
      }
    } catch {
      // ignore
    }
    downloadBlob(`attendees_template_${eventSlug}.csv`, templateText)
  }


async function previewCsv() {
  const f = fileRef.current?.files?.[0]
  if (!f) {
    setErr("Choose a CSV file")
    return
  }

  setBusy(true)
  setErr(null)
  setMsg(null)
  setPreview(null)

  try {
    const form = new FormData()
    form.append("file", f)
    form.append("event_id", eventId)

    const res = await fetch("/api/admin/events/import-attendees/preview", {
      method: "POST",
      body: form,
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error || "Preview failed")

    setPreview(json)
    setMsg("Preview ready")
  } catch (e: any) {
    setErr(e.message || "Preview failed")
  } finally {
    setBusy(false)
    setTimeout(() => setMsg(null), 2000)
  }
}

async function upload() {
    const f = fileRef.current?.files?.[0]
    if (!f) {
      setErr("Choose a CSV file")
      return
    }

    setBusy(true)
    setErr(null)
    setMsg(null)
    setResult(null)
    // keep preview visible


    try {
      const form = new FormData()
      form.append("file", f)
      form.append("event_id", eventId)

      const res = await fetch("/api/admin/events/import-attendees", {
        method: "POST",
        body: form,
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || "Import failed")

      setResult(json)
      setMsg("Import complete")
    } catch (e: any) {
      setErr(e.message || "Import failed")
    } finally {
      setBusy(false)
      setTimeout(() => setMsg(null), 2000)
    }
  }

  const rowErrors: RowError[] = result?.rowErrors || []

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">CSV format (matrix)</div>
            <div className="mt-1 text-sm text-white/60">
              One row per user. Webinar columns use <span className="text-white/80">1 / 0</span> (or yes/no, x) for access.
            </div>
          </div>
          <button
            type="button"
            onClick={downloadTemplate}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
          >
            Download CSV template
          </button>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-xs text-white/70 overflow-auto">
          <pre>{templateText}</pre>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">Upload attendees</div>
            <div className="mt-1 text-sm text-white/60">
              This will upsert users by email and assign webinar access under this event.
            </div>
          </div>
          
<div className="flex items-center gap-2">
  <button
    type="button"
    onClick={previewCsv}
    disabled={busy}
    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-60"
  >
    {busy ? "Working…" : "Preview"}
  </button>
  <button
    type="button"
    onClick={upload}
    disabled={busy || !preview?.success}
    className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold hover:bg-emerald-500 disabled:opacity-60"
    title={!preview?.success ? "Run Preview first" : "Import"}
  >
    {busy ? "Importing…" : "Import"}
  </button>
</div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="block w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
        />

        {err ? <div className="text-sm text-rose-200">{err}</div> : null}
        {msg ? <div className="text-sm text-emerald-200">{msg}</div> : null}

{preview ? (
  <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm">
    <div className="font-semibold">Preview</div>
    <div className="mt-2 grid gap-2 md:grid-cols-4 text-white/80">
      <div className="rounded-lg border border-white/10 bg-white/5 p-3">
        <div className="text-xs text-white/60">Users detected</div>
        <div className="text-lg font-bold">{preview.usersDetected ?? 0}</div>
      </div>
      <div className="rounded-lg border border-white/10 bg-white/5 p-3">
        <div className="text-xs text-white/60">Webinars detected</div>
        <div className="text-lg font-bold">{preview.webinarsDetected ?? 0}</div>
      </div>
      <div className="rounded-lg border border-white/10 bg-white/5 p-3">
        <div className="text-xs text-white/60">Assignments planned</div>
        <div className="text-lg font-bold">{preview.assignmentsPlanned ?? 0}</div>
      </div>
      <div className="rounded-lg border border-white/10 bg-white/5 p-3">
        <div className="text-xs text-white/60">Issues</div>
        <div className="text-lg font-bold">
          {(preview.invalidEmailCount ?? 0) + (preview.unknownWebinarsCount ?? 0) + (preview.missingWebinarCount ?? 0)}
        </div>
      </div>
    </div>

    <div className="mt-3 text-xs text-white/60 space-y-1">
      {(preview.invalidEmailCount ?? 0) ? <div>⚠ {preview.invalidEmailCount} invalid emails</div> : <div>✓ No invalid emails</div>}
      {(preview.unknownWebinarsCount ?? 0) ? <div>⚠ {preview.unknownWebinarsCount} webinar headers/identifiers not recognized</div> : <div>✓ All webinar headers recognized</div>}
      {(preview.missingWebinarCount ?? 0) ? <div>⚠ {preview.missingWebinarCount} rows missing webinar identifier</div> : null}
    </div>

    {preview.unknownWebinars?.length ? (
      <div className="mt-4">
        <div className="text-sm font-semibold">Unknown webinars</div>
        <div className="mt-2 max-h-40 overflow-auto rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-rose-200">
          {preview.unknownWebinars.slice(0, 200).join(", ")}
        </div>
      </div>
    ) : null}
  </div>
) : null}

        {result ? (
          <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm">
            <div className="font-semibold">Result</div>
            <div className="mt-2 grid gap-2 md:grid-cols-4 text-white/80">
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-white/60">Rows processed</div>
                <div className="text-lg font-bold">{result.processed ?? 0}</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-white/60">Users upserted</div>
                <div className="text-lg font-bold">{result.usersUpserted ?? 0}</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-white/60">Assignments</div>
                <div className="text-lg font-bold">{result.assignmentsUpserted ?? 0}</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-white/60">Errors</div>
                <div className="text-lg font-bold">{rowErrors.length}</div>
              </div>
            </div>

            {rowErrors.length ? (
              <div className="mt-4">
                <div className="text-sm font-semibold">Row errors</div>
                <div className="mt-2 max-h-64 overflow-auto rounded-xl border border-white/10 bg-black/30">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-black/50">
                      <tr>
                        <th className="p-2 text-white/60">Row</th>
                        <th className="p-2 text-white/60">Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rowErrors.slice(0, 200).map((r, idx) => (
                        <tr key={idx} className="border-t border-white/10">
                          <td className="p-2">{r.row}</td>
                          <td className="p-2 text-rose-200">{r.error}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {rowErrors.length > 200 ? (
                  <div className="mt-2 text-xs text-white/60">Showing first 200 errors.</div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  )
}
