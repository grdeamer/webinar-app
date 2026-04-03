"use client"

type Props = {
  isMobilePreview: boolean
  gridSize: number
  saveMessage: string | null
  onSaveTemplate: () => void
  onSave: () => void
}

export default function EditorActionsCard({
  isMobilePreview,
  gridSize,
  saveMessage,
  onSaveTemplate,
  onSave,
}: Props) {
  return (
    <>
      <div className="text-xs uppercase tracking-[0.22em] text-white/40">
        Editor Panel
      </div>

      <h3 className="mt-2 text-xl font-semibold">Edit Event Page</h3>

      <p className="mt-2 text-sm text-white/65">
        Live preview is active. Dragging and resizing snap to an {gridSize}px grid.
      </p>

      <div className="mt-3 text-xs text-white/45">
        Preview mode: {isMobilePreview ? "Mobile" : "Desktop"}
      </div>

      <button
        onClick={onSaveTemplate}
        className="mt-6 w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold hover:bg-indigo-500"
      >
        Save Template
      </button>

      <button
        onClick={onSave}
        className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold hover:bg-emerald-500"
      >
        Save
      </button>

      {saveMessage && (
        <div className="mt-3 text-sm text-white/70">{saveMessage}</div>
      )}
    </>
  )
}