import { readFile } from "node:fs/promises"
import path from "node:path"
import { loadEventPageDocument } from "@/lib/page-editor/loadEventPageDocument"
import { getCustomCodeDocument } from "@/lib/page-editor/customCode"
import type { EventPageSection } from "@/lib/page-editor/sectionTypes"

export type PublishArtifact = {
  name: string
  content: Buffer
}

const TEMPLATE_FILES = [
  "index.html",
  "styles.css",
  "app.js",
  "jnj-logo.png",
  "favicon.png",
] as const

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function replaceTitle(html: string, replacement: string): string {
  return html.replace(/(<title>)[\s\S]*?(<\/title>)/i, `$1${replacement}$2`)
}

function replaceBetweenTags(html: string, tagName: string, id: string, replacement: string): string {
  const pattern = new RegExp(
    `(<${tagName}\\b[^>]*\\bid=["']${id}["'][^>]*>)[\\s\\S]*?(</${tagName}>)`,
    "i",
  )
  return html.replace(pattern, `$1${replacement}$2`)
}

function replaceMetaContent(html: string, name: string, replacement: string): string {
  const pattern = new RegExp(
    `(<meta\\b[^>]*\\bname=["']${name}["']\\b[^>]*\\bcontent=["'])[^"']*(")`,
    "i",
  )
  return html.replace(pattern, `$1${replacement}$2`)
}

function buildPublishHead(title: string): string {
  return [
    `<meta charset="utf-8" />`,
    `<meta name="viewport" content="width=device-width, initial-scale=1" />`,
    `<title>${escapeHtml(title)}</title>`,
    `<link rel="stylesheet" href="styles.css" />`,
    `<script src="config.js"></script>`,
    `<script src="app.js" defer></script>`,
  ].join("\n  ")
}

function wrapCustomHtmlForPublish(html: string, css: string, title: string): { indexHtml: string; stylesCss: string } {
  const trimmed = html.trim()
  const headContent = buildPublishHead(title)

  if (/<html[\s>]/i.test(trimmed)) {
    if (/<head[\s>]/i.test(trimmed)) {
      return {
        indexHtml: trimmed.replace(/<head([^>]*)>/i, `<head$1>\n  ${headContent}\n`),
        stylesCss: css,
      }
    }
    return {
      indexHtml: trimmed.replace(/<html([^>]*)>/i, `<html$1>\n<head>\n  ${headContent}\n</head>`),
      stylesCss: css,
    }
  }

  return {
    indexHtml: `<!doctype html>\n<html lang="en">\n<head>\n  ${headContent}\n</head>\n<body>\n${trimmed}\n</body>\n</html>`,
    stylesCss: css,
  }
}

export async function buildLetsPublishArtifacts(args: {
  eventSlug: string
  jupiterOrigin: string
  eventId?: string
}): Promise<PublishArtifact[]> {
  const templateRoot = path.join(process.cwd(), "public", "templates", "lets-live-agenda")
  const fileEntries = await Promise.all(
    TEMPLATE_FILES.map(async (name) => ({
      name,
      content: await readFile(path.join(templateRoot, name)),
    })),
  )

  let indexHtml = fileEntries.find((entry) => entry.name === "index.html")?.content.toString("utf8") ?? ""
  let stylesCss = fileEntries.find((entry) => entry.name === "styles.css")?.content.toString("utf8") ?? ""

  if (args.eventId) {
    const pageDoc = await loadEventPageDocument(args.eventId, "event_home")
    const sections = Array.isArray(pageDoc.sections)
      ? (pageDoc.sections as EventPageSection[])
      : []
    const customCode = getCustomCodeDocument(sections)
    const hero = sections.find((section) => section.type === "hero" || section.id === "hero")
    const title = typeof hero?.config?.title === "string" ? hero.config.title.trim() : ""
    const body = typeof hero?.config?.body === "string" ? hero.config.body.trim() : ""

    if (customCode.enabled && customCode.html.trim()) {
      const wrapped = wrapCustomHtmlForPublish(customCode.html, customCode.css, title || "Event")
      indexHtml = wrapped.indexHtml
      stylesCss = wrapped.stylesCss
    } else {
      if (title) {
        const escapedTitle = escapeHtml(title)
        indexHtml = replaceTitle(indexHtml, escapedTitle)
        indexHtml = replaceBetweenTags(indexHtml, "h1", "eventTitle", escapedTitle)
        indexHtml = replaceBetweenTags(indexHtml, "span", "eventGateTitle", escapedTitle)
      }

      if (body) {
        const escapedBodyForMeta = escapeHtml(body.replace(/\n+/g, " "))
        const escapedBodyForHtml = escapeHtml(body).replace(/\n/g, "<br>")
        indexHtml = replaceMetaContent(indexHtml, "description", escapedBodyForMeta)
        indexHtml = replaceBetweenTags(indexHtml, "p", "eventDescription", escapedBodyForHtml)
      }
    }

    const indexPosition = fileEntries.findIndex((entry) => entry.name === "index.html")
    if (indexPosition !== -1) {
      fileEntries[indexPosition] = { name: "index.html", content: Buffer.from(indexHtml, "utf8") }
    }

    const stylesPosition = fileEntries.findIndex((entry) => entry.name === "styles.css")
    if (stylesPosition !== -1) {
      fileEntries[stylesPosition] = { name: "styles.css", content: Buffer.from(stylesCss, "utf8") }
    }
  }

  const origin = args.jupiterOrigin.replace(/\/$/, "")
  const config = `window.POA_CONFIG = ${JSON.stringify(
    {
      STATE_ENDPOINT: `${origin}/api/public/events/${args.eventSlug}/runtime`,
      EVENT_SLUG: args.eventSlug,
      POLL_INTERVAL_MS: 10000,
      TIME_ZONE: "America/New_York",
      SPEAKER_PROFILES: {},
      FALLBACK_STATE: {
        active_session: null,
        button_text: "Enter live meeting",
        button_url: "#",
        status: "closed",
      },
    },
    null,
    2,
  )};\n`

  return [...fileEntries, { name: "config.js", content: Buffer.from(config, "utf8") }]
}
