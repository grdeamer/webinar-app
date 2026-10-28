import { LOCAL_PROFILES, parseLocalProfile } from './localScale.ts'
import { LOCAL_SCOPE } from './localWorkbench.ts'
import { readFileSync, createReadStream, statSync } from "node:fs"
import type { IncomingMessage, ServerResponse } from "node:http"
import { LocalMediaSession, type RuntimeRole } from "./localMediaSession.ts"
import { LocalProgramRecording } from "./localRecording.ts"
import { parityFixtures } from "./parityFixtures.ts"
import { LocalAssetLibrary } from "./localAssetLibrary.ts"
import { join } from 'node:path'
import { importLegacyComposition } from './legacyComposition.ts'
import { LocalDeliveryRoutes } from './localDeliveryRoutes.ts'

function json(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" })
  response.end(JSON.stringify(value))
}

async function body(request: IncomingMessage, max = 40_000): Promise<Buffer> {
  const chunks: Buffer[] = []; let size = 0
  for await (const chunk of request) {
    const data = Buffer.from(chunk); size += data.length
    if (size > max) throw new Error("Local media request exceeds limit")
    chunks.push(data)
  }
  return Buffer.concat(chunks)
}

export class LocalMediaRoutes {
  readonly scaleResultPath: string
  readonly recording: LocalProgramRecording
  recordingStopRequested = false
  readonly session: LocalMediaSession
  readonly assets: LocalAssetLibrary
  readonly delivery: LocalDeliveryRoutes
  restartRenderer: (() => Promise<void>) | null = null
  injectFault: ((role: RuntimeRole, mode: 'exit' | 'freeze') => Promise<void>) | null = null
  constructor(session: LocalMediaSession, directory: string) {
    this.scaleResultPath = join(directory, '..', 'scale-verification.json')
    this.session = session; this.recording = new LocalProgramRecording(directory); this.assets = new LocalAssetLibrary(join(directory, '..', 'assets'))
    this.delivery = new LocalDeliveryRoutes(session, this.recording, join(directory, '..')); this.delivery.onRecordingStart = () => { this.recordingStopRequested = false }
  }

