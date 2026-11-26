import Link from "next/link"
import { notFound } from "next/navigation"
import { requireAdmin } from "@/lib/requireAdmin"
import { canStartProducerEngine } from "@/lib/producer/engineOwner"
import RoomMonitorConsole from "@/components/zoom-bridge/RoomMonitorConsole"
import IoAppearanceSwitch from "@/components/zoom-bridge/IoAppearanceSwitch"
import ZoomBridgeConsole from "@/components/zoom-bridge/ZoomBridgeConsole"

export const metadata = { title: { absolute: "Jupiter Io" } }
export const dynamic = "force-dynamic"

export default async function JupiterIoPage({ searchParams }: { searchParams: Promise<{ view?: string | string[] }> }) {
  const access = await requireAdmin()
  if (access.profile.role !== "admin") notFound()
  const { view } = await searchParams
  const sending = view === "send"

  return <div className="io-monitor-shell mx-auto max-w-[1920px] rounded-xl px-3 pb-6 pt-3 sm:px-5">
    <nav aria-label="Jupiter IO views" className="io-rule mb-3 flex flex-wrap items-center gap-2 border-b pb-3">
      <span className="mr-2 whitespace-nowrap text-base font-semibold">Jupiter IO</span>
      <Link href="/admin/jupiter-io" aria-current={sending ? undefined : "page"}
        className="io-view-tab">Monitor</Link>
      <Link href="/admin/jupiter-io?view=send" aria-current={sending ? "page" : undefined}
        className="io-view-tab">Program send</Link>
      <IoAppearanceSwitch />
    </nav>
    {sending ? <ZoomBridgeConsole /> : <RoomMonitorConsole canStartSharedServer={canStartProducerEngine(access.user, true)} />}
  </div>
}
