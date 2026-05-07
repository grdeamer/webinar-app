import type { JSX } from "react"
import {
  Layers3,
  MonitorUp,
  Pin,
  Star,
} from "lucide-react"
import type { StageState } from "./producerRoomTypes"

function compactIdentity(value: string | null | undefined) {
  if (!value) return "None"
  return value.length > 18 ? `${value.slice(0, 8)}…${value.slice(-5)}` : value
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
    <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.015))] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/34">
            Scene Control
          </div>
          <div className="mt-1 text-sm font-semibold tracking-tight text-white">
            Recall & Stage State
          </div>
        </div>

        <div className="hidden rounded-full border border-violet-300/14 bg-violet-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-violet-100/72 lg:block">
          Broadcast Memory
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <input
          value={sceneName}
          onChange={(e) => onSceneNameChange(e.target.value)}
          placeholder={selectedSceneId ? "Update selected scene" : "Scene name"}
          className="min-w-[220px] rounded-2xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white outline-none ring-0 placeholder:text-white/28 focus:border-violet-300/25"
        />

        <button
          onClick={onSaveScene}
          disabled={sceneBusy}
          className="rounded-2xl border border-violet-200/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(226,232,240,0.92))] px-4 py-2 text-sm font-black tracking-[0.04em] text-slate-950 shadow-[0_12px_30px_rgba(255,255,255,0.12)] transition hover:-translate-y-0.5 hover:bg-white active:translate-y-0"
        >
          {sceneBusy ? "Saving..." : selectedSceneId ? "Update Scene" : "Save Scene"}
        </button>

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
            className="rounded-xl border border-white/12 bg-black/25 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-white/70 transition hover:border-white/18 hover:bg-white/8 hover:text-white"
          >
            Clear screen
          </button>
        ) : null}

        {stageState?.pinned_participant_id ? (
          <button
            onClick={onUnpin}
            className="rounded-xl border border-white/12 bg-black/25 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-white/70 transition hover:border-white/18 hover:bg-white/8 hover:text-white"
          >
            Clear pin
          </button>
        ) : null}

        {stageState?.primary_participant_id ? (
          <button
            onClick={onClearPrimary}
            className="rounded-xl border border-white/12 bg-black/25 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-white/70 transition hover:border-white/18 hover:bg-white/8 hover:text-white"
          >
            Clear primary
          </button>
        ) : null}
      </div>

      {selectedSceneId ? (
        <p className="mt-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-sky-200/72">
          <Layers3 size={12} />
          Updating {selectedSceneLabel ?? "selected scene"}
        </p>
      ) : null}

      <div className="mt-3 rounded-2xl border border-white/8 bg-black/18 p-2">
        <div className="mb-2 flex items-center justify-between gap-3 px-1">
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">
            Scene Bank
          </div>
          <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/24">
            {scenes.length} saved
          </div>
        </div>

        <div className="flex max-h-24 flex-wrap gap-2 overflow-y-auto pr-1">
          {scenes.map((scene) => (
            <button
              key={scene.id}
              onClick={() => onApplyScene(scene.id)}
              className={`group rounded-2xl border px-3 py-2 text-[11px] font-black uppercase tracking-[0.14em] transition-all duration-200 hover:-translate-y-0.5 ${
                selectedSceneId === scene.id
                  ? "border-sky-300/35 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.16),transparent_42%),rgba(56,189,248,0.08)] text-sky-100 shadow-[0_0_24px_rgba(56,189,248,0.18)]"
                  : "border-white/10 bg-black/20 text-white/58 hover:border-white/18 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              {scene.name}
            </button>
          ))}
          {scenes.length === 0 ? (
            <div className="flex min-h-12 w-full items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-3 py-3 text-center text-[11px] font-semibold text-white/32">
              No scenes saved yet. Build a look, name it, then save it here.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}