  async handle(request: IncomingMessage, response: ServerResponse, url: URL): Promise<boolean> {
    if (!url.pathname.startsWith("/api/media/") && !url.pathname.startsWith("/runtime/") && !["/viewer", "/parity", "/audience", "/audience-probe", "/vendor/livekit-client.js", "/vendor/pdf.mjs", "/vendor/pdf.worker.mjs"].includes(url.pathname)) return false
    try {
      if (await this.delivery.handle(request, response, url, async () => JSON.parse((await body(request)).toString()))) return true
      if (url.pathname === '/api/media/encoding') {
        if (request.method === 'POST') {
          if (request.headers['x-jupiter-local'] !== 'phase6' || !this.session.running || this.recording.job?.status === 'recording') throw new Error('Running local engine, phase6 header and no recording required')
          const x = JSON.parse((await body(request)).toString())
          if (JSON.stringify(x.scope) !== JSON.stringify(LOCAL_SCOPE) || x.runId !== this.session.runId) throw new Error('Encoding request belongs to another local run')
          this.session.encodingProfile = parseLocalProfile(x.profile)
        } else if (request.method !== 'GET') throw new Error('Unsupported encoding method')
        json(response, 200, { runId: this.session.runId, scope: LOCAL_SCOPE, profile: this.session.encodingProfile, encoding: LOCAL_PROFILES[this.session.encodingProfile], applied: this.session.encodingApplied?.generation === this.session.generation ? this.session.encodingApplied : null }); return true
      }
      if (request.method === 'GET' && url.pathname === '/api/media/scale-result') {
        try { json(response, 200, JSON.parse(readFileSync(this.scaleResultPath, 'utf8'))) }
        catch { json(response, 200, null) }
        return true
      }
      if (request.method === 'GET' && url.pathname === '/api/media/recordings') { json(response, 200, this.recording.history); return true }
      if (request.method === 'POST' && url.pathname === '/api/media/fault') {
        if (request.headers['x-jupiter-local'] !== 'phase4' || !this.injectFault) throw new Error('Local fault-test header required')
        const x = JSON.parse((await body(request)).toString()) as { role: RuntimeRole; mode: 'exit' | 'freeze' }
        if (!['renderer', 'observer', 'source-a', 'source-b'].includes(x.role) || !['exit', 'freeze'].includes(x.mode)) throw new Error('Invalid local fault')
        await this.injectFault(x.role, x.mode); json(response, 200, { accepted: true }); return true
      }
      if (request.method === 'GET' && url.pathname === '/api/media/assets') { json(response, 200, this.assets.list()); return true }
      if (request.method === 'POST' && url.pathname === '/api/media/import') {
        if (request.headers['x-jupiter-local'] !== 'phase3') throw new Error('Local scene import header required')
        const x = JSON.parse((await body(request, 2_000_000)).toString()) as { blocks: unknown[]; sourceIds: Record<string, string> }
        if (!Array.isArray(x.blocks) || x.blocks.length > 200 || !x.sourceIds || typeof x.sourceIds !== 'object' || Array.isArray(x.sourceIds)) throw new Error('Expected legacy blocks and an explicit source mapping')
        json(response, 200, importLegacyComposition(x.blocks, x.sourceIds)); return true
      }
      if (request.method === 'POST' && url.pathname === '/api/media/assets') {
        if (request.headers['x-jupiter-local'] !== 'phase3') throw new Error('Local asset upload header required')
        const asset = this.assets.add(url.searchParams.get('name') ?? 'Local asset', String(request.headers['content-type']), await body(request, 20_000_000))
        json(response, 200, asset); return true
      }
      if (request.method === 'GET' && /^\/runtime\/assets\/asset-/.test(url.pathname)) {
        const { asset, path } = this.assets.resolve(url.pathname.slice('/runtime/assets/'.length))
        response.writeHead(200, { 'Content-Type': asset.type, 'Content-Length': asset.bytes, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox" });
        const stream = createReadStream(path); stream.once('error', () => response.destroy()); stream.pipe(response); return true
      }
      if (request.method === "GET" && url.pathname === "/api/media/presets") { json(response, 200, parityFixtures()); return true }
      if (request.method === "POST" && url.pathname === "/api/media/source-control") {
        if (request.headers["x-jupiter-local"] !== "phase2") throw new Error("Local source control header required")
        const x = JSON.parse((await body(request)).toString()) as { sourceId: string; paused: boolean }
        if (!["camera-a", "camera-b"].includes(x.sourceId) || typeof x.paused !== "boolean") throw new Error("Invalid synthetic source control")
        this.session.sourcePaused[x.sourceId] = x.paused; json(response, 200, { paused: x.paused }); return true
      }
      if (request.method === "GET" && url.pathname === "/api/media/status") {
        json(response, 200, { ...this.session.publicStatus(), recording: this.recording.job, recordingEnabled: this.recording.job?.status === "recording" }); return true
      }
      if (request.method === "POST" && url.pathname === "/api/media/token") {
        const x = JSON.parse((await body(request)).toString()) as { role: string }
        if (x.role === 'audience') throw new Error('Use the scoped audience bootstrap endpoint')
        json(response, 200, await this.session.token(x.role, request.headers["x-runtime-capability"])); return true
      }
      if (request.method === "POST" && url.pathname === "/api/media/record") {
        if (request.headers["x-jupiter-local"] !== "phase2") throw new Error("Local recording header required")
        const x = JSON.parse((await body(request)).toString()) as { action: string }
        if (x.action === "start") {
          if (!this.session.running || this.session.observation().status !== "healthy") throw new Error("A healthy local Program receiver is required")
          this.recording.start(Date.now(), this.delivery.origin()); this.recordingStopRequested = false; this.delivery.stopRecordingRequested = false
        }
        else if (x.action === "stop") this.recordingStopRequested = true
        else throw new Error("Unsupported recording action")
        json(response, 200, this.recording.job); return true
      }
      if (request.method === "POST" && url.pathname === "/api/media/restart-renderer") {
        if (request.headers["x-jupiter-local"] !== "phase2" || !this.restartRenderer) throw new Error("Local recovery control required")
        await this.restartRenderer(); json(response, 200, { accepted: true }); return true
      }
      const role = url.searchParams.get("role") as RuntimeRole
      if (url.pathname === "/api/media/report" && request.method === "POST") {
        if (!Object.hasOwn(this.session.caps, role) || !this.session.authorized(role, request.headers["x-runtime-capability"])) throw new Error("Runtime capability required")
        const data = JSON.parse((await body(request)).toString())
        if (role === "source-a" || role === "source-b") this.session.sourceReady(role, data)
        else this.session.report(role, data)
        if (role === 'renderer' && data.encoderProfile) this.session.encodingApplied = { profile: parseLocalProfile(data.encoderProfile), generation: this.session.generation, atMs: Date.now() }
        if (role === 'observer') this.recording.observe(this.session.observer!.report)
        json(response, 200, { recording: role === "observer" ? this.recording.job : null, stopRecording: this.recordingStopRequested || this.delivery.stopRecordingRequested, paused: this.session.sourcePaused[role === "source-a" ? "camera-a" : "camera-b"] ?? false, fault: this.session.faults[role] === true }); return true
      }
      if (url.pathname === "/api/media/recording-chunk" && request.method === "POST") {
        if (!this.session.authorized("observer", request.headers["x-runtime-capability"])) throw new Error("Observer capability required")
        const id = url.searchParams.get("id") ?? ""
        if (url.searchParams.get("finish") === "true") this.recording.finish(id)
        else this.recording.append(id, Number(url.searchParams.get("sequence")), await body(request, 2_000_000))
        json(response, 200, { ok: true }); return true
      }
      if (["/api/media/recording-download", '/api/media/recording-playback'].includes(url.pathname) && request.method === "GET") {
        const id = url.searchParams.get("id") ?? ""
        const path = this.recording.downloadable(id)
        response.writeHead(200, { "Content-Type": "video/webm", 'Content-Length': statSync(path).size, "Content-Disposition": `${url.pathname.endsWith('playback') ? 'inline' : 'attachment'}; filename="jupiter-local-${id}.webm"`, "Cache-Control": "no-store" })
        const stream = createReadStream(path); stream.once('error', () => response.destroy()); stream.pipe(response); return true
      }
      if (request.method === "GET") {
        let file: URL; let type: string
        if (["/runtime/assets/brand.svg", "/runtime/assets/deck.pdf"].includes(url.pathname)) {
          file = new URL(`../../tools/production-local/runtime/assets/${url.pathname.endsWith('pdf') ? 'deck.pdf' : 'brand.svg'}`, import.meta.url); type = url.pathname.endsWith('pdf') ? 'application/pdf' : 'image/svg+xml'
        } else if (url.pathname === "/vendor/pdf.mjs" || url.pathname === "/vendor/pdf.worker.mjs") {
          file = new URL(`../../node_modules/pdfjs-dist/build/${url.pathname.endsWith('worker.mjs') ? 'pdf.worker.mjs' : 'pdf.mjs'}`, import.meta.url); type = "text/javascript"
        } else if (url.pathname === "/vendor/livekit-client.js") {
          file = new URL("../../node_modules/livekit-client/dist/livekit-client.umd.js", import.meta.url); type = "text/javascript"
        } else {
          const name = url.pathname === '/audience' ? 'audience.html' : url.pathname === '/audience-probe' ? 'audience-probe.html' : url.pathname === "/parity" ? "parity.html" : url.pathname === "/viewer" || /^\/runtime\/(source-a|source-b|renderer|observer)$/.test(url.pathname) ? "runtime.html" : url.pathname.slice("/runtime/".length)
          const allowed = ["audience.html", "audience.js", "audience-probe.html", "audience-probe.js", "program-player.js", "runtime.html", "parity.html", "parity.js", "layout.js", "assets.js", "scene-renderer.js", "boot.js", "common.js", "marker.js", "source.js", "compositor.js", "observer.js", "viewer.js", "recording.js"]
          if (!allowed.includes(name)) throw new Error("Unknown local media asset")
          file = new URL(`../../tools/production-local/runtime/${name}`, import.meta.url); type = name.endsWith("html") ? "text/html" : "text/javascript"
        }
        response.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store", "Content-Security-Policy": "default-src 'self'; connect-src 'self' ws://127.0.0.1:7880; script-src 'self'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self' blob:; object-src 'none'; frame-ancestors 'self'" })
        response.end(readFileSync(file)); return true
      }
      throw new Error("Unknown local media request")
    } catch (error) {
      json(response, 400, { error: error instanceof Error ? error.message : "Local media request failed" }); return true
    }
  }
}
