import type { JSX } from "react"
import type { PreviewBlock } from "./useProducerBlocks"
import {
  FALLBACK_GRAPHICS_ITEMS,
  FALLBACK_MEDIA_ITEMS,
  TRANSITION_DURATIONS,
  TRANSITION_PRESETS,
  type DockAsset,
  type SceneSummary,
} from "./assetDockTypes"
import {
  DockSection,
  KeyboardShortcutsPanel,
  TallyIndicators,
} from "./AssetDockChrome"


function SceneTile({
  scene,
  index,
  isActive,
}: {
  scene: SceneSummary
  index: number
  isActive: boolean
}): JSX.Element {
  return (
    <button
      type="button"
      className={`group relative min-w-[96px] rounded-[16px] border p-1.5 text-left transition duration-200 ${
        isActive
          ? "border-violet-300/60 bg-violet-400/12 shadow-[0_0_24px_rgba(168,85,247,0.22)]"
          : "border-white/10 bg-white/[0.035]"
      } hover:-translate-y-0.5 hover:border-violet-300/40 hover:bg-violet-400/10 hover:shadow-[0_0_20px_rgba(168,85,247,0.18)] active:translate-y-0`}
    >
      {isActive ? (
        <div className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-violet-300 shadow-[0_0_10px_rgba(196,181,253,0.95)]" />
      ) : null}
      <div className="absolute left-1.5 top-1.5 rounded-md border border-white/10 bg-black/45 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.1em] text-white/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
        {index + 1}
      </div>
      <div className="aspect-video rounded-xl border border-white/10 bg-[radial-gradient(circle_at_30%_30%,rgba(56,189,248,0.2),transparent_30%),radial-gradient(circle_at_70%_65%,rgba(168,85,247,0.18),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.015))] shadow-[inset_0_1px_0_rgba(255,255,255,0.055)] transition group-hover:border-violet-200/25 group-hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_18px_rgba(168,85,247,0.12)]" />
      <div className="mt-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-white/35">
        Scene {index + 1}
      </div>
      <div
        className={`mt-0.5 truncate text-[11px] font-semibold group-hover:text-violet-100${
          isActive ? " text-violet-100" : ""
        }`}
      >
        {scene.name}
      </div>
    </button>
  )
}

function GraphicTile({ item }: { item: DockAsset }): JSX.Element {
  return (
    <button
      type="button"
      className="group min-w-[96px] rounded-[16px] border border-white/10 bg-white/[0.035] p-1.5 text-left transition duration-200 hover:-translate-y-0.5 hover:border-sky-300/35 hover:bg-sky-400/10 hover:shadow-[0_0_18px_rgba(14,165,233,0.14)] active:translate-y-0"
    >
      <div className="flex aspect-video items-end rounded-xl border border-white/10 bg-[linear-gradient(135deg,rgba(14,165,233,0.18),rgba(15,23,42,0.9))] shadow-[inset_0_1px_0_rgba(255,255,255,0.055)] transition group-hover:border-sky-200/25 p-2">
        <div className="h-4 w-16 rounded-md bg-white/80" />
      </div>
      <div className="mt-1.5 truncate text-[11px] font-semibold text-white/78">
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
      className="group min-w-[96px] rounded-[16px] border border-white/10 bg-white/[0.035] p-1.5 text-left transition duration-200 hover:-translate-y-0.5 hover:border-emerald-300/35 hover:bg-emerald-400/10 hover:shadow-[0_0_18px_rgba(52,211,153,0.13)] active:translate-y-0"
    >
      <div className="relative aspect-video rounded-xl border border-white/10 bg-[radial-gradient(circle_at_50%_50%,rgba(52,211,153,0.22),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.9),rgba(2,6,23,0.95))] shadow-[inset_0_1px_0_rgba(255,255,255,0.055)] transition group-hover:border-emerald-200/25">
        <div className="absolute bottom-1 right-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[8px] font-black text-white/60">
          0{index}:15
        </div>
      </div>
      <div className="mt-1.5 truncate text-[11px] font-semibold text-white/78">
        {item.label || "Media"}
      </div>
    </button>
  )
}

