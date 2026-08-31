import type { CSSProperties } from "react"

export const PRODUCER_EVENT_ACCENTS = {
  blue: { primary: "59,130,246", secondary: "34,211,238" },
  violet: { primary: "139,92,246", secondary: "99,102,241" },
  cyan: { primary: "6,182,212", secondary: "59,130,246" },
  orange: { primary: "249,115,22", secondary: "245,158,11" },
  emerald: { primary: "16,185,129", secondary: "6,182,212" },
  rose: { primary: "244,63,94", secondary: "139,92,246" },
} as const

export type ProducerEventAccent = keyof typeof PRODUCER_EVENT_ACCENTS

export function normalizeProducerEventAccent(value?: string | null): ProducerEventAccent {
  return value && value in PRODUCER_EVENT_ACCENTS
    ? (value as ProducerEventAccent)
    : "blue"
}

export function getProducerThemeStyle(accent?: string | null): CSSProperties {
  const palette = PRODUCER_EVENT_ACCENTS[normalizeProducerEventAccent(accent)]
  return {
    "--producer-brand-primary": palette.primary,
    "--producer-brand-secondary": palette.secondary,
  } as CSSProperties
}
