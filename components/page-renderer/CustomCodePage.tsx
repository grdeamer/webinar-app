import { createCustomCodeSource } from "@/lib/page-editor/customCode"

export default function CustomCodePage({
  html,
  css,
  title = "Custom event page",
  preview = false,
}: {
  html: string
  css: string
  title?: string
  preview?: boolean
}) {
  return (
    <iframe
      title={title}
      srcDoc={createCustomCodeSource(html, css)}
      sandbox=""
      className={`block w-full border-0 bg-white ${
        preview ? "h-[720px] rounded-2xl" : "min-h-screen"
      }`}
    />
  )
}
