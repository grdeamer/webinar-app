export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export default function AdminSettingsPage() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="mt-2 text-sm text-white/60">
        Admin preferences (roles, passwords, defaults, safety rails).
      </p>
    </div>
  )
}