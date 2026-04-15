"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

type StudioTool = {
  title: string
  href: string
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/")
}

export default function StudioSidebarNav({
  tools,
}: {
  tools: StudioTool[]
}) {
  const pathname = usePathname()

  return (
    <div className="mt-6 space-y-2">
      {tools.map((tool) => {
        const active = isActive(pathname, tool.href)

        return (
          <Link
            key={tool.title}
            href={tool.href}
            className={[
              "block rounded-2xl border px-4 py-3 text-sm transition",
              active
                ? "border-white/20 bg-white text-slate-950"
                : "border-white/10 bg-white/[0.03] text-white/80 hover:border-white/20 hover:bg-white/[0.06] hover:text-white",
            ].join(" ")}
          >
            {tool.title}
          </Link>
        )
      })}
    </div>
  )
}