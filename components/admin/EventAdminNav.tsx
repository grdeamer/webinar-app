"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

type Props = {
  eventId: string
  eventSlug?: string // optional for page editor compatibility
}

type NavItem = {
  label: string
  href: string
}

function itemClasses(active: boolean) {
  return active
    ? "rounded-xl bg-white text-slate-950 px-4 py-2 text-sm font-medium"
    : "rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition"
}

export default function EventAdminNav({ eventId, eventSlug }: Props) {
  const pathname = usePathname()

  const items: NavItem[] = [
    { label: "Routing", href: `/admin/events/${eventId}/routing` },
    { label: "Sessions", href: `/admin/events/${eventId}/sessions` },
    { label: "Attendees", href: `/admin/events/${eventId}/attendees` },

    // renamed from "Stage" → "Producer" (matches your UI + intent)
  { label: "Producer", href: `/admin/events/${eventId}/producer/room` },

    // safe fallback: use slug if available, otherwise id
    {
      label: "Pages",
      href: `/admin/page-editor/event/${eventSlug ?? eventId}`,
    },
  ]

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={itemClasses(active)}
            >
              {item.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}