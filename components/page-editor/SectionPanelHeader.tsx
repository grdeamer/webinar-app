type Props = {
  title: string
  open: boolean
  onToggle: () => void
}

export default function SectionPanelHeader({ title, open, onToggle }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between text-left"
    >
      <span className="text-sm font-semibold">{title}</span>
      <span className="text-xs text-white/45">{open ? "−" : "+"}</span>
    </button>
  )
}
