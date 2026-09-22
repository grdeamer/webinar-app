import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import path from "node:path"
import test from "node:test"
import JSZip from "jszip"
import { extractPublishArchive, normalizeArchivePath } from "../lib/external-publishing/archive.ts"
import { decryptPublishingSecret, encryptPublishingSecret } from "../lib/external-publishing/credentials.ts"
import { readTemplateArtifacts } from "../lib/external-publishing/templateFiles.ts"
import { versionManagedAssetReferences } from "../lib/external-publishing/assetVersions.ts"

test("the canonical LETS template publishes every managed asset", async () => {
  const root = path.join(process.cwd(), "public", "templates", "lets-live-agenda")
  const artifacts = await readTemplateArtifacts(root)
  const names = artifacts.map((artifact) => artifact.name)

  for (const required of [
    "index.html",
    "styles.css",
    "app.js",
    "jnj-logo.png",
    "zoom-wordmark.png",
    "favicon.png",
    "JohnsonText-Regular.ttf",
    "JohnsonText-Bold.ttf",
  ]) assert.ok(names.includes(required), `${required} should be published`)

  assert.equal(names.includes("config.js"), false)
  assert.equal(names.includes("README.txt"), false)
})

test("published LETS assets use content versions so browsers do not retain an old script", async () => {
  const root = path.join(process.cwd(), "public", "templates", "lets-live-agenda")
  const artifacts = await readTemplateArtifacts(root)
  artifacts.push({ name: "config.js", content: Buffer.from("window.POA_CONFIG = {}") })
  const html = artifacts.find((artifact) => artifact.name === "index.html")?.content.toString("utf8") || ""
  const versioned = versionManagedAssetReferences(html, artifacts)

  for (const name of ["styles.css", "config.js", "app.js"]) {
    const asset = artifacts.find((item) => item.name === name)
    assert.ok(asset)
    const version = createHash("sha256").update(asset.content).digest("hex").slice(0, 12)
    assert.ok(versioned.includes(`${name}?v=${version}`), `${name} must load its current content`)
  }

  const app = artifacts.find((item) => item.name === "app.js")
  assert.ok(app)
  const appVersion = createHash("sha256").update(app.content).digest("hex").slice(0, 12)
  assert.ok(html.includes(`app.js?v=${appVersion}`), "the standalone template must also bypass stale app.js caches")
})

test("ZIP deployments strip one wrapper folder and reject unsafe paths", async () => {
  const zip = new JSZip()
  zip.file("site/index.html", "<h1>Event</h1>")
  zip.file("site/assets/app.js", "console.log('ready')")
  zip.file("__MACOSX/site/._index.html", "metadata")
  const artifacts = await extractPublishArchive(await zip.generateAsync({ type: "nodebuffer" }))

  assert.deepEqual(artifacts.map((artifact) => artifact.name), ["index.html", "assets/app.js"])
  assert.throws(() => normalizeArchivePath("../secret.txt"), /unsafe path/)
  assert.throws(() => normalizeArchivePath(".jupiter/manifest.json"), /unsafe path/)
})

test("every publishing API route enforces the event publishing permission", async () => {
  const routePaths = [
    "destinations/route.ts",
    "files/route.ts",
    "history/route.ts",
    "publish/route.ts",
    "rollback/route.ts",
    "test/route.ts",
    "archive/route.ts",
    "upload/prepare/route.ts",
    "upload/commit/route.ts",
  ]
  const root = path.join(process.cwd(), "app", "api", "admin", "events", "[id]", "publishing")
  for (const routePath of routePaths) {
    const source = await readFile(path.join(root, routePath), "utf8")
    assert.match(source, /requirePublishingApiAccess\(id\)/, `${routePath} must enforce publishing access`)
  }
})

test("external publishing is represented by a formal Supabase migration", async () => {
  const migration = await readFile(
    path.join(process.cwd(), "supabase", "migrations", "20260919152138_external_site_publishing.sql"),
    "utf8",
  )
  assert.match(migration, /create table if not exists public\.event_publish_destinations/)
  assert.match(migration, /enable row level security/)
  assert.match(migration, /revoke all .* from anon, authenticated/)
  assert.match(migration, /grant all .* to service_role/)
})

test("a dedicated publishing key can read credentials encrypted with the legacy JWT key", () => {
  const previousPublishingKey = process.env.EXTERNAL_PUBLISHING_ENCRYPTION_KEY
  const previousJwtSecret = process.env.JWT_SECRET

  try {
    delete process.env.EXTERNAL_PUBLISHING_ENCRYPTION_KEY
    process.env.JWT_SECRET = "legacy-publishing-secret"
    const encrypted = encryptPublishingSecret("ftp-password")

    process.env.EXTERNAL_PUBLISHING_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64")
    assert.equal(decryptPublishingSecret(encrypted), "ftp-password")
  } finally {
    if (previousPublishingKey === undefined) delete process.env.EXTERNAL_PUBLISHING_ENCRYPTION_KEY
    else process.env.EXTERNAL_PUBLISHING_ENCRYPTION_KEY = previousPublishingKey
    if (previousJwtSecret === undefined) delete process.env.JWT_SECRET
    else process.env.JWT_SECRET = previousJwtSecret
  }
})
