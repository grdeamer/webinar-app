"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

function navClasses(active: boolean) {
  return [
    "rounded-xl border px-4 py-2 text-sm transition",
    active
      ? "border-sky-400/30 bg-sky-400/15 text-sky-100"
      : "border-white/10 bg-white/5 text-white hover:bg-white/10",
  ].join(" ")
}

export default function AdminHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}) {
  const pathname = usePathname()

  const navItems = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/webinars", label: "Webinars" },
    { href: "/admin/events", label: "Events" },
    { href: "/admin/import", label: "Import Registrants" },
  ]

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{title}</h1>
            {subtitle ? (
              <p className="mt-1 text-sm text-white/60">{subtitle}</p>
            ) : null}
          </div>

          <div className="flex items-center gap-2">{actions}</div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
          {navItems.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname === item.href || pathname.startsWith(`${item.href}/`)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={navClasses(active)}
              >
                {item.label}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}