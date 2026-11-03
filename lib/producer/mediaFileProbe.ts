import { validateProducerMedia } from "./mediaAssets"

/** Decode locally before saving; file extensions alone do not prove codec support. */
export async function checkProducerMediaFile(file: File): Promise<void> {
  const kind = validateProducerMedia(file.type, file.size)
  if (kind === "pdf") return // The PDF canvas reports document/page errors when opened.
  const url = URL.createObjectURL(file)
  try {
    if (kind === "image") {
      const image = new Image(); image.src = url
      await image.decode()
      if (image.naturalWidth * image.naturalHeight > 32_000_000) throw new Error("Image exceeds the 32-megapixel limit")
      return
    }
    const element = document.createElement(kind === "audio" ? "audio" : "video")
    element.muted = true
    element.preload = "auto"
    try {
      await new Promise<void>((resolve, reject) => {
        const timer = window.setTimeout(() => { cleanup(); reject(new Error("Source decoding timed out. Try H.264/AAC MP4, WebM, MP3 or WAV.")) }, 10_000)
        function cleanup(): void { clearTimeout(timer); element.onloadeddata = null; element.onerror = null }
        element.onloadeddata = () => { cleanup(); resolve() }
        element.onerror = () => { cleanup(); reject(new Error("This browser cannot decode this source. Try H.264/AAC MP4, WebM, MP3 or WAV.")) }
        element.src = url
        element.load()
      })
    } finally { element.removeAttribute("src"); element.load() }
  } finally { URL.revokeObjectURL(url) }
}
