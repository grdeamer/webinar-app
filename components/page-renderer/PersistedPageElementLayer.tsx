"use client"

import { useEffect, useState } from "react"
import ElementVideoPlayer from "@/components/page-renderer/ElementVideoPlayer"
import {
  getButtonElementPresentationStyle,
  getElementAnimationAttribute,
  getElementContentAlignmentStyle,
  getElementFrameStyle,
  getImageElementPresentationStyle,
  getResponsiveVisibilityClass,
  getTextElementPresentationStyle,
  getVideoElementPresentationStyle,
  parseGeneralSessionProgramSource,
  resolveElementVideoSource,
  type GeneralSessionPresentationSource,
} from "@/lib/page-editor/elementPresentation"
import type { EventPageElement } from "@/lib/page-editor/sectionTypes"

function PersistedVideoPresentation({
  element,
  generalSession,
}: {
  element: EventPageElement
  generalSession: GeneralSessionPresentationSource
}) {
  const props = element.props ?? {}
  const source = resolveElementVideoSource(element, generalSession)
  const posterUrl = String(props.posterUrl ?? "")
  const showControls = Boolean(props.controls ?? true)
  const autoPlay = Boolean(props.autoplay ?? false)
  const playOnHover = Boolean(props.playOnHover ?? true)
  const showPosterOnCard = Boolean(props.showPosterOnCard ?? true)
  const muted =
    typeof props.muted === "boolean" ? props.muted : autoPlay
  const videoStyle = getVideoElementPresentationStyle(element)

  if (showControls) {
    if (source.url) {
      return (
        <ElementVideoPlayer
          url={source.url}
          sourceType={source.sourceType}
          className="h-full w-full"
          style={videoStyle}
          autoPlay={autoPlay}
          muted={muted}
          controls
          loop={Boolean(props.loop ?? false)}
          poster={posterUrl}
          trimStart={Number(props.trimStart ?? 0)}
          trimEnd={Number(props.trimEnd ?? 0)}
          accessibleLabel={element.content || "Session Video"}
        />
      )
    }

    return posterUrl ? (
      <img
        src={posterUrl}
        alt={element.content || "Video poster"}
        className="h-full w-full"
        style={videoStyle}
        draggable={false}
      />
    ) : (
      <div className="flex h-full w-full items-center justify-center text-sm text-white/50">
        Video block
      </div>
    )
  }

  return (
    <div className="group relative h-full w-full overflow-hidden bg-black">
      {source.url ? (
        <ElementVideoPlayer
          url={source.url}
          sourceType={source.sourceType}
          className="h-full w-full transition-transform duration-500 group-hover:scale-105"
          style={videoStyle}
          autoPlay={autoPlay}
          muted={
            typeof props.muted === "boolean" ? props.muted : true
          }
          controls={false}
          loop={Boolean(props.loop ?? false)}
          poster={showPosterOnCard ? posterUrl : ""}
          trimStart={Number(props.trimStart ?? 0)}
          trimEnd={Number(props.trimEnd ?? 0)}
          playOnHover={playOnHover}
          accessibleLabel={element.content || "Session Video"}
          showPlaybackIndicator
        />
      ) : posterUrl ? (
        <img
          src={posterUrl}
          alt={element.content || "Video poster"}
          className="h-full w-full transition-transform duration-500 group-hover:scale-105"
          style={videoStyle}
          draggable={false}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-sm text-white/50">
          Video block
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 bg-black/40 transition group-hover:bg-black/30" />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent" />

      <div className="pointer-events-none absolute bottom-3 left-4 right-4 z-20">
        <div className="flex items-center gap-2">
          {Boolean(props.isLive) ? (
            <span className="inline-flex rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white shadow-lg">
              LIVE
            </span>
          ) : null}

          <div className="text-sm font-semibold text-white drop-shadow">
            {element.content || "Session Video"}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PersistedPageElementLayer({
  elements,
}: {
  elements: EventPageElement[]
}) {
  const [generalSession, setGeneralSession] =
    useState<GeneralSessionPresentationSource>(null)
  const usesGeneralSession = elements.some(
    (element) =>
      element.visible !== false &&
      element.element_type === "video" &&
      element.props?.useGeneralSession === true
  )

  useEffect(() => {
    if (!usesGeneralSession) return

    const abortController = new AbortController()

    async function loadGeneralSession() {
      try {
        const response = await fetch("/api/general-session/program", {
          cache: "no-store",
          signal: abortController.signal,
        })
        if (!response.ok) return

        const data: unknown = await response.json()
        setGeneralSession(parseGeneralSessionProgramSource(data))
      } catch {
        if (!abortController.signal.aborted) setGeneralSession(null)
      }
    }

    void loadGeneralSession()

    return () => {
      abortController.abort()
    }
  }, [usesGeneralSession])

  const resolvedGeneralSession = usesGeneralSession ? generalSession : null

  return elements
    .filter((element) => element.visible !== false)
    .map((element) => (
      <div
        key={element.id}
        data-page-element-id={element.id}
        data-page-element-type={element.element_type ?? "text"}
        data-element-animation={getElementAnimationAttribute(element)}
        className={`absolute overflow-hidden rounded-xl ${getResponsiveVisibilityClass(
          element.props?.hideOnMobile
        )} ${
          element.element_type === "image"
            ? "bg-white"
            : element.element_type === "video"
              ? "bg-black"
              : element.element_type === "pdf"
                ? "bg-red-950/90 text-white"
                : element.element_type === "button"
                  ? "bg-transparent"
                  : element.element_type === "spacer"
                    ? "border border-dashed border-white/20 bg-white/5"
                    : ""
        }`}
        style={getElementFrameStyle(element)}
      >
        {element.element_type === "image" ? (
          <img
            src={String(
              element.props?.src ?? "https://placehold.co/800x450/png"
            )}
            alt={String(element.props?.alt ?? "Image block")}
            className="h-full w-full"
            style={getImageElementPresentationStyle(element)}
            draggable={false}
          />
        ) : element.element_type === "video" ? (
          <PersistedVideoPresentation
            element={element}
            generalSession={resolvedGeneralSession}
          />
        ) : element.element_type === "pdf" ? (
          <div className="flex h-full w-full flex-col justify-between p-4">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-white/50">
                PDF
              </div>
              <div className="mt-2 text-base font-semibold">
                {element.content}
              </div>
            </div>
            <div className="mt-4 break-all text-xs text-white/70">
              {String(element.props?.url ?? "")}
            </div>
          </div>
        ) : element.element_type === "button" ? (
          <div
            className="flex h-full w-full"
            style={getElementContentAlignmentStyle(element)}
          >
            <a
              href={String(element.props?.href ?? "#")}
              className="no-underline"
              style={getButtonElementPresentationStyle(element)}
            >
              {element.content || "Button"}
            </a>
          </div>
        ) : element.element_type === "spacer" ? (
          <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-[0.18em] text-white/40">
            Spacer
          </div>
        ) : (
          <div
            className="h-full w-full whitespace-pre-wrap"
            style={getTextElementPresentationStyle(element)}
          >
            {element.content}
          </div>
        )}
      </div>
    ))
}
