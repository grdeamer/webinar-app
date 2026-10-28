// Asset IDs are durable; generated blob URLs never enter the command snapshot.
export const ASSET_IDS = ['brand-mark', 'sample-deck', 'motion-clip']
export class LocalAssets {
  constructor() { this.cache = new Map(); this.pending = new Map(); this.urls = [] }
  key(layer) { return `${layer.props.assetId}:${layer.kind === 'pdf' ? layer.props.page ?? 1 : layer.kind === 'video' ? layer.id : 0}` }
  get(layer) { return this.cache.get(this.key(layer)) }
  async prepare(composition) {
    await Promise.all(composition.layers.filter(layer => !layer.props.hidden && ['image', 'pdf', 'video'].includes(layer.kind)).map(layer => this.load(layer)))
  }
  async load(layer) {
    const key = this.key(layer)
    if (this.cache.has(key)) return
    if (this.pending.has(key)) return this.pending.get(key)
    if (this.cache.size + this.pending.size >= 32) throw new Error('Local asset cache limit reached; restart the local runtime')
    const task = this.create(layer).then(asset => this.cache.set(key, asset)).finally(() => this.pending.delete(key))
    this.pending.set(key, task); return task
  }
  async create(layer) {
    const id = layer.props.assetId
    if (typeof id === 'string' && /^asset-[a-f0-9]{64}$/.test(id)) {
      const catalog = await (await fetch('/api/media/assets')).json(), asset = catalog.find(item => item.id === id)
      if (!asset || asset.kind !== layer.kind) throw new Error('Local asset is not registered for this layer kind')
      const url = `/runtime/assets/${id}`
      if (layer.kind === 'image') { const image = new Image(); image.src = url; await image.decode(); if (image.naturalWidth * image.naturalHeight > 32_000_000) throw new Error('Local image exceeds 32 megapixels'); return image }
      if (layer.kind === 'video') {
        const video = document.createElement('video'); video.muted = true; video.playsInline = true; video.src = url
        await new Promise((resolve, reject) => { video.onloadeddata = resolve; video.onerror = () => reject(new Error('Local video codec could not be decoded')) })
        if (!Number.isFinite(video.duration) || video.duration <= 0) throw new Error('Video needs a finite duration; use a finalized MP4 for this phase')
        return video
      }
      return this.pdf(url, layer.props.page ?? 1)
    }
    if (!ASSET_IDS.includes(id)) throw new Error(`Unregistered local asset: ${String(id).slice(0, 60)}`)
    if (layer.kind === 'image' && id === 'brand-mark') {
      const image = new Image(); image.src = '/runtime/assets/brand.svg'; await image.decode(); return image
    }
    if (layer.kind === 'pdf' && id === 'sample-deck') {
      return this.pdf('/runtime/assets/deck.pdf', layer.props.page ?? 1)
    }
    if (layer.kind === 'video' && id === 'motion-clip') {
      const surface = document.createElement('canvas'); surface.width = 640; surface.height = 360
      const ctx = surface.getContext('2d'), stream = surface.captureStream(30), chunks = []
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8', videoBitsPerSecond: 1_000_000 })
      const complete = new Promise(resolve => { recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data) }; recorder.onstop = resolve })
      recorder.start()
      const began = performance.now(); let duration = 0
      await new Promise(resolve => {
        const timer = setInterval(() => {
          const t = performance.now() - began
          ctx.fillStyle = '#153b42'; ctx.fillRect(0, 0, 640, 360); ctx.fillStyle = '#a4efe2'; ctx.fillRect(t / 4 % 590, 130, 50, 80)
          ctx.font = '26px sans-serif'; ctx.fillText('LOCAL SYNTHETIC VIDEO CLIP', 30, 60); ctx.fillText(`${Math.floor(t)} ms`, 30, 300)
          if (t > 2000) { duration = t / 1000; clearInterval(timer); recorder.stop(); resolve() }
        }, 1000 / 30)
      })
      await complete; stream.getTracks().forEach(track => track.stop())
      const url = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' })); this.urls.push(url)
      const video = document.createElement('video'); video.muted = true; video.playsInline = true; video.src = url
      video.dataset.localDuration = String(duration)
      await new Promise((resolve, reject) => { video.onloadeddata = resolve; video.onerror = () => reject(new Error('Local video fixture failed to decode')) })
      return video
    }
    throw new Error('Asset kind does not match its local registration')
  }
  async pdf(url, pageNumber) {
    const pdfjs = await import('/vendor/pdf.mjs'); pdfjs.GlobalWorkerOptions.workerSrc = '/vendor/pdf.worker.mjs'
    const task = pdfjs.getDocument({ url, isEvalSupported: false, useSystemFonts: true })
    try {
      const doc = await task.promise, number = Number(pageNumber)
      if (!Number.isInteger(number) || number < 1 || number > doc.numPages) throw new Error('PDF page is outside the local deck')
      const page = await doc.getPage(number), base = page.getViewport({ scale: 1 })
      const viewport = page.getViewport({ scale: Math.min(2, 1920 / Math.max(base.width, base.height)) })
      const canvas = document.createElement('canvas'); canvas.width = viewport.width; canvas.height = viewport.height
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise; return canvas
    } finally { await task.destroy() }
  }
  dispose() { for (const asset of this.cache.values()) if (asset instanceof HTMLVideoElement) asset.pause(); this.urls.forEach(url => URL.revokeObjectURL(url)) }
}
