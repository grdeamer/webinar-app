import Link from "next/link"
import { supabaseAdmin } from "@/lib/supabase/admin"
import UsersTableClient from "./table-client"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type UserRow = {
  id: string
  email: string
  created_at: string | null
}

export default async function AdminUsersPage() {
  const { data: users, error: usersError } = await supabaseAdmin
    .from("users")
    .select("id,email,created_at")
    .order("created_at", { ascending: false })

  if (usersError) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Users</h1>
            <p className="mt-1 text-sm text-white/60">Assignments + click history</p>
          </div>
          <Link
            href="/admin"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
          >
            Dashboard
          </Link>
        </div>

        <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-6 text-rose-200">
          Error loading users: {usersError.message}
        </div>
      </div>
    )
  }

  const safeUsers = (users ?? []) as UserRow[]

  const { data: assignments } = await supabaseAdmin
    .from("user_webinars")
    .select("user_id")

  const assignmentCount = new Map<string, number>()
  assignments?.forEach((a: any) => {
    if (!a.user_id) return
    assignmentCount.set(a.user_id, (assignmentCount.get(a.user_id) ?? 0) + 1)
  })

  const { data: clicks } = await supabaseAdmin
    .from("webinar_clicks")
    .select("user_id")

  const clickCount = new Map<string, number>()
  clicks?.forEach((c: any) => {
    if (!c.user_id) return
    clickCount.set(c.user_id, (clickCount.get(c.user_id) ?? 0) + 1)
  })

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Users</h1>
            <p className="mt-1 text-sm text-white/60">
              Search, sort, export. Click a user for details.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/webinars"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
            >
              Webinars
            </Link>
            <Link
              href="/admin"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
            >
              Dashboard
            </Link>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/60">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            Total users: <span className="text-white/80">{safeUsers.length}</span>
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            Total assignments:{" "}
            <span className="text-white/80">
              {Array.from(assignmentCount.values()).reduce((a, b) => a + b, 0)}
            </span>
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            Total clicks:{" "}
            <span className="text-white/80">
              {Array.from(clickCount.values()).reduce((a, b) => a + b, 0)}
            </span>
          </span>
        </div>
      </div>

      <UsersTableClient
        users={safeUsers}
        assignmentCounts={Object.fromEntries(assignmentCount.entries())}
        clickCounts={Object.fromEntries(clickCount.entries())}
      />
    </div>
  )
}