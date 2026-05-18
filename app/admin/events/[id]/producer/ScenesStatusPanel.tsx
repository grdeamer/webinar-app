import type { JSX } from "react"
import {
  CheckCircle2,
  Clock3,
  Layers3,
  MonitorUp,
  Pin,
  Radio,
  Rows3,
  Sparkles,
  Star,
} from "lucide-react"
import type { StageState } from "./producerRoomTypes"

function compactIdentity(value: string | null | undefined) {
  if (!value) return "None"
  return value.length > 18 ? `${value.slice(0, 8)}…${value.slice(-5)}` : value
}

function formatSceneTimestamp() {
  return new Date().toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })
}

function RundownStatusPill({
  label,
  value,
  tone = "neutral",
}: {
  label: string
  value: string
  tone?: "neutral" | "green" | "violet" | "sky"
}): JSX.Element {
  const toneClass =
    tone === "green"
      ? "border-emerald-300/14 bg-emerald-400/8 text-emerald-100/68"
      : tone === "violet"
        ? "border-violet-300/14 bg-violet-400/8 text-violet-100/68"
        : tone === "sky"
          ? "border-sky-300/14 bg-sky-400/8 text-sky-100/68"
          : "border-white/10 bg-black/24 text-white/42"

  return (
    <div className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] ${toneClass}`}>
      <span className="text-white/32">{label}</span>{" "}
      <span>{value}</span>
    </div>
  )
}

function SceneMemoryBadge({
  active,
}: {
  active: boolean
}): JSX.Element {
  return (
    <div
      className={[
        "flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] transition-all duration-300",
        active
          ? "border-emerald-300/22 bg-emerald-400/10 text-emerald-100/78 shadow-[0_0_18px_rgba(110,231,183,0.14)]"
          : "border-white/10 bg-black/24 text-white/42",
      ].join(" ")}
    >
      <span
        className={[
          "h-1.5 w-1.5 rounded-full",
          active
            ? "bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.75)]"
            : "bg-white/20",
        ].join(" ")}
      />

      {active ? "Scene Armed" : "Scene Idle"}
    </div>
  )
}

function StatusChip({
  icon,
  label,
  value,
  tone = "",
}: {
  icon: JSX.Element
  label: string
  value: string
  tone?: string
}) {
  return (
    <div
      className={[
        "flex min-w-[142px] items-center gap-2 rounded-2xl border px-3 py-1.5",
        "bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))]",
        "shadow-[0_12px_40px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.04)]",
        tone,
      ].join(" ")}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/30 text-white/70">
        {icon}
      </span>

      <div className="min-w-0">
        <div className="text-[9px] font-black uppercase tracking-[0.18em] text-white/34">
          {label}
        </div>
        <div className="max-w-[112px] truncate text-xs font-semibold text-white/82">
          {value}
        </div>
      </div>
    </div>
  )
}

export default function ScenesStatusPanel({
  sceneName,
  onSceneNameChange,
  onSaveScene,
  sceneBusy,
  stageState,
  scenes,
  selectedSceneId,
  selectedSceneLabel,
  onApplyScene,
  onClearScreenShare,
  onUnpin,
  onClearPrimary,
}: {
  sceneName: string
  onSceneNameChange: (value: string) => void
  onSaveScene: () => void
  sceneBusy: boolean
  stageState: StageState | null
  scenes: Array<{ id: string; name: string }>
  selectedSceneId: string | null
  selectedSceneLabel: string | null
  onApplyScene: (sceneId: string) => void
  onClearScreenShare: () => void
  onUnpin: () => void
  onClearPrimary: () => void
}): JSX.Element {
  return (
    <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,22,38,0.96),rgba(8,13,24,0.99))] p-3 shadow-[0_22px_72px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.045)]">
      <div className="mb-3 rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_14px_34px_rgba(0,0,0,0.16)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-white/52">
              <Rows3 size={13} />
              Broadcast Rundown
            </div>

            <div className="mt-1 text-lg font-semibold tracking-tight text-white">
              Scene Recall + Cue Stack
            </div>

            <div className="mt-1 text-sm leading-6 text-white/42">
              Save compositions, recall stage states, and sequence live broadcast looks.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SceneMemoryBadge active={Boolean(selectedSceneId)} />

            <RundownStatusPill
              label="Scenes"
              value={String(scenes.length)}
              tone="sky"
            />

            <RundownStatusPill
              label="Recall"
              value="Ready"
              tone="green"
            />

            <RundownStatusPill
              label="Mode"
              value={selectedSceneId ? "Armed" : "Idle"}
              tone={selectedSceneId ? "violet" : "neutral"}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 rounded-[24px] border border-white/10 bg-white/[0.045] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_14px_34px_rgba(0,0,0,0.16)]">
        <input
          value={sceneName}
          onChange={(e) => onSceneNameChange(e.target.value)}
          placeholder={selectedSceneId ? "Update selected scene" : "Scene name"}
          className="min-w-[220px] rounded-2xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white outline-none ring-0 placeholder:text-white/28 focus:border-violet-300/25"
        />

        <button
          onClick={onSaveScene}
          disabled={sceneBusy}
          className="rounded-2xl border border-sky-200/24 bg-white px-4 py-2 text-sm font-black tracking-[0.04em] text-slate-950 shadow-[0_16px_40px_rgba(255,255,255,0.16)] transition active:translate-y-0"
        >
          {sceneBusy ? "Saving..." : selectedSceneId ? "Update Scene" : "Save Scene"}
        </button>

        <div className="flex items-center gap-2 rounded-2xl border border-emerald-300/14 bg-emerald-400/8 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100/62 shadow-[0_0_20px_rgba(110,231,183,0.06)]">
          <CheckCircle2 size={13} />
          Scene Recall Ready
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-violet-300/14 bg-violet-400/8 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-violet-100/58 shadow-[0_0_18px_rgba(168,85,247,0.08)]">
          <Radio size={13} />
          Cue Stack Synced
        </div>

        <StatusChip
          icon={<MonitorUp size={14} />}
          label="Screen"
          value={compactIdentity(stageState?.screen_share_participant_id)}
          tone="border-sky-300/14"
        />

        <StatusChip
          icon={<Pin size={14} />}
          label="Pinned"
          value={compactIdentity(stageState?.pinned_participant_id)}
          tone="border-amber-300/14"
        />

        <StatusChip
          icon={<Star size={14} />}
          label="Primary"
          value={compactIdentity(stageState?.primary_participant_id)}
          tone="border-violet-300/14"
        />

        {stageState?.screen_share_participant_id ? (
          <button
            onClick={onClearScreenShare}
            className="rounded-xl border border-white/18 bg-white/8 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-white transition"
          >
            Clear screen
          </button>
        ) : null}

        {stageState?.pinned_participant_id ? (
          <button
            onClick={onUnpin}
            className="rounded-xl border border-white/18 bg-white/8 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-white transition"
          >
            Clear pin
          </button>
        ) : null}

        {stageState?.primary_participant_id ? (
          <button
            onClick={onClearPrimary}
            className="rounded-xl border border-white/18 bg-white/8 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-white transition"
          >
            Clear primary
          </button>
        ) : null}
      </div>

      {selectedSceneId ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-2xl border border-sky-300/14 bg-sky-400/8 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-sky-100/72 shadow-[0_0_22px_rgba(56,189,248,0.08)]">
          <Layers3 size={12} />
          Armed Scene

          <span className="text-white/28">•</span>

          <span>{selectedSceneLabel ?? "Selected Scene"}</span>

          <span className="text-white/28">•</span>

          <span className="flex items-center gap-1 text-white/52">
            <Clock3 size={11} />
            {formatSceneTimestamp()}
          </span>
        </div>
      ) : null}

      <div className="mt-3 rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_14px_34px_rgba(0,0,0,0.16)]">
        <div className="mb-2 flex items-center justify-between gap-3 px-1">
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">
            Rundown Memory Bank
          </div>
          <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/24">
            {scenes.length} recall states
          </div>
          <div className="hidden items-center gap-1 rounded-full border border-white/8 bg-black/24 px-2 py-1 text-[8px] font-black uppercase tracking-[0.14em] text-white/34 md:flex">
            <Sparkles size={10} className="text-violet-100/55" />
            Instant Recall
          </div>
        </div>

        <div className="flex max-h-24 flex-wrap gap-2 overflow-y-auto pr-1">
          {scenes.map((scene, index) => (
            <button
              key={scene.id}
              onClick={() => onApplyScene(scene.id)}
              className={`group relative overflow-hidden rounded-2xl border px-3 py-2 text-[11px] font-black uppercase tracking-[0.14em] transition-all duration-200 ${
                selectedSceneId === scene.id
                  ? "border-sky-300/35 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.16),transparent_42%),rgba(56,189,248,0.08)] text-sky-100 shadow-[0_0_24px_rgba(56,189,248,0.18)]"
                  : "border-white/18 bg-white/[0.06] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_12px_30px_rgba(0,0,0,0.20)]"
              }`}
            >
              {selectedSceneId === scene.id ? (
                <div className="absolute inset-y-0 left-0 w-1 rounded-r-full bg-sky-300 shadow-[0_0_14px_rgba(125,211,252,0.8)]" />
              ) : null}
              <div className="relative flex items-center gap-2">
                <span className="flex h-5 min-w-5 items-center justify-center rounded-lg border border-white/10 bg-black/28 px-1 text-[8px] font-black text-white/42 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                  {index + 1}
                </span>

                <span>{scene.name}</span>

                {selectedSceneId === scene.id ? (
                  <span className="rounded-full border border-sky-300/18 bg-sky-400/12 px-1.5 py-0.5 text-[8px] tracking-[0.12em] text-sky-100/75">
                    Armed
                  </span>
                ) : (
                  <span className="rounded-full border border-white/14 bg-white/[0.055] px-1.5 py-0.5 text-[8px] tracking-[0.12em] text-white/70 transition">
                    Recall
                  </span>
                )}
              </div>
            </button>
          ))}
          {scenes.length === 0 ? (
            <div className="flex min-h-12 w-full items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-3 py-3 text-center text-[11px] font-semibold text-white/32">
              No rundown states saved yet. Build a broadcast look, then commit it to memory.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}