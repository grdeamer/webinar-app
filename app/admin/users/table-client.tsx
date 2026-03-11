"use client"

import Link from "next/link"
import React from "react"

type UserRow = {
  id: string
  email: string | null
  created_at: string | null
}

type ClickDetailRow = {
  id: string
  user_id: string | null
  webinar_id: string | null
  created_at: string | null
  ip: string | null
  user_agent: string | null
}

function downloadCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows || rows.length === 0) {
    // Nothing to export
    return
  }

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

function fmt(n: number) {
  return new Intl.NumberFormat().format(n)
}

export default function UsersTableClient({
  users,
  assignmentCounts,
  clickCounts,
  // Optional: if you later want a "click details" export like webinars
  clickRows,
}: {
  users: UserRow[]
  assignmentCounts: Record<string, number>
  clickCounts: Record<string, number>
  clickRows?: ClickDetailRow[]
}) {
  const [search, setSearch] = React.useState("")
  const [sort, setSort] = React.useState<"created" | "assignments" | "clicks">("created")

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()

    const base = q
      ? users.filter((u) => (u.email || "").toLowerCase().includes(q))
      : users.slice()

    base.sort((a, b) => {
      if (sort === "assignments") {
        return (assignmentCounts[b.id] ?? 0) - (assignmentCounts[a.id] ?? 0)
      }
      if (sort === "clicks") {
        return (clickCounts[b.id] ?? 0) - (clickCounts[a.id] ?? 0)
      }
      const ad = a.created_at ? new Date(a.created_at).getTime() : 0
      const bd = b.created_at ? new Date(b.created_at).getTime() : 0
      return bd - ad
    })

    return base
  }, [users, assignmentCounts, clickCounts, search, sort])

  function exportUsersCSV() {
    const rows = filtered.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      created_at: u.created_at ?? "",
      assignments: assignmentCounts[u.id] ?? 0,
      clicks: clickCounts[u.id] ?? 0,
    }))
    downloadCSV("users.csv", rows)
  }

  function exportUserClickDetailsCSV() {
    if (!clickRows || clickRows.length === 0) return

    const emailById = new Map(users.map((u) => [u.id, u.email ?? ""]))
    const rows = clickRows.map((c) => ({
      click_id: c.id,
      created_at: c.created_at ?? "",
      user_id: c.user_id ?? "",
      user_email: c.user_id ? emailById.get(c.user_id) ?? "" : "",
      webinar_id: c.webinar_id ?? "",
      ip: c.ip ?? "",
      user_agent: c.user_agent ?? "",
    }))
    downloadCSV("user_click_details.csv", rows)
  }

  const totalAssignments = React.useMemo(
    () => Object.values(assignmentCounts).reduce((a, b) => a + (b || 0), 0),
    [assignmentCounts]
  )
  const totalClicks = React.useMemo(
    () => Object.values(clickCounts).reduce((a, b) => a + (b || 0), 0),
    [clickCounts]
  )

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-white/10">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users…"
          className="w-full md:w-80 rounded-xl bg-slate-950 border border-white/15 px-3 py-2 text-sm"
        />

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as any)}
          className="rounded-xl bg-slate-950 border border-white/15 px-3 py-2 text-sm"
        >
          <option value="created">Sort: Created</option>
          <option value="assignments">Sort: Assignments</option>
          <option value="clicks">Sort: Clicks</option>
        </select>

        <button
          onClick={exportUsersCSV}
          disabled={filtered.length === 0}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition disabled:opacity-50"
        >
          Export users CSV
        </button>

        {clickRows ? (
          <button
            onClick={exportUserClickDetailsCSV}
            disabled={clickRows.length === 0}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition disabled:opacity-50"
            title="One row per click: timestamp, user, webinar, ip, user agent"
          >
            Export click details CSV
          </button>
        ) : null}

        <div className="ml-auto flex items-center gap-2 text-xs text-white/60">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            Users: <span className="text-white/80">{fmt(users.length)}</span>
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            Assignments: <span className="text-white/80">{fmt(totalAssignments)}</span>
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            Clicks: <span className="text-white/80">{fmt(totalClicks)}</span>
          </span>
          <span className="text-white/40">
            Showing <span className="text-white/70">{fmt(filtered.length)}</span> /{" "}
            <span className="text-white/70">{fmt(users.length)}</span>
          </span>
        </div>
      </div>

      {/* Header */}
      <div className="grid grid-cols-12 gap-3 px-5 py-3 text-xs text-white/60 border-b border-white/10">
        <div className="col-span-5">Email</div>
        <div className="col-span-2">Assigned</div>
        <div className="col-span-2">Clicks</div>
        <div className="col-span-3">Created</div>
      </div>

      {/* Rows */}
      {filtered.length === 0 ? (
        <div className="px-5 py-8 text-white/70">No results.</div>
      ) : (
        <div className="divide-y divide-white/10">
          {filtered.map((u) => {
            const assigned = assignmentCounts[u.id] ?? 0
            const clicks = clickCounts[u.id] ?? 0

            return (
              <Link
                key={u.id}
                href={`/admin/users/${u.id}`}
                className="grid grid-cols-12 gap-3 px-5 py-4 hover:bg-white/5 transition"
              >
                <div className="col-span-5 font-medium truncate">
                  {u.email ?? "—"}
                </div>

                <div className="col-span-2">
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs">
                    {fmt(assigned)}
                  </span>
                </div>

                <div className="col-span-2 font-semibold">
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs">
                    {fmt(clicks)}
                  </span>
                </div>

                <div className="col-span-3 text-white/60 text-sm">
                  {u.created_at ? new Date(u.created_at).toLocaleString() : "—"}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}