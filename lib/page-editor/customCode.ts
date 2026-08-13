import type { EventPageSection } from "@/lib/page-editor/sectionTypes"

export const CUSTOM_CODE_SECTION_ID = "__jupiter_custom_code__"

export type CustomCodeDocument = {
  enabled: boolean
  html: string
  css: string
}

const EMPTY_CUSTOM_CODE_DOCUMENT: CustomCodeDocument = {
  enabled: false,
  html: "",
  css: "",
}

export function getCustomCodeDocument(
  sections: EventPageSection[] | undefined,
): CustomCodeDocument {
  const section = sections?.find((item) => item.id === CUSTOM_CODE_SECTION_ID)
  if (!section) return EMPTY_CUSTOM_CODE_DOCUMENT

  return {
    enabled: section.config.customCodeMode === true,
    html:
      typeof section.config.customHtml === "string"
        ? section.config.customHtml
        : "",
    css:
      typeof section.config.customCss === "string"
        ? section.config.customCss
        : "",
  }
}

export function setCustomCodeDocument(
  sections: EventPageSection[],
  document: CustomCodeDocument,
): EventPageSection[] {
  const metadataSection: EventPageSection = {
    id: CUSTOM_CODE_SECTION_ID,
    type: "content",
    config: {
      visible: false,
      adminLabel: "Custom HTML + CSS",
      customCodeMode: document.enabled,
      customHtml: document.html,
      customCss: document.css,
    },
    blocks: [],
  }

  const existingIndex = sections.findIndex(
    (section) => section.id === CUSTOM_CODE_SECTION_ID,
  )

  if (existingIndex < 0) return [...sections, metadataSection]

  return sections.map((section, index) =>
    index === existingIndex ? metadataSection : section,
  )
}

export function getRenderableSections(
  sections: EventPageSection[] | undefined,
): EventPageSection[] | undefined {
  return sections?.filter((section) => section.id !== CUSTOM_CODE_SECTION_ID)
}

export function createCustomCodeSource(html: string, css: string): string {
  const securityPolicy = [
    "default-src 'none'",
    "script-src 'none'",
    "style-src 'unsafe-inline'",
    "img-src https: data: blob:",
    "font-src https: data:",
    "media-src https: data: blob:",
    "connect-src 'none'",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join("; ")
  const headContent = `<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${securityPolicy}"><style>${css}</style>`
  const trimmedHtml = html.trim()

  if (!trimmedHtml) {
    return `<!doctype html><html><head>${headContent}</head><body></body></html>`
  }

  if (/<html[\s>]/i.test(trimmedHtml)) {
    if (/<head[\s>]/i.test(trimmedHtml)) {
      return trimmedHtml.replace(/<head([^>]*)>/i, `<head$1>${headContent}`)
    }

    return trimmedHtml.replace(/<html([^>]*)>/i, `<html$1><head>${headContent}</head>`)
  }

  return `<!doctype html><html><head>${headContent}</head><body>${trimmedHtml}</body></html>`
}
