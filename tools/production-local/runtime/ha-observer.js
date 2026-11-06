import { classifySourceColor } from './ha-provenance.js'
import { LK, connect, jsonFetch, status } from './common.js'
import { MARKER_SIZE, MARKER_WIDTH, readMarkerPixels } from './marker.js'

export async function runHaObserver() {
  if (!window.MediaStreamTrackProcessor) throw new Error('The local receiver requires decoded-frame processing support')
  const video = document.createElement('video'); video.muted = true; video.autoplay = true; video.playsInline = true
  document.getElementById('media').append(video)
  const stream = new MediaStream(); video.srcObject = stream
  function probe() {
    const surface = document.createElement('canvas'); surface.width = MARKER_WIDTH; surface.height = MARKER_SIZE * 3
    return surface.getContext('2d', { willReadFrequently: true })
  }
  const presentedContext = probe()
  let decoderWorker = null, decoderTrack = null, processor = null
  const diagnosticTotals = { nativeMarkerReads: 0, canvasMarkerReads: 0, invalidFrames: 0, duplicateFrames: 0, markerSkipped: 0, processingTotalMs: 0, processingMaxMs: 0 }
  function closeDecoder() { decoderWorker?.postMessage({stop:true}); decoderWorker?.terminate(); decoderWorker=null; decoderTrack?.stop(); decoderTrack=null; processor=null }
  const pixel = document.createElement('canvas'); pixel.width = 3; pixel.height = 1
  const pixelContext = pixel.getContext('2d', { willReadFrequently: true })
  function markers(ctx, image, width, height) {
    const scale = width / 1280
    for (const [row, y] of [0, height - MARKER_SIZE * scale, height - MARKER_SIZE * scale * 2].entries()) ctx.drawImage(image, 0, y, MARKER_WIDTH * scale, MARKER_SIZE * scale, 0, row * MARKER_SIZE, MARKER_WIDTH, MARKER_SIZE)
    const data = ctx.getImageData(0, 0, MARKER_WIDTH, MARKER_SIZE * 3).data, size = MARKER_WIDTH * MARKER_SIZE * 4
    const authority = readMarkerPixels(data.subarray(0, size)), program = readMarkerPixels(data.subarray(size, size * 2)), provenance = readMarkerPixels(data.subarray(size * 2))
    return { authority, program, candidate: authority?.frame === 1 ? 'primary' : authority?.frame === 2 ? 'standby' : null, contentCandidate: provenance?.revision === 1 ? 'primary' : provenance?.revision === 2 ? 'standby' : null }
  }
  const audio = new AudioContext(); await audio.resume()
  const silent = audio.createGain(); silent.gain.value = 0; silent.connect(audio.destination)
  let remoteVideo = null, analyser = null, node = null, epoch = 0, pending = false, stopped = false, decodedSelection = null
  const report = { role: 'observer', frames: 0, validFrames: 0, presentedFrames: 0, presentationCallbacks: 0, presentationDropped: 0, generation: 0, candidate: null, revision: null, lastGoodAtMs: 0, lastAudibleAtMs: 0, maxVideoGapMs: 0, maxAudioGapMs: 0, audioRms: 0, sampledRgb: [], canvasRgb: [], dominantHz: 0, contentSource: null, contentCandidate: null, selectionMismatches: 0, invalidSinceMs: 0, maxSlateMs: 0, gapHistory: [], resolutionChanges: 0, videoTrackSid: null, audioTrackSid: null, publisher: null, width: 0, height: 0, rtc: null, lastSelection: null, processingError: null, observerTransport: 'dedicated-frame-worker', processorMaxBufferSize: 8 }
  const { room } = await connect('ha-observer', (track, publication, participant) => {
    const next = Number(participant.identity.split('-').at(-1))
    if (!/^program-engine-\d+$/.test(participant.identity) || next < epoch) return
    if (next > epoch) { epoch = next; for (const old of stream.getTracks()) stream.removeTrack(old); node?.disconnect(); analyser = null; report.videoTrackSid = null; report.audioTrackSid = null; decodedSelection = null }
    report.publisher = participant.identity
    for (const old of stream.getTracks()) if (old.kind === track.mediaStreamTrack.kind) stream.removeTrack(old)
    stream.addTrack(track.mediaStreamTrack); video.play().catch(() => {})
    if (track.kind === LK.Track.Kind.Audio) {
      report.audioTrackSid = publication.trackSid
      const playback = track.attach(); playback.muted = true; playback.play().catch(() => {})
      node?.disconnect(); node = audio.createMediaStreamSource(new MediaStream([track.mediaStreamTrack])); analyser = audio.createAnalyser(); node.connect(analyser).connect(silent)
    } else {
      report.videoTrackSid = publication.trackSid; remoteVideo = track
      closeDecoder()
      decoderTrack=track.mediaStreamTrack.clone()
      processor=new window.MediaStreamTrackProcessor({track:decoderTrack,maxBufferSize:8})
      const worker=new Worker(new URL('./observer-frame-worker.js',import.meta.url),{type:'module'});decoderWorker=worker
      const before={frames:0,validFrames:0,selectionMismatches:0,nativeMarkerReads:0,canvasMarkerReads:0,invalidFrames:0,duplicateFrames:0,markerSkipped:0,processingTotalMs:0}
      worker.onmessage=event=>{
        if(stopped||decoderWorker!==worker)return
        const x=event.data
        if(x.error){report.processingError=x.error;return}
        for(const field of ['frames','validFrames','selectionMismatches']){report[field]+=x[field]-before[field];before[field]=x[field]}
        for(const field of ['nativeMarkerReads','canvasMarkerReads','invalidFrames','duplicateFrames','markerSkipped','processingTotalMs']){diagnosticTotals[field]+=x[field]-before[field];before[field]=x[field]}
        diagnosticTotals.processingMaxMs=Math.max(diagnosticTotals.processingMaxMs,x.processingMaxMs)
        decodedSelection=x.selection
      }
      worker.onerror=()=>{if(decoderWorker===worker&&!stopped)report.processingError='Decoded-frame validation worker failed'}
      worker.postMessage({readable:processor.readable},[processor.readable])
    }
  })
  room.on(LK.RoomEvent.TrackUnsubscribed, (track, publication) => { stream.removeTrack(track.mediaStreamTrack); if (report.videoTrackSid === publication.trackSid) { report.videoTrackSid = null; closeDecoder() }; if (report.audioTrackSid === publication.trackSid) { report.audioTrackSid = null; node?.disconnect(); analyser = null } })
  const presented = (now, metadata) => {
    report.presentationCallbacks++; report.presentedFrames = metadata.presentedFrames
    report.presentationDropped = video.getVideoPlaybackQuality().droppedVideoFrames
    if (video.videoWidth) {
      if (report.width !== video.videoWidth || report.height !== video.videoHeight) report.resolutionChanges++
      report.width = video.videoWidth; report.height = video.videoHeight
      // Inspect selection only on a transition; expensive canvas readbacks no longer consume every presentation callback.
      if (decodedSelection && (decodedSelection.generation !== report.generation || decodedSelection.candidate !== report.candidate || decodedSelection.revision !== report.revision)) {
        const m = markers(presentedContext, video, video.videoWidth, video.videoHeight), time = Date.now()
        const changed = report.generation !== (m.authority?.revision || 0) || report.candidate !== m.candidate
        report.contentCandidate = m.contentCandidate; report.candidate = m.candidate; report.generation = m.authority?.revision || 0; report.revision = m.candidate ? m.program?.revision ?? null : null
        if (changed && m.candidate) {
          report.lastSelection = { generation: report.generation, candidate: m.candidate, revision: m.program?.revision ?? null, firstDecodedAtMs: decodedSelection.firstDecodedAtMs, firstPresentedAtMs: time, previousGoodAtMs: report.lastGoodAtMs, videoGapMs: report.lastGoodAtMs ? time - report.lastGoodAtMs : 0, firstAudibleAtMs: null }
          if (report.invalidSinceMs) report.maxSlateMs = Math.max(report.maxSlateMs, time - report.invalidSinceMs)
          report.invalidSinceMs = 0
        }
        if (!m.candidate && !report.invalidSinceMs) report.invalidSinceMs = time
      }
      if (report.candidate) {
        const time = Date.now(), gap = report.lastGoodAtMs ? time - report.lastGoodAtMs : 0
        if (gap > 200) { report.gapHistory.push({ fromMs: report.lastGoodAtMs, toMs: time, gapMs: gap, generation: report.generation }); if (report.gapHistory.length > 200) report.gapHistory.shift() }
        report.maxVideoGapMs = Math.max(report.maxVideoGapMs, gap); report.lastGoodAtMs = time
      }
    }
    video.requestVideoFrameCallback(presented)
  }
  video.requestVideoFrameCallback(presented)
  const timer = setInterval(async () => {
    if (pending) return; pending = true
    try {
      if(video.videoWidth&&report.candidate){
        const points=[[video.videoWidth*.75,video.videoHeight*.3],[1500,300],[150,900]]
        points.forEach(([x,y],index)=>pixelContext.drawImage(video,x,y,1,1,index,0,1,1))
        const data=pixelContext.getImageData(0,0,3,1).data
        report.sampledRgb=[...data.slice(0,3)];report.canvasRgb=[...data.slice(4,7),...data.slice(8,11)]
        report.contentSource=classifySourceColor(...report.sampledRgb)
      }
      const values = new Float32Array(analyser?.fftSize || 2048); analyser?.getFloatTimeDomainData(values)
      report.audioRms = Math.sqrt(values.reduce((sum, n) => sum + n * n, 0) / values.length)
      if (analyser) { const bins = new Float32Array(analyser.frequencyBinCount); analyser.getFloatFrequencyData(bins); let peak = 0; for (let i = 1; i < bins.length; i++) if (bins[i] > bins[peak]) peak = i; report.dominantHz = peak * audio.sampleRate / analyser.fftSize }
      if (report.audioRms > .0005) { if (report.lastSelection && report.lastSelection.firstAudibleAtMs === null) report.lastSelection.firstAudibleAtMs = Date.now(); if (report.lastAudibleAtMs) report.maxAudioGapMs = Math.max(report.maxAudioGapMs, Date.now() - report.lastAudibleAtMs); report.lastAudibleAtMs = Date.now() }
      const stats = await remoteVideo?.getRTCStatsReport()
      stats?.forEach(s => { if (s.type === 'inbound-rtp' && s.kind === 'video') report.rtc = { framesDecoded: s.framesDecoded, framesDropped: s.framesDropped, bytesReceived: s.bytesReceived, packetsLost: s.packetsLost, jitter: s.jitter, framesPerSecond: s.framesPerSecond, freezeCount: s.freezeCount, totalDecodeTime: s.totalDecodeTime, codec: stats.get(s.codecId)?.mimeType ?? null } })
      await jsonFetch('/api/ha/report', { ...report, ...diagnosticTotals, processorDiscardedFrames: Number.isSafeInteger(processor?.discardedFrames)?processor.discardedFrames:null })
    } catch { /* Metadata only; no media files or recordings. */ }
    finally { pending = false }
  }, 100)
  status('Independent receiver measures decoded unique frames separately from presentation counters and actual displayed takeover')
  window.stopHaObserver = async () => { stopped = true; clearInterval(timer); closeDecoder(); await room.disconnect(); await audio.close() }
}
