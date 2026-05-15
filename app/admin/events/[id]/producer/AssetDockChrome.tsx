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
    <div className="flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.025] px-2 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">
      <span className="rounded-md border border-white/8 bg-black/28 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-white/68">
        {keyLabel}
      </span>
      <span className="text-[9px] font-black uppercase tracking-[0.12em] text-white/34">
        {action}
      </span>
    </div>
  )
}

export function KeyboardShortcutsPanel(): JSX.Element {
  return (
    <div className="hidden 2xl:flex items-center gap-1.5 rounded-full border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.014))] px-2 py-1 shadow-[0_0_12px_rgba(0,0,0,0.10),inset_0_1px_0_rgba(255,255,255,0.03)]">
      <span className="mr-1 text-[9px] font-black uppercase tracking-[0.18em] text-white/35">
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
    <div className="hidden xl:flex items-center gap-1.5 rounded-full border border-white/8 bg-black/18 px-2 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">
      <div className="flex items-center gap-1.5 rounded-full border border-emerald-300/10 bg-emerald-400/[0.06] px-2 py-1">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-300/75 shadow-[0_0_5px_rgba(110,231,183,0.34)]" />
        <span className="text-[9px] font-black uppercase tracking-[0.16em] text-emerald-100/58">
          Preview
        </span>
      </div>

      <div className="flex items-center gap-1.5 rounded-full border border-red-300/12 bg-red-400/[0.07] px-2 py-1">
        <span className="h-1.5 w-1.5 rounded-full bg-red-300/78 shadow-[0_0_5px_rgba(252,165,165,0.36)]" />
        <span className="text-[9px] font-black uppercase tracking-[0.16em] text-red-100/60">
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
      <Layers3 className="h-3.5 w-3.5" />
    ) : title === "Graphics" ? (
      <Shapes className="h-3.5 w-3.5" />
    ) : title === "Media" ? (
      <MonitorPlay className="h-3.5 w-3.5" />
    ) : (
      <Library className="h-3.5 w-3.5" />
    )

  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-white/32">
        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/8 bg-black/18 text-white/38 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">
          {icon}
        </span>
        <span>{title}</span>
      </div>

      <span className="rounded-full border border-white/8 bg-black/22 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white/34">
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
    <div className="rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.012))] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.035),0_12px_30px_rgba(0,0,0,0.14)]">
      <DockSectionHeader title={title} count={count} />

      {children}
    </div>
  )
}