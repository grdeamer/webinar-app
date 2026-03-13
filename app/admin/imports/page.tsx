import Link from "next/link"
import { supabaseAdmin } from "@/lib/supabase/admin"
import AdminHeader from "@/components/admin/AdminHeader"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type ImportJobRow = {
  id: string
  kind: string | null
  status: string | null
  file_name: string | null
  event_id: string | null
  total_rows: number | null
  processed_rows: number | null
  progress_pct: number | null
  registrants_created: number | null
  registrants_updated: number | null
  assignments_written: number | null
  sessions_auto_created: number | null
  error_message: string | null
  created_at: string | null
  updated_at: string | null
  finished_at: string | null
}

function statusClasses(status: string | null) {
  if (status === "success") return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20"
  if (status === "error") return "bg-red-500/15 text-red-300 border border-red-500/20"
  if (status === "running") return "bg-sky-500/15 text-sky-300 border border-sky-500/20"
  if (status === "queued") return "bg-amber-500/15 text-amber-300 border border-amber-500/20"
  return "bg-white/10 text-white/70 border border-white/10"
}

export default async function AdminImportsPage() {
  const { data, error } = await supabaseAdmin
    .from("import_jobs")
    .select(`
      id,
      kind,
      status,
      file_name,
      event_id,
      total_rows,
      processed_rows,
      progress_pct,
      registrants_created,
      registrants_updated,
      assignments_written,
      sessions_auto_created,
      error_message,
      created_at,
      updated_at,
      finished_at
    `)
    .order("created_at", { ascending: false })
    .limit(100)

  if (error) {
    throw new Error(error.message)
  }

  const rows = (data || []) as ImportJobRow[]

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Import History"
        subtitle="Track registrant imports, progress, and outcomes across your events."
      />

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-white/50">
              <tr>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Kind</th>
                <th className="px-3 py-3">File</th>
                <th className="px-3 py-3">Progress</th>
                <th className="px-3 py-3">Rows</th>
                <th className="px-3 py-3">Created</th>
                <th className="px-3 py-3">Updated</th>
                <th className="px-3 py-3">Assignments</th>
                <th className="px-3 py-3">Auto Sessions</th>
                <th className="px-3 py-3">Created At</th>
                <th className="px-3 py-3">Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-white/10 align-top">
                  <td className="px-3 py-3">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(row.status)}`}>
                      {row.status || "unknown"}
                    </span>
                    {row.error_message ? (
                      <div className="mt-2 max-w-xs text-xs text-red-200">
                        {row.error_message}
                      </div>
                    ) : null}
                  </td>

                  <td className="px-3 py-3">{row.kind || "—"}</td>
                  <td className="px-3 py-3">{row.file_name || "—"}</td>

                  <td className="px-3 py-3 min-w-[180px]">
                    <div className="text-xs text-white/60">
                      {(row.progress_pct ?? 0)}%
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className={[
                          "h-full rounded-full",
                          row.status === "success" ? "bg-emerald-500" : "",
                          row.status === "error" ? "bg-red-500" : "",
                          row.status === "running" || row.status === "queued" ? "bg-sky-500" : "",
                          !row.status ? "bg-white/30" : "",
                        ].join(" ")}
                        style={{ width: `${row.progress_pct ?? 0}%` }}
                      />
                    </div>
                    <div className="mt-2 text-xs text-white/45">
                      {(row.processed_rows ?? 0).toLocaleString()} / {(row.total_rows ?? 0).toLocaleString()}
                    </div>
                  </td>

                  <td className="px-3 py-3">{row.total_rows ?? 0}</td>
                  <td className="px-3 py-3">{row.registrants_created ?? 0}</td>
                  <td className="px-3 py-3">{row.registrants_updated ?? 0}</td>
                  <td className="px-3 py-3">{row.assignments_written ?? 0}</td>
                  <td className="px-3 py-3">{row.sessions_auto_created ?? 0}</td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {row.created_at ? new Date(row.created_at).toLocaleString() : "—"}
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      href={`/api/admin/import-jobs/${row.id}/download`}
                      className="text-sm text-sky-300 hover:text-sky-200"
                    >
                      Download log
                    </Link>
                  </td>
                </tr>
              ))}

              {!rows.length ? (
                <tr>
                  <td colSpan={11} className="px-3 py-8 text-center text-white/45">
                    No imports yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}