function SlidesPreviewPanel(): JSX.Element {
  return (
    <DockSection title="Slides" count={12}>
      <div className="rounded-[18px] border border-amber-200/12 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.14),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.018))] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_24px_rgba(251,191,36,0.08)]">
        <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(30,41,59,0.88))]">
          <div className="absolute left-2 top-2 h-1.5 w-10 rounded-full bg-amber-200/70" />
          <div className="absolute left-2 top-5 h-1 w-16 rounded-full bg-white/35" />
          <div className="absolute left-2 top-8 h-1 w-12 rounded-full bg-white/20" />
          <div className="absolute bottom-2 right-2 h-9 w-12 rounded-lg border border-amber-200/20 bg-amber-300/10" />
          <div className="absolute bottom-2 left-2 rounded-full border border-white/10 bg-black/45 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-amber-100/75">
            Slide 04
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-[11px] font-semibold text-white/82">
              Keynote Deck
            </div>
            <div className="mt-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-white/35">
              PPT / PDF Preview
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              className="rounded-lg border border-white/10 bg-white/[0.045] px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/55 transition hover:border-amber-200/25 hover:bg-amber-300/10 hover:text-amber-100"
            >
              Prev
            </button>
            <button
              type="button"
              className="rounded-lg border border-amber-200/20 bg-amber-300/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-amber-100/80 transition hover:border-amber-200/35 hover:bg-amber-300/15"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </DockSection>
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
  const graphicsItems: DockAsset[] = graphics.length ? graphics : FALLBACK_GRAPHICS_ITEMS
  const mediaItems: DockAsset[] = media.length ? media : FALLBACK_MEDIA_ITEMS

  return (
    <div className="mt-3 rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.14),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.08),transparent_32%),linear-gradient(180deg,rgba(8,13,30,0.8),rgba(2,4,10,0.94))] px-3 py-2.5 shadow-[0_28px_100px_rgba(0,0,0,0.46),inset_0_1px_0_rgba(255,255,255,0.065)] backdrop-blur-xl">
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/35">
            Live Asset Dock
          </div>
          <div className="mt-1 text-sm text-white/45">
            Scenes, graphics, media, and transition presets.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <KeyboardShortcutsPanel />
          <TallyIndicators />

          <span className="hidden rounded-full border border-violet-300/20 bg-violet-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-violet-100/80 shadow-[0_0_18px_rgba(168,85,247,0.14)] sm:inline-flex">
            Preview Rail
          </span>
        </div>
      </div>

      <div className="grid gap-2 xl:grid-cols-[1.05fr_0.9fr_0.9fr_1fr_0.8fr]">
        <DockSection title="Scenes" count={scenes.length}>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {scenes.slice(0, 6).map((scene, index) => (
              <SceneTile key={scene.id} scene={scene} index={index} isActive={index === 0} />
            ))}

            <button
              type="button"
              className="min-w-[96px] rounded-[16px] border border-dashed border-white/14 bg-black/20 p-1.5 text-center text-[10px] font-black uppercase tracking-[0.16em] text-white/35 transition hover:border-white/25 hover:bg-white/[0.04]"
            >
              <div className="flex aspect-video items-center justify-center rounded-xl border border-white/10 bg-black/25 text-xl text-white/35">
                +
              </div>
              <div className="mt-1.5">Add Scene</div>
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

        <SlidesPreviewPanel />
        <DockSection title="Transitions" count={TRANSITION_PRESETS.length}>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {TRANSITION_PRESETS.map((transition) => (
                <button
                  key={transition}
                  type="button"
                  className={`rounded-xl border px-2.5 py-2 text-[10px] font-black uppercase tracking-[0.15em] transition hover:-translate-y-0.5 active:translate-y-0 ${
                    transition === "Cut"
                      ? "border-red-300/25 bg-red-400/10 text-red-100/80 shadow-[0_0_16px_rgba(248,113,113,0.12)] hover:border-red-300/40 hover:bg-red-400/15"
                      : "border-white/10 bg-white/[0.04] text-white/65 hover:border-white/20 hover:bg-white/[0.07]"
                  }`}
                >
                  {transition}
                </button>
              ))}
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-1.5">
              <div className="mb-1.5 flex items-center justify-between px-1">
                <span className="text-[8px] font-black uppercase tracking-[0.18em] text-white/32">
                  Duration
                </span>
                <span className="text-[8px] font-black uppercase tracking-[0.18em] text-white/42">
                  Armed
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {TRANSITION_DURATIONS.map((duration) => (
                  <button
                    key={duration}
                    type="button"
                    className={`rounded-lg border px-1.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] transition ${
                      duration === "500ms"
                        ? "border-violet-300/30 bg-violet-400/12 text-violet-100/80 shadow-[0_0_12px_rgba(168,85,247,0.12)]"
                        : "border-white/10 bg-white/[0.035] text-white/45 hover:border-violet-200/20 hover:bg-violet-400/8 hover:text-violet-100/65"
                    }`}
                  >
                    {duration}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </DockSection>
      </div>
    </div>
  )
}``