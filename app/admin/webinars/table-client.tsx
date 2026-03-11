"use client"

import Link from "next/link"
import React from "react"

type WebinarRow = {
  id: string
  title: string | null
  webinar_date: string | null
}

type ClickRow = {
  id: string
  webinar_id: string | null
  user_id: string | null
  created_at: string | null
}

function downloadCSV(filename: string, rows: Record<string, any>[]) {
  const headers = Object.keys(rows[0] || {})
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(",")),
  ].join("\n")

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function WebinarsTableClient({
  webinars,
  clickCounts,
  clicks,
}: {
  webinars: WebinarRow[]
  clickCounts: Record<string, number>
  clicks: ClickRow[]
}) {
  const [search, setSearch] = React.useState("")
  const [sort, setSort] = React.useState<"date" | "clicks">("date")

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()

    const base = q
      ? webinars.filter((w) => (w.title || "").toLowerCase().includes(q))
      : webinars.slice()

    base.sort((a, b) => {
      if (sort === "clicks") {
        return (clickCounts[b.id] ?? 0) - (clickCounts[a.id] ?? 0)
      }
      const ad = a.webinar_date ? new Date(a.webinar_date).getTime() : 0
      const bd = b.webinar_date ? new Date(b.webinar_date).getTime() : 0
      return bd - ad
    })

    return base
  }, [webinars, clickCounts, search, sort])

  function exportWebinarsCSV() {
    const rows = filtered.map((w) => ({
      id: w.id,
      title: w.title ?? "",
      webinar_date: w.webinar_date ?? "",
      clicks: clickCounts[w.id] ?? 0,
    }))
    downloadCSV("webinars.csv", rows)
  }

  function exportClicksCSV() {
    // Map webinar_id -> title for nicer exports
    const titleMap = new Map(webinars.map((w) => [w.id, w.title ?? ""]))

    const rows = (clicks || []).map((c) => ({
      click_id: c.id,
      created_at: c.created_at ?? "",
      webinar_id: c.webinar_id ?? "",
      webinar_title: c.webinar_id ? titleMap.get(c.webinar_id) ?? "" : "",
      user_id: c.user_id ?? "",
    }))

    downloadCSV("webinar_clicks_export.csv", rows)
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-white/10">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search webinars…"
          className="w-full md:w-80 rounded-xl bg-slate-950 border border-white/15 px-3 py-2 text-sm"
        />

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as any)}
          className="rounded-xl bg-slate-950 border border-white/15 px-3 py-2 text-sm"
        >
          <option value="date">Sort: Date</option>
          <option value="clicks">Sort: Clicks</option>
        </select>

        <button
          onClick={exportWebinarsCSV}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
        >
          Export webinars CSV
        </button>

        <button
          onClick={exportClicksCSV}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
          title="One row per click: timestamp, webinar, user"
        >
          Export clicks CSV
        </button>

        <div className="ml-auto text-xs text-white/50">
          Showing <span className="text-white/70">{filtered.length}</span> /{" "}
          <span className="text-white/70">{webinars.length}</span>
        </div>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-12 gap-3 px-5 py-3 text-xs text-white/60 border-b border-white/10">
        <div className="col-span-7">Title</div>
        <div className="col-span-3">Date</div>
        <div className="col-span-2 text-right">Clicks</div>
      </div>

      {/* Rows */}
      {filtered.length === 0 ? (
        <div className="px-5 py-8 text-white/70">No results.</div>
      ) : (
        <div className="divide-y divide-white/10">
          {filtered.map((w) => {
            const count = clickCounts[w.id] ?? 0
            return (
              <Link
                key={w.id}
                href={`/admin/webinars/${w.id}`}
                className="grid grid-cols-12 gap-3 px-5 py-4 hover:bg-white/5 transition"
              >
                <div className="col-span-7 font-medium truncate">{w.title}</div>
                <div className="col-span-3 text-sm text-white/60">
                  {w.webinar_date ? new Date(w.webinar_date).toLocaleString() : "—"}
                </div>
                <div className="col-span-2 text-right font-semibold">{count}</div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}