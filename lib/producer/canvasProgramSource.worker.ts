import type { PreviewBlock } from '../../app/admin/events/[id]/producer/useProducerBlocks'
type Layer = { block: PreviewBlock; bitmap?: ImageBitmap; readable?: ReadableStream<VideoFrame> }
type Job = { layers: Layer[]; writable: WritableStream<VideoFrame> }
const scope = self as unknown as { onmessage: ((event: MessageEvent<Job | {endedId:string}>) => void) | null; postMessage: (value: unknown) => void }
const naturallyEnded = new Set<string>()
scope.onmessage = event => {
  if ('endedId' in event.data) { naturallyEnded.add(event.data.endedId); return }
  const { layers, writable } = event.data
  const canvas = new OffscreenCanvas(1920, 1080), context = canvas.getContext('2d')!
  const writer = writable.getWriter(), frames = new Map<string, VideoFrame>()
  // Composite each layer once: group opacity must not darken the layers beneath it twice.
  const surfaces=new Map(layers.filter(layer=>layer.block.type!=='audio').map(({block})=>[block.id,new OffscreenCanvas(Math.max(1,Math.min(1920,Math.ceil(block.width*3))),Math.max(1,Math.min(1080,Math.ceil(block.height*3))))]))
  let ended = false, written = 0, lastReport = 0
  const received = new Map<string, {frames:number;atMs:number}>()
  const fail = () => { if (!ended) { ended = true; scope.postMessage({ error: 'Canvas input frame generation stopped' }) } }
  for (const layer of layers) if (layer.readable) {
    const reader = layer.readable.getReader()
    void (async () => {
      try {
        while (!ended) {
          const { value, done } = await reader.read()
          if (done) break
          frames.get(layer.block.id)?.close()
          frames.set(layer.block.id, value)
          received.set(layer.block.id,{frames:(received.get(layer.block.id)?.frames??0)+1,atMs:performance.now()})
        }
      } catch { fail() }
      finally { await reader.cancel().catch(() => {}) }
    })()
  }
  void (async () => {
    const started = performance.now(), interval = 1000 / 30
    let deadline = started
    try {
      const videoLayers = layers.filter(layer => layer.readable)
      while (videoLayers.some(layer => !frames.has(layer.block.id))) {
        if (ended || performance.now() - started > 10000) throw Error('Canvas video never decoded')
        await new Promise(resolve => setTimeout(resolve, 10))
      }
      deadline = performance.now()
      while (!ended) {
        if (performance.now() < deadline) await new Promise(resolve => setTimeout(resolve, deadline - performance.now()))
        if (videoLayers.some(layer=>!naturallyEnded.has(layer.block.id)&&performance.now()-(received.get(layer.block.id)?.atMs??0)>2500)) throw Error('Canvas video stopped progressing')
        context.resetTransform(); context.globalAlpha = 1; context.globalCompositeOperation = 'source-over'; context.filter = 'none'
        context.fillStyle = '#000'; context.fillRect(0, 0, 1920, 1080)
        for (const layer of layers) {
          const block = layer.block
          if (block.type === 'audio') continue
          const image = frames.get(block.id) ?? layer.bitmap
          context.save()
          const progress = Math.max(0, Math.min(1, block.animationProgress ?? 1)), ease = 1 - (1 - progress) ** 3
          const shiftX = block.animationType === 'push-left' ? -120 * (1 - ease) : block.animationType === 'push-right' ? 120 * (1 - ease) : 0
          const shiftY = block.animationType === 'push-up' ? -120 * (1 - ease) : block.animationType === 'push-down' ? 120 * (1 - ease) : block.animationType === 'drift' ? 18 * (1 - ease) : 0
          context.scale(3, 3)
          context.translate(block.x + block.width / 2 + shiftX, block.y + block.height / 2 + shiftY)
          context.rotate((block.rotation ?? 0) * Math.PI / 180)
          context.scale(block.scale ?? 1, block.scale ?? 1)
          context.globalAlpha = Math.max(0, Math.min(1, block.opacity ?? 1)) * (block.animationType === 'fade' ? ease : 1)
          context.globalCompositeOperation = block.blendMode === 'normal' || !block.blendMode ? 'source-over' : block.blendMode === 'plus-lighter' ? 'lighter' : block.blendMode as GlobalCompositeOperation
          const colorFilter = block.blendMode === 'overlay' ? 'contrast(1.06) saturate(1.08)' : block.blendMode === 'soft-light' ? 'brightness(1.02) saturate(1.04)' : block.blendMode === 'hard-light' ? 'contrast(1.12) saturate(1.12)' : block.blendMode === 'screen' ? 'brightness(1.08)' : ''
          context.filter = `blur(${Math.max(0, block.blur ?? 0) * 3}px) ${colorFilter}`.trim()
          const surface=surfaces.get(block.id)!, paint=surface.getContext('2d')!
          paint.resetTransform();paint.clearRect(0,0,surface.width,surface.height)
          paint.save();paint.scale(surface.width/block.width,surface.height/block.height)
          paint.beginPath();paint.roundRect(0,0,block.width,block.height,Math.max(0,Math.min(block.borderRadius??0,block.width/2,block.height/2)));paint.clip()
          paint.fillStyle='#000';paint.fillRect(0,0,block.width,block.height)
          if (image) {
            const width = image instanceof VideoFrame ? image.displayWidth : image.width, height = image instanceof VideoFrame ? image.displayHeight : image.height
            const scale = Math.min(block.width / width, block.height / height)
            paint.drawImage(image,(block.width-width*scale)/2,(block.height-height*scale)/2,width*scale,height*scale)
          } else if (block.type === 'text') {
            paint.fillStyle = '#fff'; paint.font = '18px sans-serif'; paint.textBaseline = 'middle'
            paint.fillText(block.content ?? block.label ?? '', 12, block.height/2, Math.max(1, block.width - 24))
          }
          paint.restore()
          const glow=Math.max(0,block.glow??0),shadow=Math.max(0,block.shadowIntensity??0)
          const alphaColor=(color:string|undefined,alpha:number,fallback:string)=>{
            const hex=/^#[0-9a-f]{6}$/i.test(color??'')?color!:fallback
            return `${hex}${Math.round(Math.max(0,Math.min(1,alpha))*255).toString(16).padStart(2,'0')}`
          }
          const shadows=[shadow?`drop-shadow(0px 54px 144px ${alphaColor(block.shadowColor,Math.min(.45,shadow*.34),'#000000')})`:'',glow?`drop-shadow(0px 0px ${(28+glow*52)*3}px ${alphaColor(block.glowColor,Math.min(.42,glow*.34),'#7dd3fc')})`:''].filter(Boolean).join(' ')
          context.filter=`${context.filter} ${shadows}`.trim()
          context.drawImage(surface,-block.width/2,-block.height/2,block.width,block.height)
          context.restore()
        }
        const frame = new VideoFrame(canvas, { timestamp: Math.round((performance.now() - started) * 1000), duration: 33333 })
        let timer: ReturnType<typeof setTimeout>
        try { await Promise.race([writer.write(frame), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(Error('Canvas writer stalled')), 1000) })]) }
        finally { clearTimeout(timer); frame.close() }
        written++
        if (performance.now()-lastReport>=1000) {
          scope.postMessage({framesWritten:written,sourceFrames:Object.fromEntries([...received].map(([id,value])=>[id,value.frames]))})
          lastReport=performance.now()
        }
        deadline += interval
        if (deadline < performance.now() - interval) deadline = performance.now()
      }
    } catch { fail() }
    finally {
      ended = true; frames.forEach(frame => frame.close()); layers.forEach(layer => layer.bitmap?.close())
      await writer.abort().catch(() => {})
    }
  })()
}
export {}
