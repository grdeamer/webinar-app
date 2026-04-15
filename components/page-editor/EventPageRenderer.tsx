"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import type {
  SectionConfig,
  SectionType,
  SectionBlock,
  SystemComponentKey,
  EventTheme,
} from "@/lib/page-editor/sectionTypes"

type EventLike = {
  title: string
  description?: string | null
}

type EditorElement = {
  id: string
  element_type?: string
  content: string
  x: number
  y: number
  width?: number | null
  height?: number | null
  z_index?: number
  props?: Record<string, unknown>
}

type EventPageSection = {
  id: string
  type: SectionType
  config: SectionConfig
  blocks?: SectionBlock[]
}

type GeneralSessionData = {
  title?: string | null
  sourceType?: string | null
  mp4Url?: string | null
  hlsUrl?: string | null
  playbackUrl?: string | null
} | null

type SystemComponentsMap = Partial<Record<SystemComponentKey, ReactNode>>

function getWidthClass(width?: EventPageSection["config"]["contentWidth"]) {
  switch (width) {
    case "md":
      return "max-w-3xl"
    case "lg":
      return "max-w-4xl"
    case "full":
      return "max-w-none"
    case "xl":
    default:
      return "max-w-6xl"
  }
}

function getPaddingYClass(paddingY?: EventPageSection["config"]["paddingY"]) {
  switch (paddingY) {
    case "sm":
      return "py-6"
    case "lg":
      return "py-14"
    case "md":
    default:
      return "py-8"
  }
}

function getTextAlignClass(textAlign?: EventPageSection["config"]["textAlign"]) {
  switch (textAlign) {
    case "center":
      return "text-center"
    case "left":
    default:
      return "text-left"
  }
}

function getSectionOuterBackgroundClass(
  backgroundStyle?: EventPageSection["config"]["backgroundStyle"],
  sectionType?: EventPageSection["type"]
) {
  if (sectionType === "hero") {
    switch (backgroundStyle) {
      case "transparent":
        return "bg-transparent"
      case "panel":
        return "bg-white/10"
      case "subtle":
      default:
        return "bg-white/5"
    }
  }

  switch (backgroundStyle) {
    case "subtle":
      return "bg-white/[0.02]"
    case "transparent":
    case "panel":
    default:
      return "bg-transparent"
  }
}

function getContentCardClass(backgroundStyle?: EventPageSection["config"]["backgroundStyle"]) {
  switch (backgroundStyle) {
    case "transparent":
      return ""
    case "subtle":
      return "rounded-3xl border border-white/10 bg-white/[0.03] p-10"
    case "panel":
    default:
      return "rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-10"
  }
}

function hasTopDivider(divider?: EventPageSection["config"]["divider"]) {
  return divider === "top" || divider === "both"
}

function hasBottomDivider(divider?: EventPageSection["config"]["divider"]) {
  return divider === "bottom" || divider === "both"
}

function getResolvedGeneralSessionUrl(generalSession?: GeneralSessionData) {
  if (!generalSession) return ""

  return String(
    generalSession.playbackUrl ||
      (generalSession.sourceType === "hls" ? generalSession.hlsUrl : generalSession.mp4Url) ||
      generalSession.hlsUrl ||
      generalSession.mp4Url ||
      ""
  )
}

function getVideoSource(el: EditorElement, generalSession?: GeneralSessionData) {
  const useGeneralSession = Boolean(el.props?.useGeneralSession)

  if (useGeneralSession && generalSession) {
    const gsType = String(generalSession.sourceType ?? "mp4")
    const gsUrl = getResolvedGeneralSessionUrl(generalSession)

    if (gsUrl) {
      return {
        url: gsUrl,
        sourceType: gsType,
      }
    }
  }

  return {
    url: String(el.props?.url ?? ""),
    sourceType: String(el.props?.sourceType ?? "mp4"),
  }
}

