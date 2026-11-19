import { notFound } from "next/navigation"
import { requireAdmin } from "@/lib/requireAdmin"
import DesktopMeetingReturn from "@/components/zoom-bridge/DesktopMeetingReturn"
export const metadata = { title: { absolute: "Jupiter IO · Shared server return" } }
export const dynamic = "force-dynamic"
export default async function ServerReturnPage() {
  if ((await requireAdmin()).profile.role !== "admin") notFound()
  return <main className="mx-auto min-h-screen max-w-[1600px] space-y-6 bg-[#07111b] p-6 text-white">
    <a href="/admin/jupiter-io/returns" className="text-sm underline">Back to meeting multiview</a>
    <h1 className="text-2xl font-semibold">Shared server Zoom return</h1>
    <DesktopMeetingReturn />
  </main>
}
