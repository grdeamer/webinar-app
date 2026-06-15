import { useEffect, useRef, useState, type JSX } from "react"

import OperationsSyncStrip from "./OperationsSyncStrip"
import ProducerRoomHeader from "./ProducerRoomHeader"
import type { CinematicTransitionType } from "./commandDeckTypes"
import type { StageState } from "./producerRoomTypes"

type ProducerRoomTopChromeProps = {
  headline: string
  layout: StageState["layout"] | undefined
  previewProgramDifferent: boolean
  onStageCount: number
  overlayCount: number
  isProgramLive: boolean
  scopeLabel: string
  takeBusy: boolean
  selectedSceneLabel: string | null
  programSlideLabel: string | null
  participantCount: number
  previewBlockCount: number
  programBlockCount: number
  hasProgramSource: boolean
  hasScreenShareRoute: boolean
  lastTakeMode: "cut" | "auto" | null
  hotkeySceneLabelText: string | null
  lastTransportActionAt: number | null
  onTake: (
    mode: "cut" | "auto",
    transitionType?: CinematicTransitionType,
    transitionDurationMs?: number
  ) => void
}

const TOP_CHROME_SHELL_CLASS =
  "group/topchrome relative isolate z-[90] shrink-0 overflow-visible border-b border-white/[0.045] bg-[linear-gradient(180deg,rgba(3,6,12,0.94),rgba(4,7,14,0.72),rgba(2,4,9,0.36))] shadow-[0_10px_28px_rgba(0,0,0,0.22)]"

const TOP_CHROME_TOP_EDGE_CLASS =
  "pointer-events-none absolute inset-x-0 top-0 z-0 h-px bg-gradient-to-r from-transparent via-white/[0.075] to-transparent"

const TOP_CHROME_BOTTOM_EDGE_CLASS =
  "pointer-events-none absolute inset-x-[18%] bottom-0 z-0 h-px bg-gradient-to-r from-transparent via-sky-100/[0.035] to-transparent"

const TOP_CHROME_HUB_BUTTON_CLASS =
  "relative z-[210] flex h-8 min-w-[92px] items-center justify-center gap-2 rounded-full border border-sky-200/[0.18] bg-sky-300/[0.090] px-4 text-[11px] font-black uppercase tracking-[0.12em] text-sky-50/84 shadow-[0_0_22px_rgba(56,189,248,0.08),inset_0_1px_0_rgba(255,255,255,0.040)] backdrop-blur-md transition duration-75 active:scale-[0.94] hover:border-sky-200/32 hover:bg-sky-300/[0.14] hover:text-sky-50"

const TOP_CHROME_HUB_MENU_CLASS =
  "absolute right-0 top-11 z-[220] w-72 origin-top-right overflow-hidden rounded-[18px] border border-white/[0.12] bg-[linear-gradient(180deg,rgba(6,10,18,0.992),rgba(2,4,9,0.998))] p-2 shadow-[0_28px_74px_rgba(0,0,0,0.68),inset_0_1px_0_rgba(255,255,255,0.036)] backdrop-blur-xl"

const TOP_CHROME_PRIMARY_HUB_LINK_CLASS =
  "rounded-[12px] border border-sky-200/[0.10] bg-sky-300/[0.050] px-3 py-2 text-[12px] font-semibold text-sky-50/76 transition hover:border-sky-200/18 hover:bg-sky-300/[0.085] hover:text-white"

const TOP_CHROME_HUB_LINK_CLASS =
  "rounded-[12px] border border-white/[0.06] bg-white/[0.018] px-3 py-2 text-[12px] font-semibold text-white/58 transition hover:border-white/[0.11] hover:bg-white/[0.04] hover:text-white/84"

const TOP_CHROME_STATUS_PILL_CLASS =
  "pointer-events-none flex h-8 min-w-[108px] items-center justify-center gap-2 rounded-full border border-white/[0.09] bg-black/38 px-4 text-[11px] font-black uppercase tracking-[0.12em] text-white/54 shadow-[inset_0_1px_0_rgba(255,255,255,0.030)] backdrop-blur-md"

