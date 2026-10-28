import { randomBytes, timingSafeEqual } from 'node:crypto'
import { tmpdir } from 'node:os'
import { chromium, type BrowserServer } from 'playwright-core'

export type DeliveryProbeReport = { state: string; frames: number; revisions: number[]; publisherIdentity: string | null; videoTrackSid: string | null; audioTrackSid: string | null; audioRms: number; maxAudioRms: number; contentSources: string[]; width: number; height: number; ended: boolean; atMs: number }

/** Owned, bounded application receiver used only for local acceptance measurements. */
export class LocalDeliveryProbe {
  private server: BrowserServer | null = null
  private capability = ''
  private timer: ReturnType<typeof setTimeout> | null = null
  private expiresAtMs = 0
  report: DeliveryProbeReport | null = null
  async start(base: string, recordingId?: string) {
    if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(base)) throw new Error('Probe requires loopback')
    await this.stop(); this.report = null; this.capability = randomBytes(32).toString('hex'); this.expiresAtMs = Date.now() + 120_000
    this.server = await chromium.launchServer({ ...(process.env.JUPITER_LOCAL_BUNDLED_BROWSER === '1' ? {} : { channel: 'chrome' }), host: '127.0.0.1', headless: true, chromiumSandbox: true,
      env: { PATH: process.env.PATH ?? '', HOME: process.env.HOME ?? '', TMPDIR: process.env.TMPDIR ?? tmpdir(), LANG: 'en_US.UTF-8', NODE_ENV: 'development' }, args: ['--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] })
    try {
      const browser = await chromium.connect(this.server.wsEndpoint()), context = await browser.newContext({ serviceWorkers: 'block' })
      await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort())
      const page = await context.newPage()
      await page.goto(`${base}/audience-probe${recordingId ? `?recording=${recordingId}` : ''}#${this.capability}`)
      this.timer = setTimeout(() => void this.stop(), 120_000)
    } catch (error) { await this.stop(); throw error }
  }
  authorized(value: unknown) {
    if (!this.server || Date.now() >= this.expiresAtMs || typeof value !== 'string') return false
    const actual = Buffer.from(value), expected = Buffer.from(this.capability)
    return actual.length === expected.length && timingSafeEqual(actual, expected)
  }
  accept(value: unknown) {
    const x = value as DeliveryProbeReport
    if (!x || !['idle', 'legacy', 'waiting', 'live', 'stalled', 'stopped', 'expired', 'recording', 'error'].includes(x.state) || !Number.isSafeInteger(x.frames) || x.frames < 0 || !Array.isArray(x.revisions) || x.revisions.length > 200 || x.revisions.some(n => !Number.isSafeInteger(n) || n < 0) || !Number.isFinite(x.audioRms) || x.audioRms < 0 || x.audioRms > 1 || !Number.isSafeInteger(x.width) || !Number.isSafeInteger(x.height) || x.width < 0 || x.height < 0 || x.width > 4096 || x.height > 4096) throw new Error('Invalid audience probe report')
    const sid = (s: unknown) => typeof s === 'string' && /^TR_[\w-]+$/.test(s) ? s : null
    this.report = { state: x.state, frames: x.frames, revisions: x.revisions, publisherIdentity: typeof x.publisherIdentity === 'string' && /^program-engine-\d+$/.test(x.publisherIdentity) ? x.publisherIdentity : null, videoTrackSid: sid(x.videoTrackSid), audioTrackSid: sid(x.audioTrackSid), audioRms: x.audioRms, maxAudioRms: Number.isFinite(x.maxAudioRms) ? Math.max(0, Math.min(1, x.maxAudioRms)) : 0, contentSources: Array.isArray(x.contentSources) ? x.contentSources.filter(item => ['camera-a', 'camera-b'].includes(item)).slice(0, 2) : [], width: x.width, height: x.height, ended: x.ended === true, atMs: Date.now() }
  }
  async stop() {
    if (this.timer) clearTimeout(this.timer)
    this.capability = ''; const server = this.server; this.server = null
    if (this.report) this.report = { ...this.report, state: Date.now() >= this.expiresAtMs ? 'expired' : 'stopped', videoTrackSid: null, audioTrackSid: null, atMs: Date.now() }
    if (server) {
      await Promise.race([server.close().catch(() => {}), new Promise(resolve => setTimeout(resolve, 3000))])
      const child = server.process(); if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL')
    }
  }
}
