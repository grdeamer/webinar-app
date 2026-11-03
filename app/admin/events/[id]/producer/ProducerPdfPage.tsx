"use client"
import { useEffect, useRef, useState } from "react"

/** Render the selected PDF page instead of relying on a browser PDF plug-in. */
export default function ProducerPdfPage({ src, label }: { src: string; label: string }) {
  const canvas = useRef<HTMLCanvasElement | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let cancelled = false
    let dispose: (() => void) | undefined
    setReady(false); setError(null)
    async function render(): Promise<void> {
      const pdf = await import("pdfjs-dist")
      if (cancelled) return
      pdf.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString()
      const url = src.split("#")[0]
      const requestedPage = Number(src.match(/#page=(\d+)/)?.[1] ?? 1)
      const task = pdf.getDocument({ url })
      dispose = () => { void task.destroy() }
      const document = await task.promise
      if (cancelled) return
      const page = await document.getPage(Math.max(1, Math.min(document.numPages, requestedPage)))
      const element = canvas.current
      if (!element || cancelled) return
      const viewport = page.getViewport({ scale: Math.min(2, 1920 / page.getViewport({ scale: 1 }).width) })
      element.width = Math.ceil(viewport.width); element.height = Math.ceil(viewport.height)
      await page.render({ canvas: element, viewport }).promise
      if (!cancelled) setReady(true)
    }
    void render().catch(() => { if (!cancelled) setError("PDF could not be rendered. Check that the file is a valid, unencrypted PDF.") })
    return () => { cancelled = true; dispose?.() }
  }, [src])
  return <div className="flex h-full w-full items-center justify-center bg-white text-slate-950">
    <canvas ref={canvas} aria-label={label} className="max-h-full max-w-full object-contain" />
    {!ready ? <p role={error ? "alert" : "status"} className="absolute p-2 text-xs">{error ?? "Rendering PDF…"}</p> : null}
  </div>
}
