import type { PreviewBlock } from '../../app/admin/events/[id]/producer/useProducerBlocks'
import { takePreparedMedia } from './takePreparedMedia'
import { libraryCanvasPlan } from './libraryCanvasPlan'
import { renderProgramSlide } from './programSlideRender'
type GeneratedTrack = MediaStreamTrack & { writable: WritableStream<VideoFrame> }
type GeneratorConstructor = new (options: { kind: 'video' }) => GeneratedTrack
type ProcessorConstructor = new (options: { track: MediaStreamTrack; maxBufferSize?: number }) => { readable: ReadableStream<VideoFrame> }
type SourceOptions = { resolveSource: (block: PreviewBlock) => Promise<string> }

/** Ephemeral in-memory composition. No recording, canvas capture or page paint clock. */
export async function canvasProgramSource(blocks: PreviewBlock[], options: SourceOptions) {
  const plan = libraryCanvasPlan(blocks)
  const api = globalThis as unknown as { MediaStreamTrackGenerator?: GeneratorConstructor; MediaStreamTrackProcessor?: ProcessorConstructor }
  if (!api.MediaStreamTrackGenerator || !api.MediaStreamTrackProcessor) throw Error('Multi-source canvas requires current Chromium frame generation.')
  const track = new api.MediaStreamTrackGenerator({ kind: 'video' })
  const worker = new Worker(new URL('./canvasProgramSource.worker.ts', import.meta.url), { type: 'module' })
  const media: { element: HTMLVideoElement; loop: boolean }[] = [], captured: MediaStream[] = [], bitmaps: ImageBitmap[] = []
  let audio: AudioContext | null = null, audioBus: MediaStreamAudioDestinationNode | null = null, stopped = false, error: string | null = null
  const stream = new MediaStream([track])
  const cleanup = () => {
    if (stopped) return
    stopped = true; track.stop(); worker.terminate()
    captured.forEach(source => source.getTracks().forEach(item => item.stop()))
    stream.getTracks().forEach(item => item.stop())
    media.forEach(({ element }) => { element.onended=null; element.pause(); element.removeAttribute('src'); element.load() })
    bitmaps.forEach(bitmap => bitmap.close()); if (audio) void audio.close()
  }
  let progress:{framesWritten:number;sourceFrames:Record<string,number>}={framesWritten:0,sourceFrames:{}}
  worker.onmessage = event => { if (event.data?.error) error = 'Canvas input frame generation stopped'; else if(event.data?.framesWritten)progress=event.data }
  worker.onerror = () => { error = 'Canvas input frame generation stopped' }
  try {
    const layers: { block: PreviewBlock; bitmap?: ImageBitmap; readable?: ReadableStream<VideoFrame> }[] = []
    const transfers: Transferable[] = [track.writable]
    for (const block of plan) {
      if (block.type === 'text') { layers.push({ block }); continue }
      const source = await options.resolveSource(block)
      if (block.type === 'video' || block.type === 'audio') {
        const element = document.createElement('video') as HTMLVideoElement & { captureStream: () => MediaStream }
        media.push({ element, loop: Boolean(block.loop) }); element.onended=()=>worker.postMessage({endedId:block.id}); element.src = source; element.loop = true; element.playsInline = true
        // Audio goes only to the private composition stream, never to local speakers.
        audio ??= new AudioContext()
        const input = audio.createMediaElementSource(element), gain = audio.createGain()
        gain.gain.value = block.mediaMuted ? 0 : Math.max(0, Math.min(1, block.mediaGain ?? 1))
        audioBus ??= audio.createMediaStreamDestination()
        input.connect(gain); gain.connect(audioBus)
        const loaded = new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => { element.onloadeddata = null; element.onerror = null; reject(Error('Canvas media load timed out')) }, 10000)
          element.onloadeddata = () => { clearTimeout(timer); resolve() }
          element.onerror = () => { clearTimeout(timer); reject(Error('Cannot decode a canvas file')) }
        })
        element.load(); await loaded; await element.play(); await audio.resume()
        if (block.type === 'video') {
          if (typeof element.captureStream !== 'function') throw Error('Canvas video capture requires current Chromium.')
          const native = element.captureStream(); captured.push(native)
          const video = native.getVideoTracks()[0]; if (!video) throw Error('Canvas video has no decoded picture.')
          const readable = new api.MediaStreamTrackProcessor({ track: video, maxBufferSize: 1 }).readable
          layers.push({ block, readable }); transfers.push(readable)
        }
      } else {
        const canvas = document.createElement('canvas'); canvas.width = 1920; canvas.height = 1080
        const context = canvas.getContext('2d')!
        if (block.type === 'pdf') {
          const pdf = await import('pdfjs-dist')
          pdf.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
          const task = pdf.getDocument({ url: source.split('#')[0] })
          try {
            const doc = await task.promise, page = await doc.getPage(block.pdfPage ?? 1), size = page.getViewport({ scale: 1 })
            const viewport = page.getViewport({ scale: Math.min(1920 / size.width, 1080 / size.height) })
            canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height)
            await renderProgramSlide(page, { canvas, canvasContext: canvas.getContext('2d')!, viewport })
          } finally { await task.destroy() }
        } else {
          const image = new Image(); image.src = source; await image.decode()
          const ratio = Math.min(1920 / image.width, 1080 / image.height)
          canvas.width = Math.max(1, Math.round(image.width * ratio)); canvas.height = Math.max(1, Math.round(image.height * ratio))
          context.drawImage(image, 0, 0, canvas.width, canvas.height)
        }
        const bitmap = await createImageBitmap(canvas); bitmaps.push(bitmap); layers.push({ block, bitmap }); transfers.push(bitmap)
      }
    }
    // WebRTC publishes one mixed audio track alongside the one finished canvas.
    if (audioBus) { stream.addTrack(audioBus.stream.getAudioTracks()[0]); captured.push(audioBus.stream) }
    worker.postMessage({ layers, writable: track.writable }, transfers)
    return { stream, layerCount:plan.length, videoLayerCount:plan.filter(block=>block.type==='video').length, audioLayerCount:plan.filter(block=>block.type==='audio'||block.type==='video').length, get progress() { return progress }, get failure() { return error },
      async take() { await takePreparedMedia(media) },
      stop: cleanup,
    }
  } catch (failure) { cleanup(); throw failure }
}
