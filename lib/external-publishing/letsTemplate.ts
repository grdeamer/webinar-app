import { readFile } from "node:fs/promises"
import path from "node:path"

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

export async function buildLetsPublishArtifacts(args: {
  eventSlug: string
  jupiterOrigin: string
}): Promise<PublishArtifact[]> {
  const templateRoot = path.join(process.cwd(), "public", "templates", "lets-live-agenda")
  const files = await Promise.all(
    TEMPLATE_FILES.map(async (name) => ({
      name,
      content: await readFile(path.join(templateRoot, name)),
    })),
  )

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

  return [...files, { name: "config.js", content: Buffer.from(config, "utf8") }]
}
