"use client"

import { useMemo, useState } from "react"
import Link from "next/link"

type SkippedRow = { row: number; reason: string }

type Summary = {
  processed: number
  users: number
  webinars: number
  assignments: number
  skipped?: SkippedRow[]
}

export default function AdminUploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [rawResponse, setRawResponse] = useState<any>(null)

  const exampleCsv = useMemo(
    () =>
      [
        "email,title,date,time,tag,speaker,description,join_link",
        "grdeamer@gmail.com,NOM - 15,2026-02-20,1:00 PM ET,upcoming,Speaker Name,Short description,https://zoom.us/j/abc",
        "someone@company.com,Design Systems with Tailwind,2026-03-05,12:00 PM ET,upcoming,UI Team,Build consistent UI fast,https://zoom.us/j/def",
      ].join("\n"),
    []
  )

  async function onUpload() {
    if (!file) {
      setError("Please choose a CSV file first.")
      return
    }

    setLoading(true)
    setError(null)
    setSummary(null)
    setRawResponse(null)

    try {
      const fd = new FormData()
      fd.append("file", file)

      const res = await fetch("/api/admin/upload-csv", {
        method: "POST",
        body: fd,
      })

      const json = await res.json().catch(() => ({}))
      setRawResponse(json)

      if (!res.ok || !json?.success) {
        setError(json?.details || json?.error || "Upload failed")
        setLoading(false)
        return
      }

      setSummary({
        processed: json.processed ?? 0,
        users: json.users ?? 0,
        webinars: json.webinars ?? 0,
        assignments: json.assignments ?? 0,
        skipped: Array.isArray(json.skipped) ? json.skipped : [],
      })
    } catch (e: any) {
      setError(e?.message || "Network error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_circle_at_50%_30%,rgba(99,102,241,0.20),transparent_60%),radial-gradient(900px_circle_at_10%_10%,rgba(56,189,248,0.12),transparent_50%),linear-gradient(to_bottom,rgba(2,6,23,1),rgba(3,7,18,1))] text-slate-100">
      {/* Top bar */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="text-sm font-semibold tracking-wide text-slate-200">
          Admin • CSV Upload
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 shadow-sm backdrop-blur hover:bg-white/10"
          >
            Dashboard
          </Link>
          <Link
            href="/webinars"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 shadow-sm backdrop-blur hover:bg-white/10"
          >
            Public List
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 pb-16">
        {/* Upload card */}
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-[0_20px_80px_-40px_rgba(0,0,0,0.8)] backdrop-blur">
          <h1 className="text-2xl font-semibold">Upload Webinar Assignments CSV</h1>
          <p className="mt-2 text-sm text-slate-300">
            CSV should include at least: <span className="font-mono">email</span>,{" "}
            <span className="font-mono">title</span>, <span className="font-mono">date</span>.
            Optional: <span className="font-mono">description</span>,{" "}
            <span className="font-mono">speaker</span>, <span className="font-mono">time</span>,{" "}
            <span className="font-mono">tag</span>, <span className="font-mono">join_link</span>.
          </p>

          <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <label className="flex items-center gap-3">
              <span className="text-sm text-slate-200">Choose File</span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="block w-full text-sm text-slate-200 file:mr-4 file:rounded-xl file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-100 hover:file:bg-white/15"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>

            <button
              onClick={onUpload}
              disabled={loading || !file}
              className="inline-flex items-center justify-center rounded-2xl bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Uploading..." : "Upload CSV →"}
            </button>
          </div>

          {/* Errors */}
          {error ? (
            <div className="mt-5 rounded-2xl border border-red-500/25 bg-red-500/10 px-5 py-4 text-sm text-red-100">
              <div className="font-semibold">Upload failed</div>
              <div className="mt-1 opacity-90">{error}</div>
            </div>
          ) : null}

          {/* Summary */}
          {summary ? (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="text-sm font-semibold text-slate-200">Import summary</div>

              <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                <Stat label="Processed" value={summary.processed} />
                <Stat label="Users" value={summary.users} />
                <Stat label="Webinars" value={summary.webinars} />
                <Stat label="Assignments" value={summary.assignments} />
              </div>

              {summary.skipped?.length ? (
                <div className="mt-5 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-100">
                  <div className="font-semibold">Skipped rows ({summary.skipped.length})</div>
                  <div className="mt-2 text-amber-100/90">
                    These rows were read, but not inserted. Common reasons: missing required
                    columns, invalid email, or DB schema mismatch.
                  </div>
                  <ul className="mt-3 list-disc space-y-1 pl-5">
                    {summary.skipped.slice(0, 10).map((s, idx) => (
                      <li key={idx}>
                        <span className="font-semibold">Row {s.row}:</span> {s.reason}
                      </li>
                    ))}
                  </ul>
                  {summary.skipped.length > 10 ? (
                    <div className="mt-2 text-xs text-amber-100/80">
                      Showing first 10. (Open terminal for full details.)
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Debug (optional) */}
          {rawResponse ? (
            <details className="mt-5 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <summary className="cursor-pointer text-sm font-semibold text-slate-200">
                Debug response (optional)
              </summary>
              <pre className="mt-3 overflow-auto rounded-xl bg-black/40 p-3 text-xs text-slate-200">
                {JSON.stringify(rawResponse, null, 2)}
              </pre>
            </details>
          ) : null}
        </section>

        {/* Example card */}
        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur">
          <div className="text-lg font-semibold">CSV Example</div>
          <p className="mt-2 text-sm text-slate-300">
            Copy/paste this format (header must match exactly).
          </p>

          <pre className="mt-4 overflow-auto rounded-2xl border border-white/10 bg-black/40 p-5 text-xs text-slate-200">
            {exampleCsv}
          </pre>
        </section>
      </main>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="text-xs text-slate-300">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  )
}