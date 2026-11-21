"use client"

import Link from "next/link"
import { Nunito_Sans } from "next/font/google"
import { ArrowUpRight } from "lucide-react"
import type { ReactNode } from "react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  canOpenWorkspaceDestination,
  eventWorkspaceSections,
  resolveWorkspaceSection,
  type WorkspaceNavigationAccess,
} from "@/lib/event-workspace-navigation"
import EventAccessActions from "./EventAccessActions"
import styles from "./event-workspace-navigation.module.css"

const nunitoSans = Nunito_Sans({ subsets: ["latin"], variable: "--font-event-navigation", display: "swap" })
const publishing = { route: "publishing", feature: "publishing" } as const

export function EventWorkspaceNavigation({ base, access, route, children }: {
  base: string
  access: WorkspaceNavigationAccess | null
  route: string
  children: ReactNode
}) {
  const selected = resolveWorkspaceSection(route)
  const sections = eventWorkspaceSections.flatMap((section) => {
    if (section.id === "overview") return [{ ...section, href: base }]
    const first = section.destinations.find((destination) => canOpenWorkspaceDestination(access, destination))
    return first ? [{ ...section, href: `${base}/${first.route}` }] : []
  })

  return (
    <div className={`${styles.panel} ${nunitoSans.variable}`}>
      <div className={styles.identity}>
        {children}
        {canOpenWorkspaceDestination(access, publishing) ? (
          <Link href={`${base}/publishing`} className={styles.publish} aria-current={selected ? undefined : "page"}>
            Review &amp; publish <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        ) : null}
      </div>
      <TooltipProvider delayDuration={350} skipDelayDuration={0}>
        <nav className={styles.primary} aria-label="Event workspace">
          {sections.map((section) => (
            <Tooltip key={section.id}>
              <TooltipTrigger asChild>
                <Link
                  href={section.href}
                  className={styles.tab}
                  aria-current={selected?.section.id === section.id ? (route === "" ? "page" : "location") : undefined}
                >
                  {section.label}
                </Link>
              </TooltipTrigger>
              <TooltipContent side="bottom" className={`${styles.tooltip} ${nunitoSans.variable}`}>{section.description}</TooltipContent>
            </Tooltip>
          ))}
        </nav>
      </TooltipProvider>
      <details className={styles.touchHelp}>
        <summary>Section descriptions</summary>
        <dl>
          {sections.map(({ id, label, description }) => <div key={id}><dt>{label}</dt><dd>{description}</dd></div>)}
        </dl>
      </details>
    </div>
  )
}

export function EventWorkspaceSection({ base, route, access, eventId, eventTitle }: {
  base: string
  route: string
  access: WorkspaceNavigationAccess | null
  eventId: string
  eventTitle: string
}) {
  const selected = resolveWorkspaceSection(route)
  const destinations = selected?.section.destinations.filter((destination) => canOpenWorkspaceDestination(access, destination)) ?? []
  const canInvite = selected?.section.id === "people" && (access?.isGlobalAdmin || access?.teamRole === "event_admin")

  return (
    <section className={`${styles.section} ${nunitoSans.variable}`} aria-labelledby="event-section-title">
      <h2 id="event-section-title">{selected?.section.label ?? "Review & publish"}</h2>
      <p>{selected?.section.description ?? "Review publishing destinations and publish when you’re ready."}</p>
      {destinations.length > 0 || canInvite ? (
        <nav className={styles.secondary} aria-label={`${selected?.section.label} tools`}>
          {destinations.map((destination) => (
            <Link
              key={destination.route}
              href={`${base}/${destination.route}`}
              className={styles.secondaryLink}
              aria-current={selected?.selected === destination.route ? (route === destination.route ? "page" : "location") : undefined}
            >
              {destination.label}
            </Link>
          ))}
          {canInvite ? <EventAccessActions eventId={eventId} eventTitle={eventTitle} triggerClassName={styles.secondaryLink} /> : null}
        </nav>
      ) : null}
    </section>
  )
}
