"use client"

import { useEffect, useMemo, useState } from "react"
import type { JSX } from "react"
import {
  Activity,
  Archive,
  ChevronRight,
  Circle,
  Clock3,
  Cpu,
  Disc3,
  Gauge,
  Globe2,
  HardDrive,
  Radar,
  SatelliteDish,
  ShieldCheck,
  Signal,
  TimerReset,
  Users,
  Wand2,
  Wifi,
} from "lucide-react"

function TopDeckAtmosphere(): JSX.Element {
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-sky-300/4 via-violet-300/2 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.008)_42%,transparent_64%)] animate-[topDeckSignalSweep_18s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.028] bg-[repeating-linear-gradient(to_bottom,rgba(255,255,255,0.022)_0px,rgba(255,255,255,0.022)_1px,transparent_1px,transparent_8px)]" />
      <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-sky-200/12 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-28 bg-gradient-to-r from-sky-300/[0.026] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-28 bg-gradient-to-l from-violet-300/[0.026] to-transparent" />
    </>
  )
}

function StatusPill({
  icon,
  label,
  value,
  tone = "",
  pulse = false,
}: {
  icon: JSX.Element
  label: string
  value: string
  tone?: string
  pulse?: boolean
}) {
  return (
    <div
      className={[
        "relative z-10 flex items-center gap-2 overflow-hidden rounded-2xl border px-3 py-1.5",
        "bg-[linear-gradient(180deg,rgba(255,255,255,0.024),rgba(255,255,255,0.01))]",
        "shadow-[0_8px_24px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.026)]",
        tone,
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.008)_42%,transparent_64%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      <span className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-black/18 text-white/46">
        {pulse ? (
          <span className="absolute inset-1 rounded-lg bg-red-400/[0.045]" />
        ) : null}
        <span className="relative z-10">{icon}</span>
      </span>

      <div className="relative z-10 min-w-0">
        <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/24">
          {label}
        </div>
        <div className="truncate text-sm font-semibold text-white/66">
          {value}
        </div>
      </div>
    </div>
  )
}

function OpsChip({
  label,
  value,
  active = false,
  tone = "neutral",
}: {
  label: string
  value: string
  active?: boolean
  tone?: "neutral" | "record" | "iso" | "program"
}) {
  const activeClass =
    tone === "record"
      ? "border-red-300/12 bg-red-400/[0.06] text-red-100/50"
      : tone === "iso"
        ? "border-amber-300/12 bg-amber-400/[0.06] text-amber-100/50"
        : tone === "program"
          ? "border-sky-300/12 bg-sky-400/[0.06] text-sky-100/50"
          : "border-emerald-300/12 bg-emerald-400/[0.06] text-emerald-100/50"

  return (
    <div
      className={[
        "relative z-10 hidden items-center gap-1.5 overflow-hidden rounded-full border px-2 py-1 2xl:flex",
        active ? activeClass : "border-white/8 bg-white/[0.018] text-white/28",
      ].join(" ")}
    >
      <span
        className={[
          "h-1.5 w-1.5 rounded-full",
          active
            ? tone === "record"
              ? "bg-red-300/70 shadow-[0_0_5px_rgba(252,165,165,0.22)]"
              : tone === "iso"
                ? "bg-amber-300/70 shadow-[0_0_5px_rgba(252,211,77,0.20)]"
                : tone === "program"
                  ? "bg-sky-300/70 shadow-[0_0_5px_rgba(125,211,252,0.20)]"
                  : "bg-emerald-300/70 shadow-[0_0_5px_rgba(110,231,183,0.20)]"
            : "bg-white/22",
        ].join(" ")}
      />
      <span>{label}</span>
      <span className={active ? "text-white/58" : "text-white/36"}>
        {value}
      </span>
    </div>
  )
}

function DiagnosticSparkline({
  values,
}: {
  values: number[]
}): JSX.Element {
  return (
    <div className="flex h-6 items-end gap-0.5 rounded-xl border border-white/6 bg-black/16 px-1.5 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
      {values.map((value, index) => (
        <span
          key={`${value}-${index}`}
          className="w-1 rounded-full bg-emerald-300/36 shadow-[0_0_4px_rgba(110,231,183,0.16)] transition-all duration-500"
          style={{ height: `${Math.max(4, Math.min(20, value))}px` }}
        />
      ))}
    </div>
  )
}

function DiagnosticChip({
  label,
  value,
  tone = "neutral",
}: {
  label: string
  value: string
  tone?: "neutral" | "good" | "warn"
}): JSX.Element {
  const toneClass =
    tone === "good"
      ? "border-emerald-300/10 text-emerald-100/46"
      : tone === "warn"
        ? "border-amber-300/10 text-amber-100/46"
        : "border-white/6 text-white/30"

  return (
    <div
      className={`rounded-full border bg-black/16 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${toneClass}`}
    >
      <span className="text-white/20">{label}</span>{" "}
      <span className="text-white/44">{value}</span>
    </div>
  )
}

function TelemetryBadge({
  icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: JSX.Element
  label: string
  value: string
  tone?: "neutral" | "sky" | "green" | "amber"
}): JSX.Element {
  const toneClass =
    tone === "sky"
      ? "border-sky-300/10 bg-sky-400/[0.06] text-sky-100/50"
      : tone === "green"
        ? "border-emerald-300/10 bg-emerald-400/[0.06] text-emerald-100/50"
        : tone === "amber"
          ? "border-amber-300/10 bg-amber-400/[0.06] text-amber-100/50"
          : "border-white/8 bg-black/18 text-white/32"

  return (
    <div className={`relative z-10 flex items-center gap-2 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${toneClass}`}>
      <span className="opacity-56">{icon}</span>
      <span className="text-white/20">{label}</span>
      <span>{value}</span>
    </div>
  )
}

export default function ProducerTopDeck(): JSX.Element {
  const [viewers, setViewers] = useState(2458)
  const [signalBars, setSignalBars] = useState(4)
  const [latencyScore, setLatencyScore] = useState(18)
  const [confidence, setConfidence] = useState(99)
  const [storagePercent, setStoragePercent] = useState(68)
  const [isoCount, setIsoCount] = useState(3)

  const [bitrateMbps, setBitrateMbps] = useState(8.6)
  const [packetLoss, setPacketLoss] = useState(0.2)
  const [droppedFrames, setDroppedFrames] = useState(0)
  const [jitterMs, setJitterMs] = useState(4)
  const [diagnosticSamples, setDiagnosticSamples] = useState([
    10, 14, 12, 16, 15, 18, 14, 17, 19, 16, 18, 20,
  ])

  const [runtimeSeconds, setRuntimeSeconds] = useState(1727)
  const [recordingSeconds, setRecordingSeconds] = useState(1727)

  const runtime = useMemo(() => {
    const hours = Math.floor(runtimeSeconds / 3600)
    const minutes = Math.floor((runtimeSeconds % 3600) / 60)
    const seconds = runtimeSeconds % 60

    return [hours, minutes, seconds]
      .map((value) => String(value).padStart(2, "0"))
      .join(":")
  }, [runtimeSeconds])

  const recordingRuntime = useMemo(() => {
    const hours = Math.floor(recordingSeconds / 3600)
    const minutes = Math.floor((recordingSeconds % 3600) / 60)
    const seconds = recordingSeconds % 60

    return [hours, minutes, seconds]
      .map((value) => String(value).padStart(2, "0"))
      .join(":")
  }, [recordingSeconds])

  useEffect(() => {
    const id = setInterval(() => {
      setViewers((value) => Math.max(0, value + (Math.random() > 0.65 ? 1 : 0)))
      setRuntimeSeconds((value) => value + 1)
      setRecordingSeconds((value) => value + 1)
      setSignalBars(3 + Math.floor(Math.random() * 2))
      setLatencyScore(16 + Math.floor(Math.random() * 8))
      setConfidence(98 + Math.floor(Math.random() * 2))
      setStoragePercent((value) => Math.min(91, value + (Math.random() > 0.82 ? 1 : 0)))
      setIsoCount(3 + Math.floor(Math.random() * 2))
      const nextBitrate = Number((8.2 + Math.random() * 1.4).toFixed(1))
      const nextPacketLoss = Number((Math.random() * 0.5).toFixed(1))
      const nextJitter = 3 + Math.floor(Math.random() * 5)

      setBitrateMbps(nextBitrate)
      setPacketLoss(nextPacketLoss)
      setJitterMs(nextJitter)
      setDroppedFrames((value) => value + (Math.random() > 0.93 ? 1 : 0))
      setDiagnosticSamples((values) => [
        ...values.slice(1),
        Math.round(8 + nextBitrate + (6 - nextJitter) + Math.random() * 5),
      ])
    }, 1200)

    return () => clearInterval(id)
  }, [])

  const latencyLabel = latencyScore < 22 ? "Excellent" : "Good"

  return (
    <div className="group relative overflow-hidden rounded-[24px] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.04),transparent_28%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.04),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.008))] p-2 shadow-[0_16px_44px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.03)]">
      <TopDeckAtmosphere />
      <div className="relative z-10 mb-2 flex flex-wrap items-center justify-between gap-3 overflow-hidden rounded-[20px] border border-white/6 bg-black/14 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.008)_42%,transparent_64%)] animate-[topDeckSignalSweep_18s_ease-in-out_infinite]" />
        <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-sky-200/12 to-transparent" />
        <div className="relative z-10">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-white/22">
            Operations
          </div>

          <div className="mt-1 text-sm font-semibold tracking-tight text-white/66">
            Live production status
          </div>
        </div>

        <div className="relative z-10 hidden flex-wrap items-center gap-2 2xl:flex">
          <TelemetryBadge
            icon={<SatelliteDish size={11} />}
            label="Signal"
            value="Stable"
            tone="green"
          />

          <TelemetryBadge
            icon={<Globe2 size={11} />}
            label="Audience"
            value="Ready"
            tone="sky"
          />

          <TelemetryBadge
            icon={<Cpu size={11} />}
            label="System"
            value="Normal"
            tone="amber"
          />
        </div>
      </div>
      <div className="relative z-10 grid gap-2 xl:grid-cols-5 2xl:grid-cols-[1.15fr_1fr_1fr_1fr_1fr]">
        <StatusPill
          icon={
            <span className="relative flex items-center justify-center">
              <Disc3 size={15} className="text-red-300/75" />
              <Circle size={6} className="absolute fill-red-300/75 text-red-300/75" />
            </span>
          }
          label="Live Status"
          value="Live"
          tone="border-red-400/12 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.06),transparent_36%),rgba(255,255,255,0.018)]"
          pulse
        />

        <StatusPill
          icon={<Clock3 size={15} />}
          label="Runtime"
          value={runtime}
          tone="border-white/10 tabular-nums"
        />

        <StatusPill
          icon={<TimerReset size={15} className="text-red-200/80" />}
          label="Recording"
          value={recordingRuntime}
          tone="border-red-300/18 tabular-nums"
        />

        <StatusPill
          icon={<ShieldCheck size={15} />}
          label="Confidence"
          value={`${confidence}% ready`}
          tone="border-emerald-300/18"
        />

        <StatusPill
          icon={<Users size={15} />}
          label="Audience"
          value={`${viewers.toLocaleString()} connected`}
          tone="border-sky-400/18"
        />

        <StatusPill
          icon={<Signal size={15} />}
          label="Latency"
          value={`${latencyLabel} · ${latencyScore}ms`}
          tone="border-emerald-300/18"
        />
      </div>
      <div className="relative z-10 mt-2 flex items-center justify-between gap-3 overflow-hidden rounded-2xl border border-white/6 bg-black/14 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/28">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(16,185,129,0.014),transparent)] animate-[topDeckRouteSweep_14s_ease-in-out_infinite]" />
        <div className="relative z-10 flex min-w-0 items-center gap-3">
          <div className="flex items-center gap-2">
            <Wifi size={13} className="text-emerald-200/65" />
            Signal
          </div>
          <div className="hidden h-3 w-px bg-white/10 sm:block" />
          <div className="hidden min-w-0 items-center gap-1 truncate text-white/22 2xl:flex">
            <span>Session A1</span>
            <ChevronRight size={11} className="text-white/18" />
            <span>Program stable</span>
            <ChevronRight size={11} className="text-white/18" />
            <span>{isoCount} ISO feeds ready</span>
            <ChevronRight size={11} className="text-white/18" />
            <span>{confidence}% confidence</span>
            <ChevronRight size={11} className="text-white/18" />
            <span>{packetLoss.toFixed(1)}% packet loss</span>
          </div>
        </div>

        <div className="relative z-10 flex shrink-0 items-center gap-3">
          <div className="hidden items-center gap-1.5 lg:flex">
            <OpsChip label="REC" value={recordingRuntime} active tone="record" />
            <OpsChip label="ISO" value={`${isoCount} ready`} active tone="iso" />
            <OpsChip label="PGM" value="Stable" active tone="program" />
            <OpsChip label="Vault" value={`${storagePercent}%`} tone="neutral" />
          </div>
          <div className="hidden items-center gap-1.5 2xl:flex">
            <DiagnosticChip label="Loss" value={`${packetLoss.toFixed(1)}%`} tone="good" />
            <DiagnosticChip label="Drop" value={String(droppedFrames)} />
            <DiagnosticChip label="Jitter" value={`${jitterMs}ms`} tone="good" />
          </div>
          <span className="hidden text-[9px] tracking-[0.12em] text-emerald-100/24 2xl:inline">
            LIVE
          </span>
          <div className="flex items-end gap-1">
            {Array.from({ length: 4 }).map((_, index) => (
              <span
                key={index}
                className={[
                  "w-1.5 rounded-full transition-all duration-500",
                  index < signalBars
                    ? "bg-emerald-300/65 shadow-[0_0_4px_rgba(110,231,183,0.18)]"
                    : "bg-white/12",
                ].join(" ")}
                style={{ height: `${8 + index * 3}px` }}
              />
            ))}
          </div>
          <div className="hidden items-center gap-1.5 rounded-full border border-white/6 bg-black/16 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/24 2xl:flex">
            <Archive size={11} className="text-amber-100/50" />
            Stored
          </div>
        </div>
      </div>
      <div className="relative z-10 mt-2 hidden gap-2 overflow-hidden rounded-[20px] border border-white/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.018),rgba(255,255,255,0.008))] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] 2xl:grid-cols-[1fr_180px] 2xl:grid">
        <div className="pointer-events-none absolute inset-0 opacity-[0.022] bg-[repeating-linear-gradient(to_right,rgba(255,255,255,0.022)_0px,rgba(255,255,255,0.022)_1px,transparent_1px,transparent_26px)]" />
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-emerald-200/10 to-transparent" />
        <div className="relative z-10 flex min-w-0 flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-full border border-emerald-300/10 bg-emerald-400/[0.06] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-100/44">
            <Radar size={11} />
            Stream Health
          </div>

          <DiagnosticChip label="Bitrate" value={`${bitrateMbps.toFixed(1)} Mbps`} tone="good" />
          <DiagnosticChip label="Loss" value={`${packetLoss.toFixed(1)}%`} tone="good" />
          <DiagnosticChip label="Frames" value={`${droppedFrames} dropped`} />
          <DiagnosticChip label="Jitter" value={`${jitterMs}ms`} tone="good" />
          <DiagnosticChip label="RTT" value={`${latencyScore + 22}ms`} />
        </div>

        <div className="relative z-10 flex items-center justify-end gap-2">
          <Activity size={13} className="text-emerald-200/55" />
          <DiagnosticSparkline values={diagnosticSamples} />
        </div>
      </div>
      <style jsx global>{`
        @keyframes topDeckSignalSweep {
          0%,
          100% {
            opacity: 0;
            transform: translateX(-18%);
          }

          46% {
            opacity: 0.18;
          }

          100% {
            transform: translateX(18%);
          }
        }

        @keyframes topDeckRouteSweep {
          0%,
          100% {
            opacity: 0;
            transform: translateX(-120%);
          }

          38% {
            opacity: 0.18;
          }

          100% {
            transform: translateX(220%);
          }
        }
      `}</style>
    </div>
  )
}