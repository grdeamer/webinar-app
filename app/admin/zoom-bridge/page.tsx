import { notFound } from "next/navigation"
import { requireAdmin } from "@/lib/requireAdmin"
import ZoomBridgeConsole from "@/components/zoom-bridge/ZoomBridgeConsole"
export const dynamic = "force-dynamic"
export default async function ZoomBridgePage() {
  if ((await requireAdmin()).profile.role !== "admin") notFound()
  return <ZoomBridgeConsole />
}
