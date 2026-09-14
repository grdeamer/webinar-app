"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

function eventPageLabel(relativePath: string) {
  if (relativePath === "" || relativePath === "/") return "Overview"
  if (relativePath.startsWith("/settings")) return "Event Details"
  if (relativePath.startsWith("/attendees") || relativePath.startsWith("/import-attendees")) return "People"
  if (relativePath.includes("/producer") || relativePath.startsWith("/producer") || relativePath.startsWith("/command-center") || relativePath.startsWith("/director")) return "Producer Room"
  if (relativePath.startsWith("/sessions")) return "Program"
  if (relativePath.startsWith("/districts")) return "Districts"
  if (relativePath.startsWith("/page-editor")) return "Experience"
  if (relativePath.startsWith("/emails")) return "Communications"
  if (relativePath.startsWith("/publishing")) return "Publish"
  if (relativePath.startsWith("/infrastructure")) return "Jupiter Cloud"
  if (relativePath.startsWith("/agenda")) return "Run of Show"
  if (relativePath.startsWith("/routing")) return "Audience Flow"
  if (relativePath.startsWith("/analytics")) return "Analytics"
  if (relativePath.startsWith("/breakouts")) return "Breakouts"
  if (relativePath.startsWith("/sponsors")) return "Sponsors"
  if (relativePath.startsWith("/studio")) return "Studio"
  return "Event Overview"
}

export function getAdminPageLabel(pathname: string, eventBasePath?: string) {
  if (eventBasePath && pathname.startsWith(eventBasePath)) {
    return eventPageLabel(pathname.slice(eventBasePath.length))
  }

  if (pathname === "/admin") return "Mission Control"
  if (pathname.startsWith("/admin/page-editor")) return "Experience"
  if (pathname.startsWith("/admin/events/new")) return "New Event"
  if (pathname.startsWith("/admin/events")) return "Events"
  if (pathname.startsWith("/admin/activity")) return "Live Activity"
  if (pathname.startsWith("/admin/cloud")) return "Jupiter Cloud"
  if (pathname.startsWith("/admin/users/")) return "Team Member"
  if (pathname.startsWith("/admin/users")) return "Team & Access"
  if (pathname.startsWith("/admin/dev-tools")) return "Dev Tools"
  if (pathname.startsWith("/admin/analytics")) return "Analytics"
  if (pathname.startsWith("/admin/import")) return "Imports"
  if (pathname.startsWith("/admin/webinars")) return "Webinars"
  if (pathname.startsWith("/admin/general-session")) return "General Session"
  if (pathname.startsWith("/admin/qa")) return "Q&A"
  if (pathname.startsWith("/admin/speakers")) return "Speakers"
  if (pathname.startsWith("/admin/sponsors")) return "Sponsors"
  if (pathname.startsWith("/admin/breakouts")) return "Breakouts"
  if (pathname.startsWith("/admin/settings")) return "Settings"
  if (pathname.startsWith("/admin/health")) return "Platform Health"
  if (pathname.startsWith("/admin/changelog")) return "Changelog"
  return "Mission Control"
}

export default function AdminDocumentTitle({
  eventTitle,
  eventBasePath,
}: {
  eventTitle?: string | null
  eventBasePath?: string
}): null {
  const pathname = usePathname()

  useEffect(() => {
    const isNestedEventWorkspace = /^\/admin\/events\/[^/]+/.test(pathname) && !pathname.startsWith("/admin/events/new")
    if (!eventBasePath && isNestedEventWorkspace) return
    const page = getAdminPageLabel(pathname, eventBasePath)
    document.title = eventTitle?.trim()
      ? `${page} · ${eventTitle.trim()} — Jupiter`
      : `${page} — Jupiter`
  }, [eventBasePath, eventTitle, pathname])

  return null
}
