import type { Metadata } from "next"
import Image from "next/image"
import { Download } from "lucide-react"
import { telescopeRelease } from "@/lib/telescope-download"

export const metadata: Metadata = { title: "Downloads" }

export default function DownloadsPage() {
  return (
    <section className="mx-auto max-w-4xl space-y-6 py-3">
      <header className="border-b border-current/15 pb-5">
        <h1 className="text-2xl font-semibold tracking-tight">Downloads</h1>
      </header>

      <article className="flex flex-col items-start gap-6 border-b border-current/15 pb-7 sm:flex-row sm:items-center">
        <Image
          src="/downloads/telescope-observatory.png"
          alt=""
          width={116}
          height={116}
          priority
          className="shrink-0"
        />
        <div className="min-w-0 flex-1 space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">Jupiter Telescope</h2>
          <p className="max-w-md text-sm opacity-70">
            Compose scenes, mix audio, and send your program to Zoom or Jupiter Io.
          </p>
          <p className="text-sm opacity-70">Version {telescopeRelease.version} · Apple Silicon · macOS 15 or later</p>
        </div>
        <a
          href={telescopeRelease.href}
          download={telescopeRelease.filename}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#284fc6] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2043ad] focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          <Download size={16} aria-hidden="true" />
          Download for Mac
        </a>
      </article>

      <p className="text-sm opacity-70">
        Open the signed installer on your Mac. For Zoom, open Telescope and choose Outputs → Set Up Zoom.
      </p>
    </section>
  )
}
