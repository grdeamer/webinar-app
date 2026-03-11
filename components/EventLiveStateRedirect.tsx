"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import type { EventLiveDestination, EventLiveStateRecord } from "@/lib/types"

type Payload = {
  liveState: EventLiveStateRecord | null
  destination: EventLiveDestination
}

export default function EventLiveStateRedirect({ slug }: { slug: string }): React.JSX.Element | null {
  const pathname = usePathname()
  const router = useRouter()
  const hasRedirected = useRef(false)
  const [payload, setPayload] = useState<Payload | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load(): Promise<void> {
      try {
        const res = await fetch(`/api/events/${slug}/live-state`, { cache: "no-store" })
        if (!res.ok) return
        const json = (await res.json()) as Payload
        if (!cancelled) setPayload(json)
      } catch {
        // ignore redirect helper failures
      }
    }

    void load()

    const handler = (): void => {
      void load()
    }

    window.addEventListener("admin-live-state-updated", handler)

    return () => {
      cancelled = true
      window.removeEventListener("admin-live-state-updated", handler)
    }
  }, [slug])

  const shouldRedirect = useMemo(() => {
    if (!payload?.liveState?.force_redirect) return false
    if (!payload.destination?.href) return false
    if (hasRedirected.current) return false
    if (payload.destination.href === pathname) return false
    return pathname !== payload.destination.href
  }, [payload, pathname])

  useEffect(() => {
    if (!shouldRedirect || !payload?.destination?.href) return

    hasRedirected.current = true
    const href = payload.destination.href

    if (/^https?:\/\//i.test(href)) {
      window.location.assign(href)
      return
    }

    router.replace(href)
  }, [shouldRedirect, payload, router])

  return null
}