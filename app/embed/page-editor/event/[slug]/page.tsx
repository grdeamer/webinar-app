import AdminEventPageEditorPreview from "@/components/page-editor/AdminEventPageEditorPreview"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export default function EmbeddedPageBuilder() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-950">
      <AdminEventPageEditorPreview />
    </div>
  )
}
