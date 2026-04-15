"use client"

import Link from "next/link"
import { useParams, usePathname } from "next/navigation"
import { ReactNode } from "react"

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/")
}

function Tab({
  href,
  children,
}: {
  href: string
  children: ReactNode
}) {
  const pathname = usePathname()
  const active = isActive(pathname, href)

  return (
    <Link
      href={href}
      className={[
        "px-4 py-2 rounded-xl text-sm transition",
        active
          ? "bg-white text-slate-900"
          : "text-white/70 hover:text-white hover:bg-white/10",
      ].join(" ")}
    >
      {children}
    </Link>
  )
}

export default function EventLayout({
  children,
}: {
  children: ReactNode
}) {
  const params = useParams()
  const id = String(params.id)

  const base = `/admin/events/${id}`

  return (
    <div className="space-y-6">
      {/* Top Event Nav */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
        <Tab href={base}>Overview</Tab>
        <Tab href={`${base}/sessions`}>Sessions</Tab>
        <Tab href={`${base}/attendees`}>Attendees</Tab>
        <Tab href={`${base}/studio`}>Studio</Tab>
        <Tab href={`${base}/producer`}>Broadcast</Tab>
        <Tab href={`${base}/page-editor`}>Page Builder</Tab>
        <Tab href={`${base}/sponsors`}>Sponsors</Tab>
        <Tab href={`${base}/speakers`}>Speakers</Tab>
      </div>

      {/* Page Content */}
      <div>{children}</div>
    </div>
  )
}