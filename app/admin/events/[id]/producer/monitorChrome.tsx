import type { JSX, ReactNode } from "react"

type MonitorBadgeTone = "live" | "preview" | "confidence" | "default"

type StatusPillTone =
  | "live"
  | "preview"
  | "confidence"
  | "primary"
  | "pinned"
  | "screen"
  | "default"

type MonitorBadgeProps = {
  label: string
  tone?: MonitorBadgeTone
}

export function MonitorBadge({
  label,
  tone = "default",
}: MonitorBadgeProps): JSX.Element {
  const toneClass =
    tone === "live"
      ? "border-red-300/16 bg-red-500/[0.08] text-red-100/62 shadow-[0_0_10px_rgba(248,113,113,0.08)]"
      : tone === "preview"
        ? "border-sky-300/16 bg-sky-500/[0.08] text-sky-100/62 shadow-[0_0_10px_rgba(56,189,248,0.07)]"
        : tone === "confidence"
          ? "border-violet-300/16 bg-violet-500/[0.08] text-violet-100/62 shadow-[0_0_10px_rgba(167,139,250,0.07)]"
          : "border-white/8 bg-black/22 text-white/38"

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] backdrop-blur-md ${toneClass}`}
    >
      {label}
    </span>
  )
}

type StatusPillProps = {
  label: string
  tone?: StatusPillTone
}

export function StatusPill({
  label,
  tone = "default",
}: StatusPillProps): JSX.Element {
  const toneClass =
    tone === "live"
      ? "border-red-300/16 bg-red-500/[0.08] text-red-100/62 shadow-[0_0_8px_rgba(248,113,113,0.06)]"
      : tone === "preview"
        ? "border-sky-300/16 bg-sky-500/[0.08] text-sky-100/62 shadow-[0_0_8px_rgba(56,189,248,0.06)]"
        : tone === "confidence"
          ? "border-violet-300/16 bg-violet-500/[0.08] text-violet-100/62 shadow-[0_0_8px_rgba(167,139,250,0.06)]"
          : tone === "primary"
            ? "border-emerald-300/16 bg-emerald-500/[0.08] text-emerald-100/62 shadow-[0_0_8px_rgba(110,231,183,0.06)]"
            : tone === "pinned"
              ? "border-amber-300/16 bg-amber-500/[0.08] text-amber-100/62 shadow-[0_0_8px_rgba(251,191,36,0.06)]"
              : tone === "screen"
                ? "border-cyan-300/16 bg-cyan-500/[0.08] text-cyan-100/62 shadow-[0_0_8px_rgba(103,232,249,0.06)]"
                : "border-white/8 bg-black/22 text-white/40"

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] backdrop-blur-md ${toneClass}`}
    >
      {label}
    </span>
  )
}


type RoutedMonitorFrameProps = {
  children: ReactNode
  mode?: "program" | "preview" | "confidence"
}

type MonitorCornerLabelProps = {
  label: string
}

function MonitorCornerLabel({ label }: MonitorCornerLabelProps): JSX.Element {
  return (
    <div className="pointer-events-none absolute left-4 bottom-4 z-20 rounded-full border border-white/8 bg-black/24 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-white/30 backdrop-blur-md">
      {label}
    </div>
  )
}

