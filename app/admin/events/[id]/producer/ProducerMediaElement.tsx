"use client"
import { useEffect, useRef, useState } from "react"
import type { PreviewBlock } from "./useProducerBlocks"
/** Preview monitoring is muted; only the committed Program starts playback automatically. */
export default function ProducerMediaElement({ block, program = false }: { block: PreviewBlock; program?: boolean }) {
  const ref = useRef<HTMLMediaElement | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    if (program) void element.play().catch(() => setError("Click Play to enable local playback in this browser."))
    else element.pause()
    return () => element.pause()
  }, [block.src, program])
  useEffect(() => {
    const element = ref.current
    if (!element) return
    element.muted = !program || Boolean(block.mediaMuted)
    element.volume = Math.max(0, Math.min(1, block.mediaGain ?? 1))
  }, [block.mediaMuted, block.mediaGain, program])
  const props = { muted: !program || Boolean(block.mediaMuted), src: block.src ?? "", loop: block.loop, controls: true, preload: "metadata", onError: () => setError("This browser could not decode the source. Try H.264/AAC MP4, WebM, MP3 or WAV."), onPlaying: () => setError(null), "aria-label": block.label || "Media source" }
  return <div className={`flex h-full w-full flex-col justify-center text-white ${block.type === "audio" ? "bg-transparent" : "bg-black"}`}>
    {block.type === "audio" ? <audio {...props} controls={!program || Boolean(error)} ref={element => { ref.current = element }} className="w-full" /> : <video {...props} ref={element => { ref.current = element }} playsInline className="min-h-0 w-full flex-1 object-contain" />}
    {error ? <p role="alert" className="p-2 text-xs text-amber-200">{error}</p> : null}
  </div>
}
