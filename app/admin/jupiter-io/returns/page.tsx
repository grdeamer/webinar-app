import { notFound } from "next/navigation"
import { requireAdmin } from "@/lib/requireAdmin"
import ServerMeetingMonitor from "@/components/zoom-bridge/ServerMeetingMonitor"
import { serverReturnConfigured } from "@/lib/zoom-bridge/server-return"

export const metadata = { title: { absolute: "Jupiter Io · Meeting returns" } }
export const dynamic = "force-dynamic"
export default async function MeetingReturnsPage() {
  if ((await requireAdmin()).profile.role !== "admin") notFound()
  return <main className="mx-auto min-h-screen max-w-6xl space-y-6 bg-[#07111b] p-6 text-white">
    <header><a href="/admin/jupiter-io" className="text-sm text-white/60 underline">Back to Jupiter Io</a><h1 className="mt-4 text-2xl font-semibold">Jupiter Io · Meeting returns</h1><p className="mt-2 text-sm text-white/60">Server-side receiver · no sender workers</p></header>
    <ServerMeetingMonitor configured={serverReturnConfigured()} />
  </main>
}
