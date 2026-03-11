import LoginForm from "./LoginForm"

export const dynamic = "force-dynamic"

export default async function LoginPage(props: {
  searchParams?: Promise<{ next?: string }>
}) {
  const sp = (await props.searchParams) ?? {}
  const next = sp.next ?? "/admin/webinars"

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-2xl font-bold">Admin Login</h1>
        <p className="mt-2 text-sm text-white/60">
          Sign in to access admin tools.
        </p>

        <div className="mt-6">
          <LoginForm next={next} />
        </div>
      </div>
    </main>
  )
}