function getFallbackSections(event: EventLike): EventPageSection[] {
  return [
    {
      id: "hero",
      type: "hero",
      config: {
        visible: true,
        title: event.title,
        body: event.description ?? null,
        adminLabel: "Hero",
        backgroundStyle: "subtle",
        contentWidth: "xl",
        paddingY: "lg",
        textAlign: "left",
        divider: "bottom",
        hideOnMobile: false,
      },
      blocks: [],
    },
    {
      id: "content",
      type: "content",
      config: {
        visible: true,
        title: "Main Content",
        body: "",
        adminLabel: "Main Content",
        backgroundStyle: "panel",
        contentWidth: "xl",
        paddingY: "md",
        textAlign: "left",
        divider: "none",
        hideOnMobile: false,
      },
      blocks: [],
    },
  ]
}

function getSystemComponentPlaceholderLabel(componentKey: SystemComponentKey) {
  switch (componentKey) {
    case "live_state":
      return "Live Status"
    case "stage_player":
      return "Stage Player"
    case "sessions_list":
      return "Sessions List"
    case "agenda":
      return "Agenda"
    case "countdown":
      return "Countdown"
    case "speaker_cards":
      return "Speaker Cards"
    case "speaker_spotlight":
      return "Speaker Spotlight"
    case "schedule_rail":
      return "Schedule Rail"
    case "chat":
      return "Chat"
    case "qa":
      return "Q&A"
    case "join_button":
      return "Join Button"
    case "access_gate":
      return "Access Gate"
    case "sponsors":
      return "Sponsors"
    case "breakouts":
      return "Breakouts"
    case "featured_breakouts":
      return "Featured Breakouts"
    default:
      return componentKey
  }
}

function getSystemComponentCardClass(style?: "none" | "panel" | "subtle") {
  switch (style) {
    case "none":
      return ""
    case "subtle":
      return "rounded-2xl border border-dashed border-sky-400/30 bg-sky-400/5 p-5"
    case "panel":
    default:
      return "rounded-2xl border border-dashed border-sky-400/40 bg-sky-400/10 p-5"
  }
}

function renderSystemComponentLive(
  componentKey: SystemComponentKey,
  generalSession?: GeneralSessionData
) {
  const generalSessionUrl = getResolvedGeneralSessionUrl(generalSession)

  switch (componentKey) {
    case "stage_player":
      return (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
          {generalSessionUrl ? (
            <video
              src={generalSessionUrl}
              className="h-full w-full object-cover"
              controls
              autoPlay
              playsInline
            />
          ) : (
            <div className="p-10 text-center text-white/50">No active stream</div>
          )}
        </div>
      )

    case "live_state":
      return (
        <div className="flex items-center gap-2 text-sm">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
          <span className="text-white/80">Live Now</span>
        </div>
      )

    case "countdown":
      return (
        <div className="text-sm text-white/70">
          Countdown component (connect to event start time next)
        </div>
      )

case "agenda":
  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-white">Event Agenda</div>
      <div className="text-sm text-white/60">
        Agenda will render from your injected event page data.
      </div>
    </div>
  )

case "sessions_list":
  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-white">Sessions</div>
      <div className="text-sm text-white/60">
        Sessions list will render from your injected event page data.
      </div>
    </div>
  )

    case "speaker_spotlight":
      return (
        <div className="rounded-xl bg-white/5 p-4 text-sm text-white/60">
          Speaker spotlight will render here
        </div>
      )

    case "speaker_cards":
      return (
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-white/5 p-4 text-sm text-white/60">
            Speaker Grid (coming next)
          </div>
          <div className="rounded-xl bg-white/5 p-4 text-sm text-white/60">
            Speaker Grid
          </div>
        </div>
      )

    case "sponsors":
      return <div className="text-sm text-white/60">Sponsor logos will render here</div>

    case "breakouts":
    case "featured_breakouts":
      return (
        <div className="text-sm text-white/60">Breakout sessions (dynamic routing next)</div>
      )

    case "chat":
      return <div className="text-sm text-white/60">Chat module</div>

    case "qa":
      return <div className="text-sm text-white/60">Q&amp;A module</div>

    case "join_button":
      return (
        <button className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
          Join Session
        </button>
      )

    case "access_gate":
  return (
    <div className="text-sm text-white/60">
      Access gate will render from your injected event page data.
    </div>
  )
    case "schedule_rail":
      return <div className="text-sm text-white/60">Schedule rail will render here</div>

    default:
      return null
  }
}

