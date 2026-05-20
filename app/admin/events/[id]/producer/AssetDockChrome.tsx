import type { JSX, ReactNode } from "react"
import { Layers3, Library, MonitorPlay, Shapes } from "lucide-react"

function ShortcutPill({
  keyLabel,
  action,
}: {
  keyLabel: string
  action: string
}): JSX.Element {
  return (
    <div className="flex items-center gap-1 rounded-full border border-white/5 bg-white/[0.012] px-1 py-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.012)]">
      <span className="rounded-md border border-white/5 bg-black/16 px-1 py-0.5 text-[7px] font-black uppercase tracking-[0.09em] text-white/40">
        {keyLabel}
      </span>
      <span className="text-[7px] font-black uppercase tracking-[0.09em] text-white/18">
        {action}
      </span>
    </div>
  )
}

export function KeyboardShortcutsPanel(): JSX.Element {
  return (
    <div className="hidden 2xl:flex items-center gap-1 rounded-full border border-white/5 bg-[linear-gradient(180deg,rgba(255,255,255,0.012),rgba(255,255,255,0.005))] px-1 py-0.5 shadow-[0_0_6px_rgba(0,0,0,0.045),inset_0_1px_0_rgba(255,255,255,0.012)]">
      <span className="mr-0.5 text-[7px] font-black uppercase tracking-[0.09em] text-white/18">
        Shortcuts
      </span>
      <ShortcutPill keyLabel="Space" action="Take" />
      <ShortcutPill keyLabel="1-9" action="Preview Scene" />
      <ShortcutPill keyLabel="⇧1-9" action="Take Scene" />
      <ShortcutPill keyLabel="G" action="Add Graphic" />
      <ShortcutPill keyLabel="Esc" action="Clear" />
    </div>
  )
}

export function TallyIndicators(): JSX.Element {
  return (
    <div className="hidden xl:flex items-center gap-1 rounded-full border border-white/5 bg-black/10 px-1 py-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.012)]">
      <div className="flex items-center gap-1 rounded-full border border-emerald-300/6 bg-emerald-400/[0.026] px-1 py-0.5">
        <span className="h-1 w-1 rounded-full bg-emerald-300/58 shadow-[0_0_4px_rgba(110,231,183,0.18)]" />
        <span className="text-[7px] font-black uppercase tracking-[0.09em] text-emerald-100/34">
          Preview
        </span>
      </div>

      <div className="flex items-center gap-1 rounded-full border border-red-300/7 bg-red-400/[0.030] px-1 py-0.5">
        <span className="h-1 w-1 rounded-full bg-red-300/60 shadow-[0_0_4px_rgba(252,165,165,0.18)]" />
        <span className="text-[7px] font-black uppercase tracking-[0.09em] text-red-100/36">
          Program
        </span>
      </div>
    </div>
  )
}

export function DockSectionHeader({
  title,
  count,
}: {
  title: string
  count: number
}): JSX.Element {
  const icon =
    title === "Scenes" ? (
      <Layers3 className="h-3 w-3" />
    ) : title === "Graphics" ? (
      <Shapes className="h-3 w-3" />
    ) : title === "Media" ? (
      <MonitorPlay className="h-3 w-3" />
    ) : (
      <Library className="h-3 w-3" />
    )

  return (
    <div className="mb-1.5 flex items-center justify-between gap-2">
      <div className="flex items-center gap-1 text-[7px] font-black uppercase tracking-[0.10em] text-white/18">
        <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full border border-white/5 bg-black/10 text-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.012)]">
          {icon}
        </span>
        <span>{title}</span>
      </div>

      <span className="rounded-full border border-white/5 bg-black/12 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.09em] text-white/18">
        {count}
      </span>
    </div>
  )
}
export function DockSection({
  title,
  count,
  children,
}: {
  title: string
  count: number
  children: ReactNode
}): JSX.Element {
  return (
    <div className="relative overflow-hidden rounded-[16px] border border-white/[0.045] bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.014),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.014),rgba(255,255,255,0.006))] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.016),0_6px_18px_rgba(0,0,0,0.075)] transition duration-300">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.005),transparent)] opacity-24" />

      <div className="relative z-10">
        <DockSectionHeader title={title} count={count} />

        {children}
      </div>
    </div>
  )
}