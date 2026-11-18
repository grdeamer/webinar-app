import { notFound } from "next/navigation"
import { requireAdmin } from "@/lib/requireAdmin"
import MeetingMultiview from "@/components/zoom-bridge/MeetingMultiview"

export const metadata = { title: { absolute: "Jupiter Io · Meeting multiview" } }
export const dynamic = "force-dynamic"
export default async function MeetingReturnsPage() {
  if ((await requireAdmin()).profile.role !== "admin") notFound()
  return <main className="mx-auto min-h-screen max-w-[1800px] space-y-6 bg-[#07111b] p-6 text-white">
    <header><a href="/admin/jupiter-io" className="text-sm text-white/60 underline">Back to Jupiter Io</a><h1 className="mt-4 text-2xl font-semibold">Jupiter Io · Meeting multiview</h1><p className="mt-2 text-sm text-white/60">Shared presentations and participants · 4, 9 or 16 meetings per page</p></header>
    <MeetingMultiview />
  </main>
}