function renderSectionBlock(
  block: SectionBlock,
  isEditing: boolean,
  generalSession?: GeneralSessionData,
  systemComponents?: SystemComponentsMap
) {
  if (block.type === "rich_text") {
    return (
      <div
        key={block.id}
        className={block.props.align === "center" ? "text-center" : "text-left"}
      >
        {block.props.title ? (
          <h3 className="text-xl font-semibold text-white">{block.props.title}</h3>
        ) : null}

        {block.props.body ? (
          <div
            className={
              block.props.title
                ? "mt-3 whitespace-pre-wrap text-white/70"
                : "whitespace-pre-wrap text-white/70"
            }
          >
            {block.props.body}
          </div>
        ) : null}
      </div>
    )
  }

  if (block.type === "system_component") {
    const label = getSystemComponentPlaceholderLabel(block.props.componentKey)
    const cardClass = getSystemComponentCardClass(block.props.containerStyle ?? "panel")
    const injectedComponent = systemComponents?.[block.props.componentKey]
    const liveComponent =
      injectedComponent ?? renderSystemComponentLive(block.props.componentKey, generalSession)

    return (
      <div key={block.id} className={cardClass || undefined}>
        {liveComponent ?? <div className="text-sm text-white/50">{label}</div>}

        {isEditing ? (
          <div className="mt-3 text-[10px] uppercase tracking-[0.16em] text-sky-200/80">
            {block.props.componentKey}
          </div>
        ) : null}
      </div>
    )
  }

  return null
}

function VideoPlayer({
  url,
  sourceType = "mp4",
  className = "",
  controls = true,
  autoPlay = false,
  muted = false,
  playsInline = true,
  loop = false,
  trimStart = 0,
  trimEnd = 0,
  onPlay,
  onPause,
  onEnded,
}: {
  url: string
  sourceType?: string
  className?: string
  controls?: boolean
  autoPlay?: boolean
  muted?: boolean
  playsInline?: boolean
  loop?: boolean
  trimStart?: number
  trimEnd?: number
  onPlay?: () => void
  onPause?: () => void
  onEnded?: () => void
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    let destroyed = false
    let hlsInstance: any = null

    async function setup() {
      const video = videoRef.current
      if (!video || !url) return

      try {
        video.pause()
      } catch {}

      video.removeAttribute("src")
      video.load()

      if (sourceType !== "hls") {
        video.src = url
        video.load()
        return
      }

      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = url
        video.load()
        return
      }

      try {
        const mod = await import("hls.js")
        if (destroyed) return

        const Hls = mod.default
        if (Hls.isSupported()) {
          hlsInstance = new Hls()
          hlsInstance.loadSource(url)
          hlsInstance.attachMedia(video)
        } else {
          video.src = url
          video.load()
        }
      } catch {
        video.src = url
        video.load()
      }
    }

    void setup()

    return () => {
      destroyed = true
      if (hlsInstance) hlsInstance.destroy()
    }
  }, [url, sourceType])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const startAt = trimStart > 0 ? trimStart : 0

    const handleLoadedMetadata = () => {
      try {
        if (startAt > 0) {
          video.currentTime = startAt
        }
      } catch {}
    }

    const handleCanPlay = async () => {
      if (!autoPlay) return

      try {
        if (Math.abs(video.currentTime - startAt) > 0.25) {
          video.currentTime = startAt
        }
      } catch {}

      try {
        await video.play()
      } catch {}
    }

    const handleTimeUpdate = () => {
      if (trimEnd > 0 && video.currentTime >= trimEnd) {
        if (loop) {
          try {
            video.currentTime = startAt
            void video.play()
          } catch {}
        } else {
          video.pause()
          onEnded?.()
        }
      }
    }

    const handleEnded = async () => {
      if (trimEnd > 0) {
        onEnded?.()
        return
      }

      if (!loop) {
        onEnded?.()
        return
      }

      try {
        video.currentTime = startAt
        await video.play()
      } catch {}

      onEnded?.()
    }

    const handlePlay = () => onPlay?.()
    const handlePause = () => onPause?.()

    video.addEventListener("loadedmetadata", handleLoadedMetadata)
    video.addEventListener("canplay", handleCanPlay)
    video.addEventListener("timeupdate", handleTimeUpdate)
    video.addEventListener("ended", handleEnded)
    video.addEventListener("play", handlePlay)
    video.addEventListener("pause", handlePause)

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata)
      video.removeEventListener("canplay", handleCanPlay)
      video.removeEventListener("timeupdate", handleTimeUpdate)
      video.removeEventListener("ended", handleEnded)
      video.removeEventListener("play", handlePlay)
      video.removeEventListener("pause", handlePause)
    }
  }, [autoPlay, loop, trimStart, trimEnd, url, onPlay, onPause, onEnded])

  return (
    <video
      ref={videoRef}
      className={className}
      controls={controls}
      autoPlay={autoPlay}
      muted={muted}
      playsInline={playsInline}
      loop={loop && trimEnd <= 0}
      preload="auto"
    />
  )
}

