import Link from "next/link"
import { notFound } from "next/navigation"
import { requireAdmin } from "@/lib/requireAdmin"
import RoomMonitorConsole from "@/components/zoom-bridge/RoomMonitorConsole"
import ZoomBridgeConsole from "@/components/zoom-bridge/ZoomBridgeConsole"

export const metadata = { title: { absolute: "Jupiter Io" } }
export const dynamic = "force-dynamic"

export default async function JupiterIoPage({ searchParams }: { searchParams: Promise<{ view?: string | string[] }> }) {
  if ((await requireAdmin()).profile.role !== "admin") notFound()
  const { view } = await searchParams
  const sending = view === "send"
  const tab = "rounded-md px-3 py-2 text-sm font-medium hover:bg-white/10 focus-visible:outline focus-visible:outline-2"

  return <div className="mx-auto max-w-[1920px] px-3 pb-6 pt-3 sm:px-5">
    <nav aria-label="Jupiter IO views" className="mb-3 flex items-center gap-2 border-b border-white/10 pb-3">
      <span className="mr-2 whitespace-nowrap text-base font-semibold">Jupiter IO</span>
      <Link href="/admin/jupiter-io" aria-current={sending ? undefined : "page"}
        className={`${tab} ${sending ? "text-zinc-400" : "bg-white/10 text-white"}`}>Monitor</Link>
      <Link href="/admin/jupiter-io?view=send" aria-current={sending ? "page" : undefined}
        className={`${tab} ${sending ? "bg-white/10 text-white" : "text-zinc-400"}`}>Program send</Link>
    </nav>
    {sending ? <ZoomBridgeConsole /> : <RoomMonitorConsole />}
  </div>
}
