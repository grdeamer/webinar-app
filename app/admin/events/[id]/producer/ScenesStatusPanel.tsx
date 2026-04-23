import type { JSX } from "react"
import type { StageState } from "./producerRoomTypes"

export default function ScenesStatusPanel({
  sceneName,
  onSceneNameChange,
  onSaveScene,
  sceneBusy,
  stageState,
  scenes,
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
  onApplyScene: (sceneId: string) => void
  onClearScreenShare: () => void
  onUnpin: () => void
  onClearPrimary: () => void
}): JSX.Element {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
        Scenes / Status
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={sceneName}
          onChange={(e) => onSceneNameChange(e.target.value)}
          placeholder="Scene name"
          className="min-w-[220px] rounded-xl bg-white/10 px-3 py-2 text-sm outline-none ring-0 placeholder:text-white/30"
        />

        <button
          onClick={onSaveScene}
          disabled={sceneBusy}
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
        >
          Save Scene
        </button>

        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
          Screen: {stageState?.screen_share_participant_id || "none"}
        </span>

        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
          Pinned: {stageState?.pinned_participant_id || "none"}
        </span>

        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
          Primary: {stageState?.primary_participant_id || "none"}
        </span>

        {stageState?.screen_share_participant_id ? (
          <button
            onClick={onClearScreenShare}
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
          >
            Clear screen
          </button>
        ) : null}

        {stageState?.pinned_participant_id ? (
          <button
            onClick={onUnpin}
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
          >
            Clear pin
          </button>
        ) : null}

        {stageState?.primary_participant_id ? (
          <button
            onClick={onClearPrimary}
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
          >
            Clear primary
          </button>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {scenes.map((scene) => (
          <button
            key={scene.id}
            onClick={() => onApplyScene(scene.id)}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs transition hover:bg-white/5"
          >
            {scene.name}
          </button>
        ))}
      </div>
    </div>
  )
}