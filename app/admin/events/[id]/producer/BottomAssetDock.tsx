

import type { JSX } from "react"
import type { PreviewBlock } from "./useProducerBlocks"

type SceneSummary = {
  id: string
  name: string
}

type DockAsset = {
  id: string
  label?: string
}

function DockSection({
  title,
  count,
  children,
}: {
  title: string
  count: number
  children: React.ReactNode
}): JSX.Element {
  return (
    <div className="rounded-[26px] border border-white/10 bg-black/24 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
      <div className="mb-3 flex items-center justify-between gap-3">
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

function SceneTile({
  scene,
  index,
}: {
  scene: SceneSummary
  index: number
}): JSX.Element {
  return (
    <button
      type="button"
      className="group min-w-[104px] rounded-[18px] border border-white/10 bg-white/[0.035] p-2 text-left transition hover:-translate-y-0.5 hover:border-violet-300/30 hover:bg-violet-400/8 active:translate-y-0"
    >
      <div className="aspect-video rounded-xl border border-white/10 bg-[radial-gradient(circle_at_30%_30%,rgba(56,189,248,0.2),transparent_30%),radial-gradient(circle_at_70%_65%,rgba(168,85,247,0.18),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.015))]" />
      <div className="mt-2 text-[9px] font-black uppercase tracking-[0.16em] text-white/35">
        Scene {index + 1}
      </div>
      <div className="mt-0.5 truncate text-[11px] font-semibold text-white/80 group-hover:text-violet-100">
        {scene.name}
      </div>
    </button>
  )
}

function GraphicTile({ item }: { item: DockAsset }): JSX.Element {
  return (
    <button
      type="button"
      className="min-w-[104px] rounded-[18px] border border-white/10 bg-white/[0.035] p-2 text-left transition hover:-translate-y-0.5 hover:border-sky-300/30 hover:bg-sky-400/8 active:translate-y-0"
    >
      <div className="flex aspect-video items-end rounded-xl border border-white/10 bg-[linear-gradient(135deg,rgba(14,165,233,0.18),rgba(15,23,42,0.9))] p-2">
        <div className="h-4 w-16 rounded-md bg-white/80" />
      </div>
      <div className="mt-2 truncate text-[11px] font-semibold text-white/78">
        {item.label || "Graphic"}
      </div>
    </button>
  )
}

function MediaTile({
  item,
  index,
}: {
  item: DockAsset
  index: number
}): JSX.Element {
  return (
    <button
      type="button"
      className="min-w-[104px] rounded-[18px] border border-white/10 bg-white/[0.035] p-2 text-left transition hover:-translate-y-0.5 hover:border-emerald-300/30 hover:bg-emerald-400/8 active:translate-y-0"
    >
      <div className="relative aspect-video rounded-xl border border-white/10 bg-[radial-gradient(circle_at_50%_50%,rgba(52,211,153,0.22),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.9),rgba(2,6,23,0.95))]">
        <div className="absolute bottom-1 right-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[8px] font-black text-white/60">
          0{index}:15
        </div>
      </div>
      <div className="mt-2 truncate text-[11px] font-semibold text-white/78">
        {item.label || "Media"}
      </div>
    </button>
  )
}

export default function BottomAssetDock({
  scenes,
  previewBlocks,
}: {
  scenes: SceneSummary[]
  previewBlocks: PreviewBlock[]
}): JSX.Element {
  const graphics = previewBlocks.filter((block) => block.type === "text")
  const media = previewBlocks.filter(
    (block) => block.type === "video" || block.type === "image" || block.type === "pdf"
  )

  const graphicsItems: DockAsset[] = graphics.length
    ? graphics
    : [
        { id: "placeholder-lower", label: "Lower Third" },
        { id: "placeholder-name", label: "Name Tag" },
      ]

  const mediaItems: DockAsset[] = media.length
    ? media
    : [
        { id: "placeholder-intro", label: "Intro Video" },
        { id: "placeholder-bumper", label: "Bumper" },
        { id: "placeholder-countdown", label: "Countdown" },
      ]

  const transitions = ["Cut", "Fade", "Dip", "Stinger"]

  return (
    <div className="mt-4 rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.12),transparent_34%),linear-gradient(180deg,rgba(8,13,30,0.78),rgba(2,4,10,0.92))] p-3 shadow-[0_28px_100px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.055)] backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/35">
            Live Asset Dock
          </div>
          <div className="mt-1 text-sm text-white/45">
            Scenes, graphics, media, and transition presets.
          </div>
        </div>

        <span className="hidden rounded-full border border-violet-300/20 bg-violet-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-violet-100/80 shadow-[0_0_18px_rgba(168,85,247,0.14)] sm:inline-flex">
          Preview Rail
        </span>
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.1fr_1fr_1fr_0.8fr]">
        <DockSection title="Scenes" count={scenes.length}>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {scenes.slice(0, 6).map((scene, index) => (
              <SceneTile key={scene.id} scene={scene} index={index} />
            ))}

            <button
              type="button"
              className="min-w-[104px] rounded-[18px] border border-dashed border-white/14 bg-black/20 p-2 text-center text-[10px] font-black uppercase tracking-[0.16em] text-white/35 transition hover:border-white/25 hover:bg-white/[0.04]"
            >
              <div className="flex aspect-video items-center justify-center rounded-xl border border-white/10 bg-black/25 text-xl text-white/35">
                +
              </div>
              <div className="mt-2">Add Scene</div>
            </button>
          </div>
        </DockSection>

        <DockSection title="Graphics" count={graphics.length}>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {graphicsItems.slice(0, 5).map((item) => (
              <GraphicTile key={item.id} item={item} />
            ))}
          </div>
        </DockSection>

        <DockSection title="Media" count={media.length}>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {mediaItems.slice(0, 5).map((item, index) => (
              <MediaTile key={item.id} item={item} index={index} />
            ))}
          </div>
        </DockSection>

        <DockSection title="Transitions" count={transitions.length}>
          <div className="grid grid-cols-2 gap-2">
            {transitions.map((transition) => (
              <button
                key={transition}
                type="button"
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-[10px] font-black uppercase tracking-[0.15em] text-white/65 transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.07] active:translate-y-0"
              >
                {transition}
              </button>
            ))}
          </div>
        </DockSection>
      </div>
    </div>
  )
}