function TopChromeTransmissionShell({
  isLive,
  children,
}: {
  isLive: boolean
  children: JSX.Element
}): JSX.Element {
  const [hubOpen, setHubOpen] = useState(false)

  const hubRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!hubOpen) return

    function handlePointerDown(event: PointerEvent): void {
      if (!hubRef.current?.contains(event.target as Node)) {
        setHubOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setHubOpen(false)
      }
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [hubOpen])

  return (
    <div className={TOP_CHROME_SHELL_CLASS}>
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 z-0 h-8 transition-opacity duration-700 ${
          isLive
            ? "bg-[radial-gradient(circle_at_50%_0%,rgba(248,113,113,0.038),transparent_68%)] opacity-55"
            : "bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.030),transparent_68%)] opacity-45"
        }`}
      />

      <div className={TOP_CHROME_TOP_EDGE_CLASS} />
      <div className={TOP_CHROME_BOTTOM_EDGE_CLASS} />

      <div className="absolute right-4 top-2.5 z-[120] flex items-center gap-2">
        <div ref={hubRef} className="relative">
          <button
            type="button"
            onClick={() => setHubOpen((current) => !current)}
            className={TOP_CHROME_HUB_BUTTON_CLASS}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-sky-300/80 shadow-[0_0_8px_rgba(125,211,252,0.34)]" />
            Hub
            <span
              className={`text-[10px] text-sky-50/54 transition-transform duration-150 ${
                hubOpen ? "rotate-180" : "rotate-0"
              }`}
            >
              ▾
            </span>
          </button>

          {hubOpen ? (
            <div
              className={TOP_CHROME_HUB_MENU_CLASS}
              style={{
                animation: "producerHubMenuIn 220ms cubic-bezier(0.2, 1.25, 0.32, 1) both",
              }}
            >
              <div className="px-2 pb-2 pt-1 text-[9px] font-black uppercase tracking-[0.16em] text-white/34">
                Producer Utilities
              </div>

              <div className="grid gap-1.5">
                <a href="../" className={TOP_CHROME_PRIMARY_HUB_LINK_CLASS}>
                  Exit Producer
                </a>
                <a href="../../" className={TOP_CHROME_HUB_LINK_CLASS}>
                  Session Overview
                </a>
                <a href="../../../registrants" className={TOP_CHROME_HUB_LINK_CLASS}>
                  Registrants
                </a>
                <a href="../../../emails" className={TOP_CHROME_HUB_LINK_CLASS}>
                  Emails
                </a>
                <a href="../../../" className={TOP_CHROME_HUB_LINK_CLASS}>
                  Event Dashboard
                </a>
              </div>
            </div>
          ) : null}
        </div>

        <div className="h-5 w-px bg-gradient-to-b from-transparent via-white/[0.10] to-transparent" />

        <div className={TOP_CHROME_STATUS_PILL_CLASS}>
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isLive
                ? "bg-red-300/78 shadow-[0_0_8px_rgba(252,165,165,0.25)]"
                : "animate-[producerStandbyPulse_2.6s_ease-in-out_infinite] bg-sky-300/70 shadow-[0_0_8px_rgba(125,211,252,0.18)]"
            }`}
          />

          {isLive ? "Live" : "Standby"}
        </div>
      </div>

      <div className="relative z-0 flex items-start justify-between gap-4 px-0 pb-0">
        <div className="min-w-0 flex-1">
          {children}
        </div>
      </div>

      <style jsx global>{`
        @keyframes topChromeTransmissionSweep {
          0%,
          100% {
            opacity: 0;
            transform: translateX(-18%);
          }

          42% {
            opacity: 0.03;
          }

          100% {
            transform: translateX(18%);
          }
        }

        @keyframes producerHubMenuIn {
          0% {
            opacity: 0;
            transform: translate3d(0, -14px, 0) scale(0.94);
            filter: blur(8px);
          }

          58% {
            opacity: 1;
            transform: translate3d(0, 2px, 0) scale(1.012);
            filter: blur(0);
          }

          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
            filter: blur(0);
          }
        }

        @keyframes producerStandbyPulse {
          0%,
          100% {
            opacity: 0.58;
            transform: scale(1);
          }

          50% {
            opacity: 0.95;
            transform: scale(1.28);
          }
        }
      `}</style>
    </div>
  )
}

export default function ProducerRoomTopChrome({
  headline,
  layout,
  previewProgramDifferent,
  onStageCount,
  overlayCount,
  isProgramLive,
  scopeLabel,
  takeBusy,
  selectedSceneLabel,
  programSlideLabel,
  participantCount,
  previewBlockCount,
  programBlockCount,
  hasProgramSource,
  hasScreenShareRoute,
  lastTakeMode,
  hotkeySceneLabelText,
  lastTransportActionAt,
  onTake,
}: ProducerRoomTopChromeProps): JSX.Element {
  return (
    <TopChromeTransmissionShell isLive={isProgramLive}>
      <div className="space-y-0">
        <ProducerRoomHeader
          headline={headline}
          layout={layout}
          previewProgramDifferent={previewProgramDifferent}
          onStageCount={onStageCount}
          overlayCount={overlayCount}
          isLive={isProgramLive}
          scopeLabel={scopeLabel}
        />

        <div className="hidden h-0 overflow-hidden opacity-0 2xl:block">
          <OperationsSyncStrip
            previewProgramDifferent={previewProgramDifferent}
            takeBusy={takeBusy}
            selectedSceneLabel={selectedSceneLabel}
            programSlideLabel={programSlideLabel}
            onStageCount={onStageCount}
            participantCount={participantCount}
            previewBlockCount={previewBlockCount}
            programBlockCount={programBlockCount}
            hasProgramSource={hasProgramSource}
            hasScreenShare={hasScreenShareRoute}
            lastTakeMode={lastTakeMode}
            lastTransportActionAt={lastTransportActionAt}
            isLive={isProgramLive}
            layout={layout}
          />
        </div>
      </div>
    </TopChromeTransmissionShell>
  )
}