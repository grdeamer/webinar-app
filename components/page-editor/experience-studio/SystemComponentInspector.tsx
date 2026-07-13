

"use client"

import type { ReactNode } from "react"

type Props = {
  componentKey: string
  title?: string
  body?: string
  children?: ReactNode
}

function formatComponentName(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export default function SystemComponentInspector({
  componentKey,
  title,
  body,
  children,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
        <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">
          System Component
        </div>

        <div className="mt-2 text-sm font-semibold text-white/72">
          {formatComponentName(componentKey)}
        </div>

        {title ? (
          <div className="mt-1 text-xs leading-5 text-white/42">{title}</div>
        ) : null}

        {body ? (
          <div className="mt-2 text-xs leading-5 text-white/32">{body}</div>
        ) : null}
      </div>

      {children}
    </div>
  )
}