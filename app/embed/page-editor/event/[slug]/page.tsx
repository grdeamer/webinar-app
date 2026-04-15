import AdminEventPageEditorPreview from "@/components/page-editor/AdminEventPageEditorPreview"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export default function EmbeddedPageBuilder(props: {
  params: { slug: string }
}) {
  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-950">
      <AdminEventPageEditorPreview />
    </div>
  )
}