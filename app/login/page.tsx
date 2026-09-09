import LoginForm from "./LoginForm"
import JupiterLogo from "@/components/brand/JupiterLogo"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function LoginPage(props: {
  searchParams?: Promise<{ next?: string }>
}) {
  const sp = (await props.searchParams) ?? {}
  const next = sp.next?.startsWith("/admin") ? sp.next : "/admin"

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#030817] p-6 text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(88,91,255,.18),transparent_34%),radial-gradient(circle_at_20%_85%,rgba(22,147,255,.12),transparent_30%)]" />
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#080e1d]/90 p-7 shadow-[0_28px_90px_rgba(0,0,0,.45)] backdrop-blur-xl">
        <JupiterLogo className="mb-6 text-white" />
        <h1 className="text-2xl font-bold">Sign in to Jupiter</h1>
        <p className="mt-2 text-sm text-white/60">
          Continue to Mission Control and your event workspaces.
        </p>

        <div className="mt-6">
          <LoginForm next={next} />
        </div>
        <div className="mt-6 border-t border-white/10 pt-5 text-center text-sm text-white/45">
          Looking for Jupiter?{" "}
          <Link href="https://jupiter.events" className="text-blue-300 transition hover:text-blue-200">
            Visit the public site
          </Link>
        </div>
      </div>
    </main>
  )
}
