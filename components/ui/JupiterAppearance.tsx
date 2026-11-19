"use client"

import { usePathname } from "next/navigation"
import { useSyncExternalStore, type ReactNode } from "react"

const KEY = "jupiter-admin-appearance"
const CHANGE_EVENT = "jupiter-admin-appearance-changed"

type Appearance = "light" | "dark"

function subscribe(notify: () => void) {
  window.addEventListener("storage", notify)
  window.addEventListener(CHANGE_EVENT, notify)
  return () => {
    window.removeEventListener("storage", notify)
    window.removeEventListener(CHANGE_EVENT, notify)
  }
}

function readAppearance(): Appearance {
  const saved = window.localStorage.getItem(KEY)
  return saved === "light" ? "light" : "dark"
}

export function useJupiterAppearance() {
  return useSyncExternalStore(subscribe, readAppearance, () => "dark" as const)
}

export function usesDefaultAppearance(pathname: string) {
  return /(?:^|\/)page-editor(?:\/|$)/.test(pathname)
    || /^\/admin\/events\/[^/]+\/(?:producer|studio|sessions\/[^/]+\/producer)(?:\/|$)/.test(pathname)
    || /^\/dev\/(?:producer-|page-builder)/.test(pathname)
    || /^\/program-output(?:\/|$)/.test(pathname)
}

export function JupiterAppearanceBoundary({ children }: { children: ReactNode }) {
  const appearance = useJupiterAppearance()
  const pathname = usePathname()
  const isDefault = usesDefaultAppearance(pathname)
  return (
    <div className="jupiter-site-appearance" data-site-appearance={isDefault ? "original" : appearance}>
      {children}
    </div>
  )
}

export function JupiterAppearanceSwitch({ appearance }: { appearance: Appearance }) {
  return (
    <fieldset className="admin-theme-switch mb-3 grid grid-cols-2 gap-1 rounded-lg border border-white/10 bg-black/15 p-1">
      <legend className="sr-only">Appearance</legend>
      {(["light", "dark"] as const).map(option => (
        <button
          key={option}
          type="button"
          onClick={() => {
            window.localStorage.setItem(KEY, option)
            window.dispatchEvent(new Event(CHANGE_EVENT))
          }}
          aria-pressed={appearance === option}
          className="h-9 rounded-md px-1 text-xs font-semibold capitalize transition"
        >
          {option}
        </button>
      ))}
    </fieldset>
  )
}
