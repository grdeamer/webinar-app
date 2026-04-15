"use client"

import { useEffect, useState } from "react"
import GlobeMoment from "@/components/live/GlobeMoment"

type ProgramMomentOverlayProps = {
  visible: boolean
  region: string | null
  moonMode: boolean
  questionLabel: string | null
  lat?: number | null
  lng?: number | null
  treatment?: "default" | "qa_origin_blend" | null
}

export default function ProgramMomentOverlay({
  visible,
  region,
  moonMode,
  questionLabel,
  lat,
  lng,
  treatment = "default",
}: ProgramMomentOverlayProps) {
  const [renderOverlay, setRenderOverlay] = useState(visible)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    if (visible) {
      setRenderOverlay(true)
      setIsExiting(false)
      return
    }

    if (!renderOverlay) {
      return
    }

    setIsExiting(true)

    const timer = window.setTimeout(() => {
      setRenderOverlay(false)
      setIsExiting(false)
    }, 500)

    return () => {
      window.clearTimeout(timer)
    }
  }, [visible, renderOverlay])

  if (!renderOverlay) {
    return null
  }

  const resolvedRegion = region || "Europe"
  const isBlend = treatment === "qa_origin_blend"

  return (
    <div
      className="pointer-events-none absolute inset-0 z-30 overflow-hidden"
      style={{
        animation: isExiting
          ? "jupiterCueFadeOut 500ms ease forwards"
          : "jupiterCueFadeIn 500ms ease forwards",
      }}
    >
      <style jsx global>{`
        @keyframes jupiterCueFadeIn {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }

        @keyframes jupiterCueFadeOut {
          0% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }

        @keyframes overlayDriftIn {
          0% {
            opacity: 0;
            transform: translate3d(42px, -34px, 0) scale(0.96);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }
      `}</style>

      {isBlend ? (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_34%,rgba(56,189,248,0.08),transparent_24%),radial-gradient(circle_at_82%_22%,rgba(99,102,241,0.12),transparent_28%),radial-gradient(circle_at_center,rgba(2,6,23,0.02),rgba(2,6,23,0.36)_56%,rgba(2,6,23,0.78))]" />

          <div className="absolute inset-x-0 top-0 h-[42%] bg-[linear-gradient(180deg,rgba(2,6,23,0.34),rgba(2,6,23,0))]" />
          <div className="absolute inset-x-0 bottom-0 h-[34%] bg-[linear-gradient(180deg,rgba(2,6,23,0),rgba(2,6,23,0.5))]" />

          <div className="absolute right-[8%] top-[10%] h-72 w-72 rounded-full bg-sky-400/10 blur-3xl" />
          <div className="absolute right-[18%] top-[18%] h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl" />

          <div className="absolute inset-0 flex items-start justify-end px-6 pt-2">
            <div
              className="w-full max-w-[1220px]"
              style={{
                animation: isExiting
                  ? undefined
                  : "overlayDriftIn 900ms cubic-bezier(0.22,1,0.36,1) both",
                maskImage:
                  "radial-gradient(circle at 72% 38%, black 0%, black 28%, rgba(0,0,0,0.92) 48%, rgba(0,0,0,0.55) 68%, transparent 88%)",
                WebkitMaskImage:
                  "radial-gradient(circle at 72% 38%, black 0%, black 28%, rgba(0,0,0,0.92) 48%, rgba(0,0,0,0.55) 68%, transparent 88%)",
              }}
            >
              <GlobeMoment
                region={resolvedRegion}
                moonMode={moonMode}
                questionLabel={questionLabel}
                lat={lat}
                lng={lng}
              />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_28%,rgba(56,189,248,0.08),transparent_22%),radial-gradient(circle_at_center,rgba(2,6,23,0.02),rgba(2,6,23,0.28)_52%,rgba(2,6,23,0.72))]" />

          <div className="absolute inset-x-0 top-0 h-[32%] bg-[linear-gradient(180deg,rgba(2,6,23,0.28),rgba(2,6,23,0))]" />

          <div className="absolute inset-0 flex items-start justify-end px-6 pt-6">
            <div
              className="w-full max-w-[980px]"
              style={{
                animation: isExiting
                  ? undefined
                  : "overlayDriftIn 760ms cubic-bezier(0.22,1,0.36,1) both",
                maskImage:
                  "radial-gradient(circle at 70% 34%, black 0%, black 32%, rgba(0,0,0,0.82) 54%, rgba(0,0,0,0.42) 74%, transparent 92%)",
                WebkitMaskImage:
                  "radial-gradient(circle at 70% 34%, black 0%, black 32%, rgba(0,0,0,0.82) 54%, rgba(0,0,0,0.42) 74%, transparent 92%)",
              }}
            >
              <GlobeMoment
                region={resolvedRegion}
                moonMode={moonMode}
                questionLabel={questionLabel}
                lat={lat}
                lng={lng}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}