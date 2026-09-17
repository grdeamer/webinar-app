import { redirect } from "next/navigation"

export default function LegacyAdminEventPage() {
  redirect("/admin/events")
}
