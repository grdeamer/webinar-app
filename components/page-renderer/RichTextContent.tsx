import type { RichTextRun } from "@/lib/page-editor/richText"

export default function RichTextContent({ content, runs }: { content: string; runs: unknown }) {
  if (!Array.isArray(runs) || !runs.length) return content
  return runs.map((value, index) => {
    const run = value && typeof value === "object" ? value as RichTextRun : { text: String(value ?? "") }
    return <span key={index} style={{ fontWeight: run.bold ? 700 : undefined, fontStyle: run.italic ? "italic" : undefined, textDecoration: [run.underline ? "underline" : "", run.strike ? "line-through" : ""].filter(Boolean).join(" ") || undefined, color: typeof run.color === "string" ? run.color : undefined }}>{String(run.text ?? "")}</span>
  })
}
