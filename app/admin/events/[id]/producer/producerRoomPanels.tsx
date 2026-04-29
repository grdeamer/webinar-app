import type { JSX, ReactNode } from "react"
import type { StageState } from "./producerRoomTypes"

export function MonitorHeader({
  title,
  subtitle,
  badge,
  tone = "neutral",
}: {
  title: string
  subtitle: string
  badge?: ReactNode
  tone?: "neutral" | "preview" | "program"
}): JSX.Element {
  const toneClass =
    tone === "program"
      ? "text-red-200/80"
      : tone === "preview"
        ? "text-sky-200/80"
        : "text-white/40"

  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div>
        <div className={`text-xs uppercase tracking-[0.2em] ${toneClass}`}>{title}</div>
        <div className="text-sm text-white/55">{subtitle}</div>
      </div>
      {badge ? <div className="shrink-0">{badge}</div> : null}
    </div>
  )
}

export function AudienceOriginTestPanel({
  onTriggerCue,
  onHideCue,
}: {
  onTriggerCue: (options: {
    region?: string
    moonMode?: boolean
    questionLabel?: string
    durationMs?: number
  }) => void
  onHideCue: () => void
}): JSX.Element {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
        Audience Origin Test
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() =>
            onTriggerCue({
              region: "Europe",
              moonMode: false,
              questionLabel: "How are outcomes differing across regions?",
            })
          } className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10">Trigger Europe Cue</button>

        <button onClick={() =>
            onTriggerCue({
              region: "North America",
              moonMode: false,
              questionLabel: "What trends are you seeing in North America?",
            })
          } className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10">Trigger North America Cue</button>

        <button onClick={() =>
            onTriggerCue({
              region: "Mare Tranquillitatis",
              moonMode: true,
              questionLabel: "Moon base check-in: how is the signal holding?",
            })
          } className="rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-2 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/15">Trigger Moon Cue</button>

        <button onClick={onHideCue} className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-500/15">Hide Cue</button>
      </div>
    </div>
  )
}

export function MediaBlocksPanel({
  previewBlocksCount,
  onAddText,
  onAddVideo,
  onAddPdf,
  onAddImage,
  onUploadPdf,
  onUploadVideo,
  onUploadImage,
  onDuplicate,
  onBringToFront,
  onDelete,
  hasSelectedBlock,
}: {
  previewBlocksCount: number
  onAddText: () => void
  onAddVideo: () => void
  onAddPdf: () => void
  onAddImage: () => void
  onUploadPdf: () => void
  onUploadVideo: () => void
  onUploadImage: () => void
  onDuplicate: () => void
  onBringToFront: () => void
  onDelete: () => void
  hasSelectedBlock: boolean
}): JSX.Element {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
        Add Blocks / Upload Media
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button onClick={onAddText} className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10">Add Text</button>
        <button onClick={onAddVideo} className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10">Add Video</button>
        <button onClick={onAddPdf} className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10">Add PDF</button>
        <button onClick={onAddImage} className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10">Add Image</button>
        <button onClick={onUploadPdf} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-white/90">Upload PDF</button>
        <button onClick={onUploadVideo} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-white/90">Upload Video</button>
        <button onClick={onUploadImage} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-white/90">Upload Image</button>

        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
          Preview blocks: {previewBlocksCount}
        </span>

        <button onClick={onDuplicate} disabled={!hasSelectedBlock} className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40 hover:bg-white/10">Duplicate</button>
        <button onClick={onBringToFront} disabled={!hasSelectedBlock} className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40 hover:bg-white/10">Bring To Front</button>
        <button onClick={onDelete} disabled={!hasSelectedBlock} className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 transition disabled:cursor-not-allowed disabled:opacity-40 hover:bg-red-500/15">Delete</button>
      </div>
    </div>
  )
}

export function ScenesStatusPanel({
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

        <button onClick={onSaveScene} disabled={sceneBusy} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90">
          Save Scene
        </button>

        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">Screen: {stageState?.screen_share_participant_id || "none"}</span>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">Pinned: {stageState?.pinned_participant_id || "none"}</span>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">Primary: {stageState?.primary_participant_id || "none"}</span>

        {stageState?.screen_share_participant_id ? <button onClick={onClearScreenShare} className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10">Clear screen</button> : null}
        {stageState?.pinned_participant_id ? <button onClick={onUnpin} className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10">Clear pin</button> : null}
        {stageState?.primary_participant_id ? <button onClick={onClearPrimary} className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10">Clear primary</button> : null}
      </div>

      {scenes.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-white/15 bg-white/[0.025] p-4 text-sm text-white/45">
          No saved scenes yet. Build a preview, name it, then save it.
        </div>
      ) : (
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {scenes.map((scene, index) => (
            <button
              key={scene.id}
              onClick={() => onApplyScene(scene.id)}
              className="group rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.05]"
            >
              <div className="mb-3 aspect-video rounded-xl border border-white/10 bg-[radial-gradient(circle_at_30%_30%,rgba(56,189,248,0.18),transparent_30%),radial-gradient(circle_at_70%_60%,rgba(239,68,68,0.16),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))]" />
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">Scene {index + 1}</div>
              <div className="mt-1 text-sm font-semibold text-white group-hover:text-sky-200">{scene.name}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
