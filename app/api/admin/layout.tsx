import type { ReactNode } from "react"
import AdminSidebar from "./sidebar"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-6">
        <div className="grid gap-6 md:grid-cols-[260px_1fr]">
          <AdminSidebar />
          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  )
}