// app/admin/qa/page.tsx

import AdminQAManager from "./AdminQAManager"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export default function AdminQAPage() {
  return <AdminQAManager roomKey="general" />
}