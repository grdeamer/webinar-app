import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import Link from "next/link"
import AdminGeneralSessionQA from "./ui"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export default async function AdminGeneralSessionQAPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get("admin_token")?.value
  if (!token) redirect("/admin/login")

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 sm:p-10">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Admin: General Session Q&amp;A</h1>
            <p className="mt-2 text-white/60">Open/close Q&amp;A, approve questions, and pin one.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/general-session"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
            >
              Back
            </Link>
            <form action="/api/admin-logout" method="POST">
              <button
                type="submit"
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
              >
                Logout
              </button>
            </form>
          </div>
        </div>

        <div className="mt-6">
          <AdminGeneralSessionQA />
        </div>
      </div>
    </main>
  )
}
