import PresenterDashboard from "@/components/PresenterDashboard"
import { cookies } from "next/headers"
import { isAdminFromCookie } from "@/lib/adminToken"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export default async function PresenterPage() {
  const token = (await cookies()).get("admin_token")?.value
  const isAdmin = isAdminFromCookie(token)

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-xl font-bold">Presenter Mode</h1>
          <p className="mt-2 text-sm text-white/60">
            Unauthorized. Please log in as admin.
          </p>
          <a
            href="/login"
            className="mt-4 inline-block rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black"
          >
            Go to Login
          </a>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Presenter Mode</h1>
            <p className="mt-1 text-sm text-white/60">
              General Session — featured question + next queue (realtime)
            </p>
          </div>
          <a
            href="/general-session"
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
          >
            Back to General Session
          </a>
        </div>

        <div className="mt-6">
          <PresenterDashboard />
        </div>
      </div>
    </main>
  )
}