export function RoutedMonitorFrame({
  children,
  mode = "program",
}: RoutedMonitorFrameProps): JSX.Element {
  const ringClass =
    mode === "program"
      ? "ring-red-400/22"
      : mode === "preview"
        ? "ring-sky-400/22"
        : "ring-violet-400/22"

  const glowClass =
    mode === "program"
      ? "from-red-400/10 via-red-300/3"
      : mode === "preview"
        ? "from-sky-400/10 via-sky-300/3"
        : "from-violet-400/10 via-violet-300/3"

  const pulseClass =
    mode === "program"
      ? "shadow-red-500/10"
      : mode === "preview"
        ? "shadow-sky-500/8"
        : "shadow-violet-500/8"

  const edgePulseClass =
    mode === "program"
      ? "border-red-300/14 shadow-[0_0_18px_rgba(248,113,113,0.08)]"
      : mode === "preview"
        ? "border-sky-300/12 shadow-[0_0_16px_rgba(56,189,248,0.06)]"
        : "border-violet-300/12 shadow-[0_0_16px_rgba(167,139,250,0.06)]"

  const tallyToneClass =
    mode === "program"
      ? "bg-red-400/75 shadow-[0_0_6px_rgba(248,113,113,0.28)]"
      : mode === "preview"
        ? "bg-sky-300/75 shadow-[0_0_6px_rgba(56,189,248,0.24)]"
        : "bg-violet-300/75 shadow-[0_0_6px_rgba(167,139,250,0.24)]"

  return (
    <div
      className={`group relative overflow-hidden rounded-[24px] border border-white/8 bg-[#020308] opacity-0 shadow-[0_22px_72px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.04),inset_0_-18px_40px_rgba(0,0,0,0.58)] ring-1 transition-all duration-700 animate-[monitorBoot_700ms_ease-out_forwards] ${ringClass} ${pulseClass}`}
    >
      <div className="pointer-events-none absolute inset-0 z-30 bg-white/10 opacity-0 animate-[monitorFlash_900ms_ease-out]" />
      <div
        className={`pointer-events-none absolute inset-0 z-10 rounded-[28px] border opacity-70 ${edgePulseClass} ${mode === "program" ? "animate-pulse" : ""}`}
      />
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${glowClass} to-transparent`}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.075),transparent_34%),radial-gradient(circle_at_50%_105%,rgba(0,0,0,0.78),transparent_44%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.035),transparent_18%,transparent_56%,rgba(255,255,255,0.014)_72%,transparent_88%)] opacity-28 mix-blend-screen" />
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(to_bottom,rgba(255,255,255,0.025)_0px,rgba(255,255,255,0.025)_1px,transparent_1px,transparent_7px)] opacity-[0.06]" />
      <div className="pointer-events-none absolute inset-0 rounded-[24px] border border-white/6 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.022),inset_0_0_18px_rgba(255,255,255,0.018)]" />

      <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_center,transparent_48%,rgba(0,0,0,0.22)_100%)]" />

      <div className="pointer-events-none absolute left-3 top-3 z-20 flex items-center gap-2">
        <MonitorBadge
          label={
            mode === "program"
              ? "Program"
              : mode === "preview"
                ? "Preview"
                : "Confidence"
          }
          tone={
            mode === "program"
              ? "live"
              : mode === "preview"
                ? "preview"
                : "confidence"
          }
        />
        <StatusPill label="Routed" />

        <div className="flex items-center gap-1 rounded-full border border-white/8 bg-black/24 px-2 py-1 backdrop-blur-md">
          <span
            className={`h-1.5 w-1.5 rounded-full ${tallyToneClass} ${mode === "program" ? "animate-pulse" : ""}`}
          />
          <span className="text-[8px] font-black uppercase tracking-[0.14em] text-white/30">
            {mode === "program"
              ? "Live"
              : mode === "preview"
                ? "Ready"
                : "Confidence"}
          </span>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-3 right-3 z-20 flex items-center gap-1.5 rounded-full border border-white/8 bg-black/24 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white/32 backdrop-blur-md">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300/45" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-300/85 shadow-[0_0_10px_rgba(110,231,183,0.7)]" />
        </span>
        Sync Stable
      </div>

      <div className="pointer-events-none absolute right-4 top-4 z-20 hidden items-center gap-1.5 rounded-full border border-white/8 bg-black/24 px-2.5 py-1 backdrop-blur-md 2xl:flex">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-300/75 shadow-[0_0_5px_rgba(110,231,183,0.28)]" />
        <span className="text-[8px] font-black uppercase tracking-[0.14em] text-white/26">
          HDR
        </span>
      </div>
      <MonitorCornerLabel
        label={
          mode === "program"
            ? "Broadcast"
            : mode === "preview"
              ? "Standby"
              : "Confidence"
        }
      />
      {children}
      <div className="pointer-events-none absolute inset-0 z-10 rounded-[28px] ring-1 ring-inset ring-white/6" />
      <div className="pointer-events-none absolute inset-x-6 bottom-0 z-10 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      <div className="pointer-events-none absolute inset-x-10 bottom-2 z-10 h-[1px] bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      <MonitorChromeKeyframes />
    </div>
  )
}

type EmptyMonitorStateProps = {
  title: string
  subtitle: string
}

export function EmptyMonitorState({
  title,
  subtitle,
}: EmptyMonitorStateProps): JSX.Element {
  return (
    <div className="relative flex min-h-[320px] items-center justify-center overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.12),transparent_34%),linear-gradient(180deg,#050816,#02040b)] shadow-[0_30px_120px_rgba(0,0,0,0.58),inset_0_1px_0_rgba(255,255,255,0.05)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.06),transparent_24%,transparent_68%,rgba(255,255,255,0.035)_82%,transparent_100%)] opacity-70" />
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(to_bottom,rgba(255,255,255,0.02)_0px,rgba(255,255,255,0.02)_1px,transparent_1px,transparent_6px)] opacity-[0.18]" />

      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-black/40 shadow-[0_0_40px_rgba(56,189,248,0.12)] backdrop-blur-md">
          <div className="h-3 w-3 rounded-full bg-red-400/80 shadow-[0_0_18px_rgba(248,113,113,0.7)]" />
        </div>

        <div className="text-sm font-black uppercase tracking-[0.28em] text-white/82">
          {title}
        </div>

        <div className="mt-2 max-w-sm text-xs tracking-[0.14em] text-white/38">
          {subtitle}
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-4 right-4 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[9px] font-black uppercase tracking-[0.22em] text-white/42 backdrop-blur-md">
        No Signal
      </div>
    </div>
  )
}

export function CompactEmptySignal({ label }: { label: string }): JSX.Element {
  return (
    <div className="relative flex aspect-video min-h-[180px] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_50%_0%,rgba(248,113,113,0.10),transparent_34%),linear-gradient(180deg,#05070f,#020308)] text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(to_bottom,rgba(255,255,255,0.018)_0px,rgba(255,255,255,0.018)_1px,transparent_1px,transparent_6px)] opacity-40" />
      <div className="relative z-10 flex flex-col items-center gap-2 px-4">
        <div className="h-2.5 w-2.5 rounded-full bg-red-400/80 shadow-[0_0_16px_rgba(248,113,113,0.72)]" />
        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/46">
          {label}
        </div>
      </div>
    </div>
  )
}

export function MonitorChromeKeyframes(): JSX.Element {
  return (
    <style jsx global>{`
      @keyframes monitorBoot {
        0% {
          opacity: 0;
          transform: translateY(10px) scale(0.985);
          filter: brightness(1.35) blur(3px);
        }

        45% {
          opacity: 1;
          filter: brightness(1.08) blur(0px);
        }

        100% {
          opacity: 1;
          transform: translateY(0px) scale(1);
          filter: brightness(1);
        }
      }

      @keyframes monitorFlash {
        0% {
          opacity: 0.18;
        }

        100% {
          opacity: 0;
        }
      }
    `}</style>
  )
}