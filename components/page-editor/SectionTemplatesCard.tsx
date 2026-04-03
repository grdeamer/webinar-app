"use client"

type Props = {
  sectionTemplatesOpen: boolean
  setSectionTemplatesOpen: React.Dispatch<React.SetStateAction<boolean>>
  addSectionPreset: (type: any) => void
  SectionPanelHeader: React.ComponentType<{
    title: string
    open: boolean
    onToggle: () => void
  }>
  SECTION_TEMPLATE_OPTIONS: Array<{
    key: string
    title: string
    body: string
  }>
}

export default function SectionTemplatesCard({
  sectionTemplatesOpen,
  setSectionTemplatesOpen,
  addSectionPreset,
  SectionPanelHeader,
  SECTION_TEMPLATE_OPTIONS,
}: Props) {
  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
      <SectionPanelHeader
        title="Section Templates"
        open={sectionTemplatesOpen}
        onToggle={() => setSectionTemplatesOpen((v) => !v)}
      />

      {sectionTemplatesOpen && (
        <div className="mt-3 grid grid-cols-1 gap-3">
          {SECTION_TEMPLATE_OPTIONS.map((preset) => (
            <button
              key={preset.key}
              onClick={() => addSectionPreset(preset.key)}
              className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-left hover:bg-white/5"
            >
              <div className="text-sm font-semibold text-white">{preset.title}</div>
              <div className="mt-1 text-xs text-white/50">{preset.body}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}