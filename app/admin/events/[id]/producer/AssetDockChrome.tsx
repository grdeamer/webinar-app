import type { JSX, ReactNode } from "react"

function ShortcutPill({
  keyLabel,
  action,
}: {
  keyLabel: string
  action: string
}): JSX.Element {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.035] px-2 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <span className="rounded-md border border-white/10 bg-black/35 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-white/80">
        {keyLabel}
      </span>
      <span className="text-[9px] font-black uppercase tracking-[0.12em] text-white/45">
        {action}
      </span>
    </div>
  )
}

export function KeyboardShortcutsPanel(): JSX.Element {
  return (
    <div className="hidden xl:flex items-center gap-1.5 rounded-full border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] px-2 py-1 shadow-[0_0_20px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.05)]">
      <span className="mr-1 text-[9px] font-black uppercase tracking-[0.18em] text-white/35">
        Hotkeys
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
    <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-white/10 bg-black/25 px-2 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="flex items-center gap-1.5 rounded-full border border-emerald-300/15 bg-emerald-400/8 px-2 py-1">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_9px_rgba(110,231,183,0.85)]" />
        <span className="text-[9px] font-black uppercase tracking-[0.16em] text-emerald-100/75">
          Preview
        </span>
      </div>

      <div className="flex items-center gap-1.5 rounded-full border border-red-300/18 bg-red-400/10 px-2 py-1">
        <span className="h-1.5 w-1.5 rounded-full bg-red-300 shadow-[0_0_10px_rgba(252,165,165,0.9)]" />
        <span className="text-[9px] font-black uppercase tracking-[0.16em] text-red-100/80">
          Program
        </span>
      </div>
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
    <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.018))] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.055),0_18px_44px_rgba(0,0,0,0.18)]">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/40">
          {title}
        </div>
        <span className="rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white/45">
          {count}
        </span>
      </div>

      {children}
    </div>
  )
}