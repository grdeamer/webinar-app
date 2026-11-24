import type { EventTheme } from "./sectionTypes"

export const eventDesignPresets = [
  { id: "daylight", name: "Daylight", background: "#f8f7f3", panel: "#ffffff", ink: "#202835", border: "#d5dce6", accent: "#2152a4", font: "Arial, sans-serif", radius: 14 },
  { id: "soft-cosmic", name: "Soft Cosmic", background: "#111526", panel: "#1d2238", ink: "#f2ecff", border: "#41405a", accent: "#b99af8", font: "Nunito Sans, system-ui, sans-serif", radius: 18 },
  { id: "modern-grid", name: "Modern Grid", background: "#edf1f6", panel: "#ffffff", ink: "#15243a", border: "#c5cfdb", accent: "#14545a", font: "system-ui, sans-serif", radius: 6 },
  { id: "after-hours", name: "After Hours", background: "#101011", panel: "#1c1b1e", ink: "#faf7fb", border: "#454149", accent: "#c8ef62", font: "Arial, sans-serif", radius: 4 },
  { id: "editorial", name: "Editorial", background: "#f8f3e9", panel: "#fffdf7", ink: "#302921", border: "#dbcab4", accent: "#71384a", font: "Georgia, serif", radius: 9 },
  { id: "warm-studio", name: "Warm Studio", background: "#f4ebdf", panel: "#fffaf0", ink: "#243331", border: "#d4c8b6", accent: "#20594f", font: "Trebuchet MS, sans-serif", radius: 21 },
] as const

export const eventDesignFonts = {
  system: { label: "System sans", family: "system-ui, sans-serif" },
  serif: { label: "Editorial serif", family: "Georgia, serif" },
  humanist: { label: "Humanist sans", family: "Trebuchet MS, sans-serif" },
  clean: { label: "Clean sans", family: "Arial, sans-serif" },
  neoGrotesk: { label: "Neo-grotesk", family: "Helvetica Neue, Arial, sans-serif" },
  geometric: { label: "Geometric sans", family: "Avenir Next, Century Gothic, sans-serif" },
  readable: { label: "Wide sans", family: "Verdana, sans-serif" },
  compact: { label: "Compact sans", family: "Tahoma, sans-serif" },
  book: { label: "Book serif", family: "Palatino, Book Antiqua, serif" },
  classic: { label: "Classic serif", family: "Times New Roman, serif" },
  mono: { label: "Modern mono", family: "ui-monospace, Menlo, Consolas, monospace" },
  typewriter: { label: "Typewriter", family: "Courier New, monospace" },
} as const

export const eventButtonStyles = ["solid", "outline", "pill"] as const
export type EventFont = keyof typeof eventDesignFonts
export type EventButtonStyle = typeof eventButtonStyles[number]

export function resolveEventFont(theme: EventTheme | null | undefined) {
  const font = theme?.pageFontStyle || theme?.fontStyle
  return font ? eventDesignFonts[font]?.family : findEventDesignPreset(theme?.presetId)?.font
}

export function safeEventLogo(value: unknown) {
  if (typeof value !== "string" || value.length > 2048) return ""
  try {
    const url = new URL(value)
    return url.protocol === "https:" && !url.username && !url.password ? url.href : ""
  } catch {
    return ""
  }
}

export const sessionLayouts = [
  { id: "featured", label: "Next Up" },
  { id: "list", label: "Editorial Agenda" },
  { id: "cards", label: "Session Gallery" },
] as const

export type SessionLayout = typeof sessionLayouts[number]["id"]

export const eventDesignTemplates = [
  { id: "facilitated-workshop", name: "Facilitated Workshop", base: "webinar", themeId: "warm-studio", sessions: "featured" },
  { id: "conference-day", name: "Conference Day", base: "conference", themeId: "modern-grid", sessions: "list" },
  { id: "product-launch", name: "Product Launch", base: "webinar", themeId: "after-hours", sessions: "cards" },
  { id: "executive-summit", name: "Executive Summit", base: "conference", themeId: "editorial", sessions: "cards" },
] as const

export function findEventDesignPreset(id: unknown) {
  return eventDesignPresets.find((preset) => preset.id === id)
}

export function findEventDesignTemplate(id: unknown) {
  return eventDesignTemplates.find((template) => template.id === id)
}

export function resolveEventDesign(eventTheme: EventTheme | null, pageTheme: EventTheme | null) {
  const preset = findEventDesignPreset(eventTheme?.presetId)
  if (!preset) return pageTheme ?? eventTheme
  const accent = eventTheme?.accentColor || preset.accent
  return {
    ...eventTheme,
    ...pageTheme,
    presetId: preset.id,
    sessionLayout: eventTheme?.sessionLayout,
    fontStyle: eventTheme?.fontStyle,
    buttonStyle: eventTheme?.buttonStyle,
    logoUrl: eventTheme?.logoUrl,
    accentColor: accent,
    pageBackgroundColor: preset.background,
    panelBackgroundColor: preset.panel,
    panelBorderColor: preset.border,
    textColor: preset.ink,
    gradientColorA: preset.background,
    gradientColorB: preset.panel,
  } satisfies EventTheme
}

export function resolveSessionLayout(value: unknown, fallback: SessionLayout = "cards"): SessionLayout {
  return sessionLayouts.find((layout) => layout.id === value)?.id ?? fallback
}
