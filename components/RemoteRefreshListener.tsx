"use client"

import { useEffect, useRef } from "react"
import { createClient } from "@supabase/supabase-js"

type Props = {
  scopeType: "event" | "webinar"
  scopeId: string
  hardReload?: boolean
}

export default function RemoteRefreshListener({
  scopeType,
  scopeId,
  hardReload = true,
}: Props) {
  const lastSeenRef = useRef<string | null>(null)

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !anon || !scopeId) return

    const supabase = createClient(url, anon)

    const channel = supabase
      .channel(`refresh-${scopeType}-${scopeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "refresh_signals",
          filter: `scope_type=eq.${scopeType}`,
        },
        (payload) => {
          const row = payload.new as {
            scope_id?: string
            refresh_token?: string
          } | null

          if (!row) return
          if (String(row.scope_id || "") !== String(scopeId)) return

          const nextToken = String(row.refresh_token || "")
          if (!nextToken) return
          if (lastSeenRef.current === nextToken) return

          lastSeenRef.current = nextToken

          if (hardReload) {
            window.location.reload()
            return
          }

          window.location.reload()
        }
      )
      .subscribe((status) => {
        console.log("[RemoteRefreshListener] status:", status, {
          scopeType,
          scopeId,
        })
      })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [scopeId, scopeType, hardReload])

  return null
}