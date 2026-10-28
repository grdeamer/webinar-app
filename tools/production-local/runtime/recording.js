import { capability } from './common.js'

/** Records only the subscribed Program tracks, never another composition. */
export function receivedProgramRecorder(stream) {
  let recorder = null; let job = null; let upload = Promise.resolve(); let sequence = 0; let stopTimer = null
  function stop() { if (recorder?.state === 'recording') recorder.stop() }
  function start(next) {
    if (stream.getVideoTracks().length !== 1 || stream.getAudioTracks().length !== 1) throw new Error('Recording needs the received Program video and audio')
    job = next; sequence = 0; upload = Promise.resolve()
    const recordingId = next.id
    recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8,opus', videoBitsPerSecond: 2_000_000 })
    recorder.ondataavailable = event => {
      if (!event.data.size) return
      const index = sequence++
      upload = upload.then(async () => {
        const response = await fetch(`/api/media/recording-chunk?id=${recordingId}&sequence=${index}`, { method: 'POST', headers: { 'X-Runtime-Capability': capability }, body: event.data })
        if (!response.ok) throw new Error('Recording upload failed')
      })
      upload.catch(() => stop())
    }
    recorder.onstop = () => {
      clearTimeout(stopTimer)
      upload = upload.then(async () => {
        const response = await fetch(`/api/media/recording-chunk?id=${recordingId}&finish=true`, { method: 'POST', headers: { 'X-Runtime-Capability': capability } })
        if (!response.ok) throw new Error('Recording did not finalize')
      })
      upload.catch(() => {})
    }
    recorder.start(1000); stopTimer = setTimeout(stop, 180_000)
  }
  return {
    update(next, requestedStop) {
      if (next?.status === 'recording' && next.id !== job?.id) start(next)
      if (requestedStop || next?.status !== 'recording') stop()
    },
    stop,
    async wait() { stop(); await upload },
  }
}
