"use client"

import { useRouter } from "next/navigation"
import {
  BarChart08,
  Image03,
  List,
  Mail02,
  Users01,
  VideoRecorder,
} from "@untitledui/icons"

import JupiterLogo from "@/components/brand/JupiterLogo"
import { useJupiterNotice } from "@/components/ui/JupiterNotificationProvider"

type ProducerNavigationRailProps = {
  eventId: string
  isLive: boolean
}

const ITEMS = [
  { label: "Room", path: "producer/room", icon: VideoRecorder },
  { label: "Rundown", path: "agenda", icon: List },
  { label: "Talent", path: "attendees", icon: Users01 },
  { label: "Media", path: "sponsors", icon: Image03 },
  { label: "Messages", path: "emails", icon: Mail02 },
  { label: "Reports", path: "analytics", icon: BarChart08 },
] as const

export default function ProducerNavigationRail({
  eventId,
  isLive,
}: ProducerNavigationRailProps) {
  const router = useRouter()
  const { confirm: confirmNotice } = useJupiterNotice()
  const base = `/admin/events/${eventId}`

  function navigate(destination: string): void {
    void (async () => {
      if (isLive) {
        const confirmed = await confirmNotice({ title: "Leave the live Producer Room?", message: "The broadcast will continue running while you navigate away.", confirmLabel: "Leave room", tone: "warning" })
        if (!confirmed) return
      }
      router.push(destination)
    })()
  }

  return (
    <aside className="relative z-[120] hidden w-[72px] shrink-0 flex-col border-r border-white/[0.08] bg-[#040710] lg:flex xl:w-[82px]">
      <button
        type="button"
        onClick={() => navigate(base)}
        title="Back to event"
        className="flex h-[68px] items-center justify-center border-b border-white/[0.07] text-white/80 transition hover:bg-white/[0.035] hover:text-white"
      >
        <JupiterLogo showWordmark={false} markClassName="h-8 w-8" />
        <span className="sr-only">Back to event</span>
      </button>

      <nav aria-label="Producer Room navigation" className="flex min-h-0 flex-1 flex-col gap-1.5 px-2 py-3">
        {ITEMS.map((item) => {
          const Icon = item.icon
          const active = item.path === "producer/room"

          return (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(`${base}/${item.path}`)}
              aria-current={active ? "page" : undefined}
              title={item.label}
              className={`group relative flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-[10px] border px-1.5 py-2 text-[9px] font-semibold transition ${
                active
                  ? "border-sky-300/25 bg-[#0b1930] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                  : "border-transparent text-white/40 hover:border-white/[0.07] hover:bg-white/[0.035] hover:text-white/72"
              }`}
            >
              {active ? (
                <span className="absolute inset-y-2 left-0 w-[2px] rounded-full bg-sky-300" />
              ) : null}
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
              <span className="max-w-full truncate">{item.label}</span>
            </button>
          )
        })}
      </nav>

      <button
        type="button"
        onClick={() => navigate(base)}
        className="mx-2 mb-3 flex min-h-[48px] flex-col items-center justify-center rounded-[10px] border border-white/[0.08] bg-white/[0.025] px-1 text-[9px] font-semibold text-white/52 transition hover:border-white/[0.14] hover:bg-white/[0.05] hover:text-white"
      >
        <span aria-hidden="true" className="text-sm leading-none">←</span>
        Event
      </button>
    </aside>
  )
}
