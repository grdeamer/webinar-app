import { Suspense } from "react"
import { notFound } from "next/navigation"
import AdminEventPageEditorPreview from "@/components/page-editor/AdminEventPageEditorPreview"

const sample: Parameters<typeof AdminEventPageEditorPreview>[0]["demoDocument"] = {
  revision: 0,
  sections: [],
  elements: [
    { id: "demo-title", element_type: "text", content: "Opening keynote", x: 150, y: 165, width: 430, height: 72, props: { fontSize: 42, fontWeight: 800, color: "#f4efff" } },
    { id: "demo-time", element_type: "text", content: "9:00 AM · Main stage", x: 150, y: 255, width: 300, height: 46, props: { fontSize: 22, color: "#c6adff" } },
  ],
}

export default function Page() {
  if (process.env.NODE_ENV !== "development") notFound()
  return <Suspense fallback={null}>
    <div className="h-dvh overflow-hidden bg-slate-950">
      <AdminEventPageEditorPreview eventSlug="local-builder-demo" demoDocument={sample} />
    </div>
  </Suspense>
}
