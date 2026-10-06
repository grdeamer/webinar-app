import { permanentRedirect } from "next/navigation"

export default function LegacyZoomBridgePage() {
  permanentRedirect("/admin/jupiter-io")
}
