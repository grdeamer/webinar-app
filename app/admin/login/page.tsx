import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function AdminLoginPage(props: {
  searchParams?: Promise<{ next?: string }>
}) {
  const sp = (await props.searchParams) ?? {}
  const next = sp.next?.startsWith("/admin") ? sp.next : "/admin"
  redirect(`/login?next=${encodeURIComponent(next)}`)
}
