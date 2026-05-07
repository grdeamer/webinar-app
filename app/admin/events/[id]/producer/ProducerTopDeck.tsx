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
        "flex items-center gap-2 rounded-2xl border px-3 py-1.5",
        "bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))]",
        "shadow-[0_12px_40px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.04)]",
        tone,
      ].join(" ")}
    >
      <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/30 text-white/72">
        {pulse ? (
          <span className="absolute inset-1 rounded-lg bg-red-400/10 animate-pulse" />
        ) : null}
        <span className="relative z-10">{icon}</span>
      </span>

      <div className="min-w-0">
        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/34">
          {label}
        </div>
        <div className="truncate text-sm font-semibold text-white/88">
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
      ? "border-red-300/18 bg-red-400/8 text-red-100/62"
      : tone === "iso"
        ? "border-amber-300/18 bg-amber-400/8 text-amber-100/62"
        : tone === "program"
          ? "border-sky-300/18 bg-sky-400/8 text-sky-100/62"
          : "border-emerald-300/18 bg-emerald-400/8 text-emerald-100/62"

  return (
    <div
      className={[
        "hidden items-center gap-1.5 rounded-full border px-2 py-1 sm:flex",
        active ? activeClass : "border-white/8 bg-white/[0.025] text-white/36",
      ].join(" ")}
    >
      <span
        className={[
          "h-1.5 w-1.5 rounded-full",
          active
            ? tone === "record"
              ? "bg-red-300 shadow-[0_0_10px_rgba(252,165,165,0.8)] animate-pulse"
              : tone === "iso"
                ? "bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,0.7)]"
                : tone === "program"
                  ? "bg-sky-300 shadow-[0_0_10px_rgba(125,211,252,0.7)]"
                  : "bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.7)]"
            : "bg-white/22",
        ].join(" ")}
      />
      <span>{label}</span>
      <span className={active ? "text-red-50/72" : "text-white/48"}>
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
    <div className="flex h-6 items-end gap-0.5 rounded-xl border border-white/8 bg-black/24 px-1.5 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      {values.map((value, index) => (
        <span
          key={`${value}-${index}`}
          className="w-1 rounded-full bg-emerald-300/70 shadow-[0_0_8px_rgba(110,231,183,0.45)] transition-all duration-500"
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
      ? "border-emerald-300/14 text-emerald-100/62"
      : tone === "warn"
        ? "border-amber-300/14 text-amber-100/62"
        : "border-white/8 text-white/42"

  return (
    <div
      className={`rounded-full border bg-black/24 px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${toneClass}`}
    >
      <span className="text-white/30">{label}</span>{" "}
      <span className="text-white/62">{value}</span>
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
      ? "border-sky-300/14 bg-sky-400/8 text-sky-100/60"
      : tone === "green"
        ? "border-emerald-300/14 bg-emerald-400/8 text-emerald-100/60"
        : tone === "amber"
          ? "border-amber-300/14 bg-amber-400/8 text-amber-100/60"
          : "border-white/10 bg-black/24 text-white/42"

  return (
    <div className={`flex items-center gap-2 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${toneClass}`}>
      <span className="opacity-80">{icon}</span>
      <span className="text-white/34">{label}</span>
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
    <div className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.10),transparent_28%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.10),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.016))] p-2 shadow-[0_22px_70px_rgba(0,0,0,0.30),inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-white/8 bg-black/18 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[0.24em] text-white/30">
            Mission Control Telemetry
          </div>

          <div className="mt-1 text-sm font-semibold tracking-tight text-white">
            Jupiter Producer Operations Deck
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <TelemetryBadge
            icon={<SatelliteDish size={11} />}
            label="Relay"
            value="Locked"
            tone="green"
          />

          <TelemetryBadge
            icon={<Globe2 size={11} />}
            label="CDN"
            value="Healthy"
            tone="sky"
          />

          <TelemetryBadge
            icon={<Cpu size={11} />}
            label="GPU"
            value="62%"
            tone="amber"
          />
        </div>
      </div>
      <div className="grid gap-2 xl:grid-cols-[1.15fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr]">
        <StatusPill
          icon={
            <span className="relative flex items-center justify-center">
              <Disc3 size={15} className="text-red-300 animate-spin" />
              <Circle size={6} className="absolute fill-red-300 text-red-300" />
              <span className="absolute h-5 w-5 rounded-full border border-red-300/40 animate-ping" />
            </span>
          }
          label="Live Status"
          value="Program Live"
          tone="border-red-400/20 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.12),transparent_36%),rgba(255,255,255,0.03)]"
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
          value={`${confidence}% stable`}
          tone="border-emerald-300/18"
        />

        <StatusPill
          icon={<Users size={15} />}
          label="Audience"
          value={`${viewers.toLocaleString()} live`}
          tone="border-sky-400/18"
        />

        <StatusPill
          icon={<Signal size={15} />}
          label="Latency"
          value={`${latencyLabel} · ${latencyScore}ms`}
          tone="border-emerald-300/18"
        />

        <StatusPill
          icon={<Gauge size={15} />}
          label="Bitrate"
          value={`${bitrateMbps.toFixed(1)} Mbps`}
          tone="border-sky-300/18"
        />

        <StatusPill
          icon={<HardDrive size={15} />}
          label="Storage"
          value={`${storagePercent}% vault`}
          tone="border-amber-300/18"
        />

        <StatusPill
          icon={<Wand2 size={15} className="animate-pulse" />}
          label="Transition"
          value="Auto · 600ms"
          tone="border-violet-300/18"
        />

        <StatusPill
          icon={<Radar size={15} className="text-sky-200/75" />}
          label="Telemetry"
          value="Nominal"
          tone="border-sky-300/18"
        />
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-black/18 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex items-center gap-2">
            <Wifi size={13} className="text-emerald-200/65" />
            Signal Locked
          </div>
          <div className="hidden h-3 w-px bg-white/10 sm:block" />
          <div className="hidden min-w-0 items-center gap-1 truncate text-white/32 md:flex">
            <span>Session A1</span>
            <ChevronRight size={11} className="text-white/18" />
            <span>Mission stable</span>
            <ChevronRight size={11} className="text-white/18" />
            <span>{isoCount} ISO feeds armed</span>
            <ChevronRight size={11} className="text-white/18" />
            <span>{confidence}% confidence</span>
            <ChevronRight size={11} className="text-white/18" />
            <span>{packetLoss.toFixed(1)}% packet loss</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <div className="hidden items-center gap-1.5 lg:flex">
            <OpsChip label="REC" value={recordingRuntime} active tone="record" />
            <OpsChip label="ISO" value={`${isoCount} armed`} active tone="iso" />
            <OpsChip label="PGM" value="Clean" active tone="program" />
            <OpsChip label="Vault" value={`${storagePercent}%`} tone="neutral" />
          </div>
          <div className="hidden items-center gap-1.5 xl:flex">
            <DiagnosticChip label="Loss" value={`${packetLoss.toFixed(1)}%`} tone="good" />
            <DiagnosticChip label="Drop" value={String(droppedFrames)} />
            <DiagnosticChip label="Jitter" value={`${jitterMs}ms`} tone="good" />
          </div>
          <span className="hidden text-[9px] tracking-[0.16em] text-emerald-100/35 sm:inline">
            UPLINK
          </span>
          <div className="flex items-end gap-1">
            {Array.from({ length: 4 }).map((_, index) => (
              <span
                key={index}
                className={[
                  "w-1.5 rounded-full transition-all duration-500",
                  index < signalBars
                    ? "bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.7)]"
                    : "bg-white/12",
                ].join(" ")}
                style={{ height: `${8 + index * 3}px` }}
              />
            ))}
          </div>
          <div className="hidden items-center gap-1.5 rounded-full border border-white/8 bg-black/24 px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white/34 xl:flex">
            <Archive size={11} className="text-amber-100/50" />
            Vaulting
          </div>
        </div>
      </div>
      <div className="mt-2 grid gap-2 rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.014))] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] xl:grid-cols-[1fr_180px]">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-full border border-emerald-300/12 bg-emerald-400/8 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-emerald-100/56">
            <Radar size={11} />
            Stream Diagnostics
          </div>

          <DiagnosticChip label="Bitrate" value={`${bitrateMbps.toFixed(1)} Mbps`} tone="good" />
          <DiagnosticChip label="Loss" value={`${packetLoss.toFixed(1)}%`} tone="good" />
          <DiagnosticChip label="Frames" value={`${droppedFrames} dropped`} />
          <DiagnosticChip label="Jitter" value={`${jitterMs}ms`} tone="good" />
          <DiagnosticChip label="RTT" value={`${latencyScore + 22}ms`} />
        </div>

        <div className="flex items-center justify-end gap-2">
          <Activity size={13} className="text-emerald-200/55" />
          <DiagnosticSparkline values={diagnosticSamples} />
        </div>
      </div>
    </div>
  )
}