export default function EventPageRenderer({
  event,
  elements,
  mode = "live",
  sections,
  isEditing = false,
  selectedSectionId = null,
  onSelectSection,
  isMobilePreview = false,
  generalSession = null,
  systemComponents = {},
  eventTheme,
}: {
  event: EventLike
  elements: EditorElement[]
  mode?: "live" | "editor"
  sections?: EventPageSection[]
  isEditing?: boolean
  selectedSectionId?: string | null
  onSelectSection?: (id: string | null) => void
  isMobilePreview?: boolean
  generalSession?: GeneralSessionData
  systemComponents?: SystemComponentsMap
  eventTheme?: EventTheme
}) {
  const resolvedSections = sections && sections.length > 0 ? sections : getFallbackSections(event)
    const resolvedEventTheme: EventTheme = {
    pageBackgroundColor: eventTheme?.pageBackgroundColor || "#020617",
    panelBackgroundColor: eventTheme?.panelBackgroundColor || "#0f172a",
    panelBorderColor: eventTheme?.panelBorderColor || "rgba(255,255,255,0.10)",
    textColor: eventTheme?.textColor || "#ffffff",
    gradientColorA: eventTheme?.gradientColorA || "#0f172a",
    gradientColorB: eventTheme?.gradientColorB || "#1d4ed8",
    gradientAngle: eventTheme?.gradientAngle || "135deg",
  }
  const resolvedGeneralSessionUrl = getResolvedGeneralSessionUrl(generalSession)

  const [activeVideo, setActiveVideo] = useState<EditorElement | null>(null)
  const [playingMap, setPlayingMap] = useState<Record<string, boolean>>({})

  return (
    <>
      <div
  className="relative min-h-[900px] overflow-hidden rounded-3xl border text-white"
  style={{
    backgroundColor: resolvedEventTheme.pageBackgroundColor,
    borderColor: resolvedEventTheme.panelBorderColor,
    color: resolvedEventTheme.textColor,
  }}
>
{resolvedSections.map((section, index) => {
  const config = section.config ?? {}

  const themeMode =
    typeof config.themeMode === "string" && config.themeMode.trim()
      ? config.themeMode
      : "inherit"

  const fillType =
    themeMode === "custom" &&
    typeof config.sectionBackgroundFillType === "string" &&
    config.sectionBackgroundFillType.trim()
      ? config.sectionBackgroundFillType
      : "solid"

  const sectionBackgroundColor =
    themeMode === "custom"
      ? typeof config.sectionBackgroundColor === "string" && config.sectionBackgroundColor.trim()
        ? config.sectionBackgroundColor
        : undefined
      : resolvedEventTheme.panelBackgroundColor

  const sectionBorderColor =
    themeMode === "custom"
      ? typeof config.sectionBorderColor === "string" && config.sectionBorderColor.trim()
        ? config.sectionBorderColor
        : undefined
      : resolvedEventTheme.panelBorderColor

  const sectionTextColor =
    themeMode === "custom"
      ? typeof config.sectionTextColor === "string" && config.sectionTextColor.trim()
        ? config.sectionTextColor
        : undefined
      : resolvedEventTheme.textColor

  const sectionGradientColorA =
    themeMode === "custom"
      ? typeof config.sectionGradientColorA === "string" && config.sectionGradientColorA.trim()
        ? config.sectionGradientColorA
        : resolvedEventTheme.gradientColorA || "#0f172a"
      : resolvedEventTheme.gradientColorA || "#0f172a"

  const sectionGradientColorB =
    themeMode === "custom"
      ? typeof config.sectionGradientColorB === "string" && config.sectionGradientColorB.trim()
        ? config.sectionGradientColorB
        : resolvedEventTheme.gradientColorB || "#1d4ed8"
      : resolvedEventTheme.gradientColorB || "#1d4ed8"

  const sectionGradientAngle =
    themeMode === "custom"
      ? typeof config.sectionGradientAngle === "string" && config.sectionGradientAngle.trim()
        ? config.sectionGradientAngle
        : resolvedEventTheme.gradientAngle || "135deg"
      : resolvedEventTheme.gradientAngle || "135deg"

  const sectionBackgroundImage =
    themeMode === "custom"
      ? fillType === "linear-gradient"
        ? `linear-gradient(${sectionGradientAngle}, ${sectionGradientColorA}, ${sectionGradientColorB})`
        : fillType === "radial-gradient"
        ? `radial-gradient(circle at center, ${sectionGradientColorA}, ${sectionGradientColorB})`
        : undefined
      : undefined

  if (config.visible === false) return null
  if (isMobilePreview && config.hideOnMobile) return null

  const widthClass = getWidthClass(config.contentWidth)
  const paddingYClass = getPaddingYClass(config.paddingY)
  const textAlignClass = getTextAlignClass(config.textAlign)
  const isSelected = selectedSectionId === section.id
  const isEditorClickable = isEditing || mode === "editor"
  const showTopDivider = hasTopDivider(config.divider)
  const showBottomDivider = hasBottomDivider(config.divider)

  if (section.type === "hero") {
    return (
<div
  key={`${section.type}-${section.id}-${index}`}
  data-section-id={section.id}
  onClick={(e) => {
    e.stopPropagation()
    if (isEditorClickable) onSelectSection?.(section.id)
  }}
  onDoubleClick={(e) => {
    e.stopPropagation()
    if (!isEditorClickable) return
    onSelectSection?.(section.id)
  }}
        className={`${getSectionOuterBackgroundClass(
          config.backgroundStyle,
          section.type
        )} px-8 ${paddingYClass} ${
          isEditorClickable ? "cursor-pointer" : ""
        } ${isSelected ? "ring-2 ring-inset ring-sky-400" : ""} ${
          showTopDivider ? "border-t border-white/10" : ""
        } ${showBottomDivider ? "border-b border-white/10" : ""}`}
        style={{
          backgroundColor: fillType === "solid" ? sectionBackgroundColor : undefined,
          backgroundImage: sectionBackgroundImage,
          borderColor: sectionBorderColor,
          color: sectionTextColor,
        }}
      >
        <div
  className={`mx-auto ${widthClass} ${textAlignClass}`}
  onDoubleClick={(e) => {
    e.stopPropagation()
    if (!isEditorClickable) return
    onSelectSection?.(section.id)
  }}
>
          <div className="text-xs uppercase tracking-[0.22em] text-white/40">
            Event Page
          </div>

          <h1
            className="mt-3 text-4xl font-bold"
            style={{ color: sectionTextColor }}
          >
            {config.title || event.title}
          </h1>

          {config.body ? (
            <p
              className={`mt-4 whitespace-pre-wrap ${
                config.textAlign === "center" ? "mx-auto max-w-3xl" : "max-w-3xl"
              }`}
              style={{ color: sectionTextColor }}
            >
              {config.body}
            </p>
          ) : null}

          {section.blocks?.length ? (
            <div className="mt-6 space-y-4">
              {section.blocks.map((block) =>
                renderSectionBlock(
                  block,
                  isEditing || mode === "editor",
                  generalSession,
                  systemComponents
                )
              )}
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  const cardClass = getContentCardClass(config.backgroundStyle)

  return (
    <div
      key={`${section.type}-${section.id}-${index}`}
      data-section-id={section.id}
      onClick={(e) => {
        e.stopPropagation()
        if (isEditorClickable) onSelectSection?.(section.id)
      }}
      className={`px-8 ${paddingYClass} ${
        isEditorClickable ? "cursor-pointer" : ""
      } ${isSelected ? "ring-2 ring-inset ring-sky-400" : ""} ${getSectionOuterBackgroundClass(
        config.backgroundStyle,
        section.type
      )} ${showTopDivider ? "border-t border-white/10" : ""} ${
        showBottomDivider ? "border-b border-white/10" : ""
      }`}
    >
      <div className={`mx-auto ${widthClass}`}>
 <div
  className={cardClass || undefined}
  onDoubleClick={(e) => {
    e.stopPropagation()
    if (!isEditorClickable) return
    onSelectSection?.(section.id)
  }}
  style={{
    backgroundColor: fillType === "solid" ? sectionBackgroundColor : undefined,
    backgroundImage: sectionBackgroundImage,
    borderColor: sectionBorderColor,
    color: sectionTextColor,
  }}
>
          <div className={textAlignClass}>
            {config.title ? (
              <h2
                className="text-2xl font-semibold"
                style={{ color: sectionTextColor }}
              >
                {config.title}
              </h2>
            ) : null}

            {config.body ? (
              <div
                className={config.title ? "mt-4 whitespace-pre-wrap" : "whitespace-pre-wrap"}
                style={{ color: sectionTextColor }}
              >
                {config.body}
              </div>
            ) : null}
          </div>

          {section.blocks?.length ? (
            <div className={config.title || config.body ? "mt-6 space-y-4" : "space-y-4"}>
              {section.blocks.map((block) =>
                renderSectionBlock(
                  block,
                  isEditing || mode === "editor",
                  generalSession,
                  systemComponents
                )
              )}
            </div>
          ) : !config.title && !config.body ? (
            <div className="text-white/30">Add blocks to this section from the editor.</div>
          ) : null}
        </div>
      </div>
    </div>
  )
})}

        {elements
          .filter((el) => !(isMobilePreview && Boolean(el.props?.hideOnMobile)))
          .map((el) => {
            const videoSource =
              el.element_type === "video" ? getVideoSource(el, generalSession) : null

            const imageFit = String(el.props?.imageFit ?? "cover")
            const imagePosition = String(el.props?.imagePosition ?? "center")
            const showPosterOnCard = Boolean(el.props?.showPosterOnCard ?? true)
            const posterUrl = String(el.props?.posterUrl ?? "")
            const playOnHover = Boolean(el.props?.playOnHover ?? true)
            const hoverPreviewEnabled = mode === "live" && playOnHover && Boolean(videoSource?.url)
            const showControls = Boolean(el.props?.controls ?? true)
            const shouldLoop = Boolean(el.props?.loop ?? false)
            const isPlaying = Boolean(playingMap[el.id])

            return (
              <div
                key={el.id}
                className={`absolute overflow-hidden rounded-xl shadow-lg ${
                  el.element_type === "image"
                    ? "bg-white"
                    : el.element_type === "video"
                    ? "bg-black"
                    : el.element_type === "pdf"
                    ? "bg-red-950/90 text-white"
                    : el.element_type === "button"
                    ? "bg-transparent"
                    : el.element_type === "spacer"
                    ? "border border-dashed border-white/20 bg-white/5"
                    : "bg-amber-400 text-black"
                } ${mode === "editor" ? "pointer-events-none" : ""}`}
                style={{
                  left: el.x,
                  top: el.y,
                  zIndex: el.z_index ?? 1,
                  width: el.width ?? "auto",
                  height: el.height ?? "auto",
                }}
              >
                {el.element_type === "image" ? (
                  <img
                    src={String(el.props?.src ?? "https://placehold.co/800x450/png")}
                    alt={String(el.props?.alt ?? "Image block")}
                    className={`h-full w-full ${
                      imageFit === "contain" ? "object-contain" : "object-cover"
                    } ${
                      imagePosition === "top"
                        ? "object-top"
                        : imagePosition === "bottom"
                        ? "object-bottom"
                        : imagePosition === "left"
                        ? "object-left"
                        : imagePosition === "right"
                        ? "object-right"
                        : "object-center"
                    }`}
                    draggable={false}
                  />
                ) : el.element_type === "video" ? (
                  showControls ? (
                    <div className="relative h-full w-full bg-black">
                      {Boolean(videoSource?.url) ? (
                        <VideoPlayer
                          url={String(videoSource?.url ?? "")}
                          sourceType={String(videoSource?.sourceType ?? "mp4")}
                          className="h-full w-full object-cover"
                          muted={Boolean(el.props?.autoplay ?? false)}
                          playsInline
                          autoPlay={Boolean(el.props?.autoplay ?? false)}
                          controls
                          trimStart={Number(el.props?.trimStart ?? 0)}
                          trimEnd={Number(el.props?.trimEnd ?? 0)}
                          loop={shouldLoop}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm text-white/50">
                          Video block
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (mode !== "editor") setActiveVideo(el)
                      }}
                      className="relative block h-full w-full bg-black text-left"
                    >
                      {String(videoSource?.url ?? "") || posterUrl ? (
                        <div className="group relative h-full w-full overflow-hidden">
                          <div className="relative h-full w-full">
                            {Boolean(videoSource?.url) ? (
                              <VideoPlayer
                                url={String(videoSource?.url ?? "")}
                                sourceType={String(videoSource?.sourceType ?? "mp4")}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                muted
                                playsInline
                                autoPlay={hoverPreviewEnabled}
                                controls={false}
                                trimStart={Number(el.props?.trimStart ?? 0)}
                                trimEnd={Number(el.props?.trimEnd ?? 0)}
                                loop={shouldLoop}
                                onPlay={() =>
                                  setPlayingMap((prev) => ({ ...prev, [el.id]: true }))
                                }
                                onPause={() =>
                                  setPlayingMap((prev) => ({ ...prev, [el.id]: false }))
                                }
                                onEnded={() =>
                                  setPlayingMap((prev) => ({ ...prev, [el.id]: false }))
                                }
                              />
                            ) : null}

                            {showPosterOnCard && posterUrl && (
                              <img
                                src={posterUrl}
                                alt={el.content || "Video poster"}
                                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
                                  hoverPreviewEnabled && isPlaying
                                    ? "opacity-0"
                                    : hoverPreviewEnabled
                                    ? "opacity-100 group-hover:opacity-0"
                                    : "opacity-100"
                                }`}
                                draggable={false}
                              />
                            )}
                          </div>

                          <div className="pointer-events-none absolute inset-0 bg-black/40 transition group-hover:bg-black/30" />

                          {!isPlaying && (
                            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-black shadow-xl transition group-hover:scale-110">
                                ▶
                              </div>
                            </div>
                          )}

                          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent" />

                          <div className="pointer-events-none absolute bottom-3 left-4 right-4 z-20">
                            <div className="flex items-center gap-2">
                              {Boolean(el.props?.isLive) && (
                                <span className="inline-flex rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white shadow-lg">
                                  LIVE
                                </span>
                              )}

                              <div className="text-sm font-semibold text-white drop-shadow">
                                {el.content || "Session Video"}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm text-white/50">
                          Video block
                        </div>
                      )}
                    </button>
                  )
                ) : el.element_type === "pdf" ? (
                  <div className="flex h-full w-full flex-col justify-between p-4">
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] text-white/50">PDF</div>
                      <div className="mt-2 text-base font-semibold">{el.content}</div>
                    </div>
                    <div className="mt-4 break-all text-xs text-white/70">
                      {String(el.props?.url ?? "")}
                    </div>
                  </div>
                ) : el.element_type === "button" ? (
                  <div className="flex h-full w-full items-center justify-center">
                    <a
                      href={String(el.props?.href ?? "#")}
                      className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white no-underline"
                    >
                      {el.content || "Button"}
                    </a>
                  </div>
                ) : el.element_type === "spacer" ? (
                  <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-[0.18em] text-white/40">
                    Spacer
                  </div>
                ) : (
                  <div className="px-4 py-2 text-sm font-medium whitespace-pre-wrap">
                    {el.content}
                  </div>
                )}
              </div>
            )
          })}
      </div>

      {activeVideo && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 p-6 backdrop-blur-sm"
          onClick={() => setActiveVideo(null)}
        >
          <div className="relative w-full max-w-7xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setActiveVideo(null)}
              className="absolute -top-12 right-0 flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-white/20"
            >
              ✕ Close
            </button>

            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_20px_80px_rgba(0,0,0,0.8)]">
              <VideoPlayer
                key={`${activeVideo.id}-${String(
                  activeVideo.props?.useGeneralSession
                    ? resolvedGeneralSessionUrl ?? ""
                    : activeVideo.props?.url ?? ""
                )}`}
                url={String(
                  activeVideo.props?.useGeneralSession
                    ? resolvedGeneralSessionUrl ?? ""
                    : activeVideo.props?.url ?? ""
                )}
                sourceType={String(
                  activeVideo.props?.useGeneralSession
                    ? generalSession?.sourceType ?? "mp4"
                    : activeVideo.props?.sourceType ?? "mp4"
                )}
                className="h-auto max-h-[80vh] w-full bg-black"
                controls={Boolean(activeVideo.props?.controls ?? true)}
                autoPlay
                playsInline
                trimStart={Number(activeVideo.props?.trimStart ?? 0)}
                trimEnd={Number(activeVideo.props?.trimEnd ?? 0)}
                loop={Boolean(activeVideo.props?.loop ?? false)}
              />
            </div>

            <div className="mt-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-base font-semibold text-white">
                  {activeVideo.props?.useGeneralSession
                    ? "General Session"
                    : activeVideo.content || "Video"}
                </div>

                <div className="mt-1 text-xs uppercase tracking-[0.18em] text-white/45">
                  {activeVideo.props?.useGeneralSession ? "Live Program Feed" : "Video Playback"}
                </div>
              </div>

              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/60">
                {String(
                  activeVideo.props?.useGeneralSession
                    ? generalSession?.sourceType ?? "mp4"
                    : activeVideo.props?.sourceType ?? "mp4"
                ) === "hls"
                  ? "HLS Stream"
                  : "MP4 Video"}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}