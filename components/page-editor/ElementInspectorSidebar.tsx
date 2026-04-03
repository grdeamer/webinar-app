"use client"

type EditorElement = {
  id: string
  element_type?: string
  content: string
  x: number
  y: number
  width?: number | null
  height?: number | null
  z_index?: number
  props?: Record<string, unknown>
}

type Props = {
  selectedElement: EditorElement | null
  isEditing: boolean
  updateElementProps: (id: string, patch: Record<string, unknown>) => void
}

export default function ElementInspectorSidebar({
  selectedElement,
  isEditing,
  updateElementProps,
}: Props) {
  if (!selectedElement || !isEditing) return null

  return (
    <aside className="w-[320px] border-r border-white/10 bg-slate-950/95 backdrop-blur-xl">
      <div className="p-6">
        <div className="text-xs uppercase tracking-[0.22em] text-white/40">
          Element Editor
        </div>

        <h3 className="mt-2 text-lg font-semibold capitalize">
          {selectedElement.element_type}
        </h3>

        <div className="mt-6 space-y-4">
          {selectedElement.element_type === "image" && (
            <>
              <div>
                <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                  Upload Image
                </div>

                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return

                    const formData = new FormData()
                    formData.append("file", file)

                    const res = await fetch("/api/admin/page-editor/upload-image", {
                      method: "POST",
                      body: formData,
                    })

                    const data = await res.json()

                    if (data?.url) {
                      updateElementProps(selectedElement.id, {
                        src: data.url,
                      })
                    }
                  }}
                  className="block w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"
                />
              </div>

              <div>
                <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                  Image URL
                </div>

                <input
                  value={String(selectedElement.props?.src ?? "")}
                  onChange={(e) =>
                    updateElementProps(selectedElement.id, {
                      src: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  )
}