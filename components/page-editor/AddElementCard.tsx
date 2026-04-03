"use client"

type AddableElementType = "text" | "image" | "pdf" | "button" | "spacer"

type Props = {
  addElementOpen: boolean
  setAddElementOpen: React.Dispatch<React.SetStateAction<boolean>>
  addElement: (type: AddableElementType) => void
  SectionPanelHeader: React.ComponentType<{
    title: string
    open: boolean
    onToggle: () => void
  }>
}

export default function AddElementCard({
  addElementOpen,
  setAddElementOpen,
  addElement,
  SectionPanelHeader,
}: Props) {
  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
      <SectionPanelHeader
        title="Add Element"
        open={addElementOpen}
        onToggle={() => setAddElementOpen((v) => !v)}
      />

      {addElementOpen && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button
            onClick={() => addElement("text")}
            className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-white hover:bg-white/5"
          >
            Text
          </button>
          <button
            onClick={() => addElement("image")}
            className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-white hover:bg-white/5"
          >
            Image
          </button>
          <button
            onClick={() => addElement("pdf")}
            className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-white hover:bg-white/5"
          >
            PDF
          </button>
          <button
            onClick={() => addElement("button")}
            className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-white hover:bg-white/5"
          >
            Button
          </button>
          <button
            onClick={() => addElement("spacer")}
            className="col-span-2 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-white hover:bg-white/5"
          >
            Spacer
          </button>
        </div>
      )}
    </div>
  )
}