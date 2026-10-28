import { createServer, type IncomingMessage, type ServerResponse } from "node:http"
import { readFileSync } from "node:fs"
import { ProductionError, type BroadcastScope, type ProductionCommand } from "./contracts.ts"
import { commitProductionCommand } from "./commandService.ts"
import { LocalSqliteProductionStore } from "./localSqliteStore.ts"
import { createLocalProductionGateway } from "./localGateway.ts"
import { identifier } from "./validation.ts"
import { PRODUCER_MAX_COMPOSITION_BYTES } from "../live/producerControl.ts"
import type { LocalMediaRoutes } from "./localMediaRoutes.ts"

export const LOCAL_SCOPE: BroadcastScope = { broadcastId: "local-phase1", eventId: "local-event", sessionId: "general-session" }

export function seedLocalProduction(store: LocalSqliteProductionStore, sourceBFallback: "slate" | "hold-last" = "hold-last"): void {
  const state = store.initialize(LOCAL_SCOPE)
  if (state.revision >= 3) return
  const commands: ProductionCommand[] = [
    { type: "REGISTER_SOURCE", source: { sourceId: "camera-a", label: "Camera A", kind: "camera", fallback: "slate" } },
    { type: "REGISTER_SOURCE", source: { sourceId: "camera-b", label: "Camera B", kind: "camera", fallback: sourceBFallback } },
    { type: "SET_PREVIEW", composition: { sceneId: null, layers: [{ id: "main", kind: "camera", sourceId: "camera-a", props: { x: 0, y: 0, width: 640, height: 360 } }] } },
  ]
  for (const [index, command] of commands.entries()) {
    commitProductionCommand(store, { schemaVersion: 1, scope: LOCAL_SCOPE, commandId: `seed-${index}`, expectedRevision: index, command }, { actorId: "local-setup", scope: LOCAL_SCOPE })
  }
}

function send(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" })
  response.end(JSON.stringify(value))
}

async function readBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []; let bytes = 0
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    bytes += buffer.length
    if (bytes > PRODUCER_MAX_COMPOSITION_BYTES) throw new ProductionError("INVALID_COMMAND", "Command exceeds size limit")
    chunks.push(buffer)
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")) }
  catch { throw new ProductionError("INVALID_COMMAND", "Invalid JSON") }
}

/** Loopback-only, synthetic local identity. Not an authenticated production API. */
export function createLocalWorkbench(store: LocalSqliteProductionStore, media?: LocalMediaRoutes) {
  const gateway = createLocalProductionGateway(store)
  const viewer = { actorId: "local-viewer", scope: LOCAL_SCOPE }
  return createServer(async (request, response) => {
    try {
      const address = request.socket.localAddress
      const host = `127.0.0.1:${request.socket.localPort}`
      if (address !== "127.0.0.1" || request.headers.host !== host ||
        request.headers["sec-fetch-site"] === "cross-site" ||
        (request.headers.origin && request.headers.origin !== `http://${host}`)) {
        send(response, 403, { error: "This workbench accepts same-origin loopback requests only" }); return
      }
      const url = new URL(request.url ?? "/", `http://${host}`)
      if (media && await media.handle(request, response, url)) return
      if (request.method === "GET" && url.pathname === "/api/state") {
        const snapshot = await gateway.read(LOCAL_SCOPE, viewer)
        send(response, 200, { ...snapshot, engine: media?.session.observation() ?? null, sourceReports: media?.session.sources ?? null }); return
      }
      if (request.method === "GET" && url.pathname === "/api/commands") {
        send(response, 200, { commands: await gateway.commands(LOCAL_SCOPE, viewer, Number(url.searchParams.get("afterRevision") ?? 0)) }); return
      }
      if (request.method === "POST" && url.pathname === "/api/commands") {
        if (request.headers["x-jupiter-local"] !== "phase1" || request.headers["content-type"] !== "application/json") {
          send(response, 403, { error: "Local JSON command header required" }); return
        }
        const actorId = identifier(request.headers["x-console-id"])
        const result = await gateway.commit(await readBody(request), { actorId, scope: LOCAL_SCOPE })
        send(response, 200, result); return
      }
      const assets: Record<string, [string, string]> = { "/": ["index.html", "text/html"], "/app.js": ["app.js", "text/javascript"], "/scale-panel.js": ["scale-panel.js", "text/javascript"], "/delivery-panel.js": ["delivery-panel.js", "text/javascript"], "/media-panel.js": ["media-panel.js", "text/javascript"], "/style.css": ["style.css", "text/css"], "/media.css": ["media.css", "text/css"] }
      if (request.method === "GET" && Object.hasOwn(assets, url.pathname)) {
        const [filename, contentType] = assets[url.pathname]
        response.writeHead(200, {
          "Content-Type": `${contentType}; charset=utf-8`, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
          "Content-Security-Policy": "default-src 'self'; connect-src 'self'; script-src 'self'; style-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
        })
        response.end(readFileSync(new URL(`../../tools/production-local/${filename}`, import.meta.url))); return
      }
      send(response, 404, { error: "Not found" })
    } catch (error) {
      if (error instanceof ProductionError) {
        const status = error.code === "SCOPE_MISMATCH" ? 403 : ["REVISION_CONFLICT", "COMMAND_ID_REUSED", "SCENE_CONFLICT", "BINDING_CONFLICT"].includes(error.code) ? 409 : 400
        send(response, status, { code: error.code, error: error.message }); return
      }
      console.error("Local production command failed:", error instanceof Error ? error.name : "UnknownError")
      send(response, 500, { error: "Local store operation failed; no command was acknowledged" })
    }
  })
}
