import type { EventPageSection } from "./sectionTypes"

export const HOLD_SCREEN_SECTION_ID = "__jupiter_hold_screen__"
export type HoldScreenPart = "logoUrl" | "title" | "heading" | "message" | "status"
export type HoldScreenSettings = {
  hiddenFields?: HoldScreenPart[]
  logoUrl: string
  logoAlt: string
  title: string
  heading: string
  message: string
  status: string
  backgroundColor: string
  cardColor: string
  textColor: string
  accentColor: string
}
export const DEFAULT_HOLD_SCREEN: HoldScreenSettings = {
  logoUrl: "/templates/lets-live-agenda/jnj-logo.png",
  logoAlt: "Johnson & Johnson",
  title: "",
  heading: "The event hasn’t opened yet.",
  message: "Please check back shortly. This page will open automatically when the event team begins the program.",
  status: "Waiting for the event to open",
  backgroundColor: "#e8edf1",
  cardColor: "#ffffff",
  textColor: "#11161c",
  accentColor: "#eb1700",
}

export function safeHoldLogo(value: string): string {
  return /^https:\/\/[^\s]+$/i.test(value) || /^\/(?!\/)[^\s]*$/.test(value) ? value : ""
}

export function normalizeHoldScreen(value: unknown): HoldScreenSettings {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {}
  const settings = { ...DEFAULT_HOLD_SCREEN }
  for (const key of Object.keys(DEFAULT_HOLD_SCREEN) as Exclude<keyof HoldScreenSettings, "hiddenFields">[]) {
    if (typeof input[key] !== "string") continue
    const text = input[key] as string
    settings[key] = key.endsWith("Color")
      ? /^#[0-9a-f]{6}$/i.test(text) ? text : DEFAULT_HOLD_SCREEN[key]
      : text
  }
  if (Array.isArray(input.hiddenFields)) {
    settings.hiddenFields = input.hiddenFields.filter((field): field is HoldScreenPart => typeof field === "string" && ["logoUrl", "title", "heading", "message", "status"].includes(field))
  }
  return settings
}

export function getHoldScreen(sections: EventPageSection[]): HoldScreenSettings {
  return normalizeHoldScreen(sections.find((section) => section.id === HOLD_SCREEN_SECTION_ID)?.config.holdScreen)
}

export function setHoldScreen(sections: EventPageSection[], settings: HoldScreenSettings): EventPageSection[] {
  const existing = sections.find((section) => section.id === HOLD_SCREEN_SECTION_ID)
  const metadata: EventPageSection = {
    ...existing,
    id: HOLD_SCREEN_SECTION_ID,
    type: "content",
    config: { ...existing?.config, visible: false, adminLabel: "Hold screen", holdScreen: normalizeHoldScreen(settings) },
    blocks: [],
  }
  return existing ? sections.map((section) => section.id === metadata.id ? metadata : section) : [...sections, metadata]
}

export const HOLD_SCREEN_CSS = `
.jupiter-hold{display:grid;place-items:center;min-height:620px;padding:28px;background:radial-gradient(circle at 82% 12%,color-mix(in srgb,var(--hold-accent) 13%,transparent),transparent 30rem),linear-gradient(145deg,#fbfcfd,var(--hold-bg));color:var(--hold-text);font-family:Arial,sans-serif;box-sizing:border-box}
.jupiter-hold *{box-sizing:border-box}
.jupiter-hold .hold-card{width:min(620px,100%);padding:clamp(28px,5vw,68px);border:1px solid #11161c17;border-radius:30px;background:var(--hold-card);box-shadow:0 32px 90px #10182824;text-align:center}
.jupiter-hold .hold-logo{display:block;width:min(230px,72%);height:auto;margin:0 auto 28px}
.jupiter-hold .hold-title{display:block;color:var(--hold-accent);font-size:11px;font-weight:900;letter-spacing:.16em;text-transform:uppercase}
.jupiter-hold .hold-heading{margin:12px 0;font-size:clamp(32px,5vw,52px);font-weight:800;line-height:1.04;letter-spacing:-.045em;overflow-wrap:anywhere}
.jupiter-hold .hold-message{max-width:470px;margin:0 auto;color:var(--hold-text);font-size:16px;line-height:1.7;opacity:.78;white-space:pre-wrap;overflow-wrap:anywhere}
.jupiter-hold .hold-status{display:inline-flex;align-items:center;gap:10px;margin-top:28px;padding:11px 15px;border:1px solid #11161c17;border-radius:999px;font-size:11px;font-weight:800;background:#11161c09}
.jupiter-hold .hold-dot{width:8px;height:8px;flex-shrink:0;border-radius:50%;background:var(--hold-accent)}
.jupiter-hold [data-hold-field]{cursor:pointer;outline-offset:5px}
.jupiter-hold [data-hold-field]:hover,.jupiter-hold [data-hold-field]:focus-visible,.jupiter-hold [aria-pressed=true]{outline:2px solid #8b5cf6}
`

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!)
}

export function holdScreenStyle(settings: HoldScreenSettings): Record<string, string> {
  return { "--hold-bg": settings.backgroundColor, "--hold-card": settings.cardColor, "--hold-text": settings.textColor, "--hold-accent": settings.accentColor }
}

export function applyHoldScreenToHtml(html: string, settings: HoldScreenSettings, eventTitle: string): string {
  const gate = /<section\b[^>]*\bid=["']eventGate["'][^>]*>[\s\S]*?<\/section>/i
  if (!gate.test(html)) throw new Error("This imported site has no eventGate hold screen. Add an eventGate section before publishing hold-screen changes.")
  const value = normalizeHoldScreen(settings)
  if (!value.hiddenFields?.includes("logoUrl") && value.logoUrl && !safeHoldLogo(value.logoUrl)) throw new Error("Use a valid HTTPS logo URL or remove the logo before publishing.")
  const logo = value.hiddenFields?.includes("logoUrl") ? "" : value.logoUrl === DEFAULT_HOLD_SCREEN.logoUrl ? "jnj-logo.png" : value.logoUrl
  // External sites cannot resolve root-relative assets against the Jupiter host.
  if (logo.startsWith("/")) throw new Error("Use a full HTTPS logo URL when publishing to an external site.")
  const style = Object.entries(holdScreenStyle(value)).map(([key, content]) => `${key}:${content}`).join(";")
  const gateHtml = `<section class="event-gate jupiter-hold" id="eventGate" aria-live="polite" style="${style}"><div class="hold-card">${logo ? `<img class="hold-logo" src="${escapeHtml(logo)}" alt="${escapeHtml(value.logoAlt)}">` : ""}${value.hiddenFields?.includes("title") ? "" : `<span class="hold-title"${value.title ? "" : ' id="eventGateTitle"'}>${escapeHtml(value.title || eventTitle)}</span>`}${value.hiddenFields?.includes("heading") ? "" : `<h1 class="hold-heading">${escapeHtml(value.heading)}</h1>`}${value.hiddenFields?.includes("message") ? "" : `<p class="hold-message">${escapeHtml(value.message)}</p>`}${value.status && !value.hiddenFields?.includes("status") ? `<div class="hold-status"><span class="hold-dot"></span>${escapeHtml(value.status)}</div>` : ""}</div></section>`
  return html.replace(gate, () => gateHtml).replace(/<\/head>/i, () => `<style>${HOLD_SCREEN_CSS}\n.event-gate.jupiter-hold{overflow:auto;min-height:100%}.event-gate.jupiter-hold[hidden]{display:none}</style></head>`)
}
