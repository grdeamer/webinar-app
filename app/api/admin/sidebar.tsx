"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

type Item = { label: string; href: string; desc?: string }

const sections: Array<{ title: string; items: Item[] }> = [
  {
    title: "Core",
    items: [
      { label: "Dashboard", href: "/admin", desc: "Overview + quick actions" },
      { label: "Webinars", href: "/admin/webinars", desc: "List + detail views" },
      { label: "Users", href: "/admin/users", desc: "Accounts + access" },
      { label: "Events", href: "/admin/events", desc: "Lobby + agenda + breakouts" },
    ],
  },
  {
    title: "General Session",
    items: [
      { label: "Player & Publish", href: "/admin/general-session", desc: "MP4 / M3U8 / RTMP + publish" },
      { label: "Q&A Moderation", href: "/admin/general-session/qa", desc: "Queue + featured overlay" },
    ],
  },
  {
    title: "Ops",
    items: [
      { label: "Analytics", href: "/admin/analytics", desc: "Clicks + engagement" },
      { label: "Change Log", href: "/admin/changelog", desc: "Audit trail" },
      { label: "Health", href: "/admin/health", desc: "Diagnostics" },
      { label: "Settings", href: "/admin/settings", desc: "Admin preferences" },
    ],
  },
]

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin"
  return pathname === href || pathname.startsWith(href + "/")
}

export default function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="sticky top-6 h-fit rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-white/40">Admin</div>
          <div className="text-lg font-semibold leading-tight">Control Center</div>
        </div>

        <Link
          href="/"
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10"
        >
          Exit
        </Link>
      </div>

      <nav className="mt-4 space-y-5">
        {sections.map((section) => (
          <div key={section.title}>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">
              {section.title}
            </div>

            <div className="space-y-1">
              {section.items.map((item) => {
                const active = isActive(pathname, item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      "block rounded-xl px-3 py-2 transition",
                      active
                        ? "border border-emerald-400/25 bg-emerald-500/10"
                        : "border border-transparent hover:bg-white/10",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium">{item.label}</div>
                      {active ? (
                        <span className="text-[10px] text-emerald-200">ACTIVE</span>
                      ) : null}
                    </div>
                    {item.desc ? (
                      <div className="mt-0.5 text-xs text-white/50">{item.desc}</div>
                    ) : null}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white/60">
        Zoom-style upgrades:
        <ul className="mt-2 list-disc pl-4 space-y-1">
          <li>Draft / Published / Scheduled states</li>
          <li>Presenter link + attendee link + one-click copy</li>
          <li>Audit log for every admin change</li>
        </ul>
      </div>
    </aside>
  )
}