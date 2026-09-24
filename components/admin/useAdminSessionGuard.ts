"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

export function useAdminSessionGuard(pathname: string) {
  useEffect(() => {
    if (pathname === "/admin/login") return
    let stopped = false
    let pending = false
    const controller = new AbortController()
    async function check() {
      if (stopped || pending || document.visibilityState === "hidden") return
      pending = true
      try {
        const response = await fetch("/api/auth/access-status", { cache: "no-store", signal: controller.signal })
        if (!stopped && (response.status === 401 || response.status === 403)) {
          stopped = true
          // Remove the local browser session; server revocation already happened.
          void createClient().auth.signOut({ scope: "local" }).finally(() => {
            window.location.replace("/login?access=disabled")
          })
          // Do not leave a stale page open if the Auth request cannot complete.
          window.setTimeout(() => window.location.replace("/login?access=disabled"), 1500)
        }
      } catch { /* Offline/transient failures should not sign out a valid user. */ }
      finally { pending = false }
    }
    void check()
    const interval = window.setInterval((): void => { void check() }, 15_000)
    const onFocus = (): void => { void check() }
    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onFocus)
    return () => {
      stopped = true
      controller.abort()
      window.clearInterval(interval)
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onFocus)
    }
  }, [pathname])
}
