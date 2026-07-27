import type { CSSProperties } from "react"
import type {
  EventPageElement,
  SectionConfig,
} from "@/lib/page-editor/sectionTypes"

export type ElementVideoSource = {
  url: string
  sourceType: "mp4" | "hls"
  expiresAt?: number | null
  sourceIdentity?: string | null
  refreshable?: boolean
}

export type GeneralSessionPresentationSource = {
  sourceType?: string | null
  mp4Url?: string | null
  mp4ExpiresAt?: number | null
  mp4SourceIdentity?: string | null
  hlsUrl?: string | null
  playbackUrl?: string | null
} | null

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function getFiniteNumber(value: unknown, fallback: number) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function getOptionalFiniteNumber(value: unknown) {
  if (value == null || value === "") return null

  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function getOptionalTimestamp(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value !== "string" || !value.trim()) return null

  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : null
}

function getCssLength(value: unknown, fallback: number) {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : `${getFiniteNumber(value, fallback)}px`
}

function getCssNumberOrString(value: unknown, fallback: number) {
  if (typeof value === "string" && value.trim()) return value.trim()
  return getFiniteNumber(value, fallback)
}

function clampOpacity(value: unknown, fallback = 1) {
  return Math.min(1, Math.max(0, getFiniteNumber(value, fallback)))
}

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "").trim()
  const expanded =
    clean.length === 3
      ? clean
          .split("")
          .map((character) => character + character)
          .join("")
      : clean

  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) return null

  const number = Number.parseInt(expanded, 16)
  return {
    red: (number >> 16) & 255,
    green: (number >> 8) & 255,
    blue: number & 255,
  }
}

function getColorWithOpacity(
  colorValue: unknown,
  opacityValue: unknown,
  fallbackColor: string,
  fallbackOpacity: number
) {
  const color =
    typeof colorValue === "string" && colorValue.trim()
      ? colorValue.trim()
      : fallbackColor
  const opacity = clampOpacity(opacityValue, fallbackOpacity)
  const rgb = hexToRgb(color)

  return rgb
    ? `rgba(${rgb.red}, ${rgb.green}, ${rgb.blue}, ${opacity})`
    : color
}

function getTransform(props: Record<string, unknown>) {
  const explicitTransform =
    typeof props.transform === "string" ? props.transform.trim() : ""
  if (explicitTransform) return explicitTransform

  const translateX = getOptionalFiniteNumber(props.translateX)
  const translateY = getOptionalFiniteNumber(props.translateY)
  const rotation = getOptionalFiniteNumber(
    props.rotation ?? props.rotationDeg ?? props.rotate
  )
  const uniformScale = getOptionalFiniteNumber(props.scale)
  const scaleX = getOptionalFiniteNumber(props.scaleX) ?? uniformScale
  const scaleY = getOptionalFiniteNumber(props.scaleY) ?? uniformScale
  const transforms: string[] = []

  if (translateX !== null || translateY !== null) {
    transforms.push(`translate(${translateX ?? 0}px, ${translateY ?? 0}px)`)
  }
  if (rotation !== null) transforms.push(`rotate(${rotation}deg)`)
  if (scaleX !== null || scaleY !== null) {
    transforms.push(`scale(${scaleX ?? 1}, ${scaleY ?? 1})`)
  }

  return transforms.length > 0 ? transforms.join(" ") : undefined
}

function getTextAlign(value: unknown): CSSProperties["textAlign"] {
  return value === "center" || value === "right" || value === "justify"
    ? value
    : "left"
}

function getFontStyle(value: unknown): CSSProperties["fontStyle"] {
  return value === "italic" || value === "oblique" ? value : "normal"
}

function getObjectFit(value: unknown): CSSProperties["objectFit"] {
  return value === "contain" ||
    value === "fill" ||
    value === "none" ||
    value === "scale-down"
    ? value
    : "cover"
}

function normalizeVideoSourceType(value: unknown): ElementVideoSource["sourceType"] {
  return value === "hls" || value === "m3u8" ? "hls" : "mp4"
}

export function getElementFrameStyle(
  element: EventPageElement
): CSSProperties {
  const props = element.props ?? {}
  const transform = getTransform(props)

  return {
    left: element.x,
    top: element.y,
    zIndex: element.z_index ?? 1,
    width: element.width ?? "auto",
    height: element.height ?? "auto",
    borderRadius: getCssLength(props.borderRadius, 12),
    opacity: clampOpacity(props.opacity),
    transform,
    transformOrigin:
      transform && typeof props.transformOrigin === "string"
        ? props.transformOrigin
        : transform
          ? "center center"
          : undefined,
  }
}

export function getTextElementPresentationStyle(
  element: EventPageElement
): CSSProperties {
  const props = element.props ?? {}

  return {
    padding: `${getCssLength(props.paddingY, 8)} ${getCssLength(
      props.paddingX,
      16
    )}`,
    color: String(props.textColor ?? "#111111"),
    backgroundColor: getColorWithOpacity(
      props.backgroundColor,
      props.backgroundOpacity,
      "#fbbf24",
      0.9
    ),
    fontSize: getCssLength(props.fontSize, 14),
    fontWeight: getCssNumberOrString(props.fontWeight, 500),
    fontFamily: String(props.fontFamily ?? "inherit"),
    fontStyle: getFontStyle(props.fontStyle),
    textAlign: getTextAlign(props.textAlign),
    lineHeight: getCssNumberOrString(props.lineHeight, 1.4),
    letterSpacing:
      props.letterSpacing == null
        ? undefined
        : getCssLength(props.letterSpacing, 0),
    borderRadius: getCssLength(props.borderRadius, 12),
  }
}

export function getImageElementPresentationStyle(
  element: EventPageElement
): CSSProperties {
  const props = element.props ?? {}

  return {
    width: "100%",
    height: "100%",
    objectFit: getObjectFit(props.imageFit),
    objectPosition: String(props.imagePosition ?? "center"),
    borderRadius: "inherit",
  }
}

export function getVideoElementPresentationStyle(
  element: EventPageElement
): CSSProperties {
  const props = element.props ?? {}

  return {
    width: "100%",
    height: "100%",
    objectFit: getObjectFit(props.videoFit ?? props.imageFit),
    objectPosition: String(
      props.videoPosition ?? props.imagePosition ?? "center"
    ),
    borderRadius: "inherit",
  }
}

export function getButtonElementPresentationStyle(
  element: EventPageElement
): CSSProperties {
  const props = element.props ?? {}

  return {
    padding: `${getCssLength(props.paddingY, 12)} ${getCssLength(
      props.paddingX,
      20
    )}`,
    color: String(props.textColor ?? "#ffffff"),
    backgroundColor: getColorWithOpacity(
      props.backgroundColor,
      props.backgroundOpacity,
      "#2563eb",
      1
    ),
    borderColor: String(props.borderColor ?? "transparent"),
    borderStyle:
      props.borderStyle === "dashed" || props.borderStyle === "dotted"
        ? props.borderStyle
        : "solid",
    borderWidth: getCssLength(props.borderWidth, 0),
    borderRadius: getCssLength(props.borderRadius, 12),
    fontSize: getCssLength(props.fontSize, 14),
    fontWeight: getCssNumberOrString(props.fontWeight, 600),
    fontFamily: String(props.fontFamily ?? "inherit"),
    fontStyle: getFontStyle(props.fontStyle),
    lineHeight: getCssNumberOrString(props.lineHeight, 1.4),
    letterSpacing:
      props.letterSpacing == null
        ? undefined
        : getCssLength(props.letterSpacing, 0),
    textAlign: getTextAlign(props.textAlign ?? "center"),
  }
}

export function getElementContentAlignmentStyle(
  element: EventPageElement
): CSSProperties {
  const props = element.props ?? {}
  const horizontalAlignment =
    props.horizontalAlign ?? props.alignment ?? props.textAlign
  const verticalAlignment = props.verticalAlign

  return {
    justifyContent:
      horizontalAlignment === "left"
        ? "flex-start"
        : horizontalAlignment === "right"
          ? "flex-end"
          : "center",
    alignItems:
      verticalAlignment === "top"
        ? "flex-start"
        : verticalAlignment === "bottom"
          ? "flex-end"
          : "center",
  }
}

export function getResponsiveVisibilityClass(hideOnMobile: unknown) {
  return hideOnMobile === true ? "hidden md:block" : ""
}

export function getSectionResponsiveVisibilityClass(
  config: Pick<SectionConfig, "hideOnMobile">
) {
  return getResponsiveVisibilityClass(config.hideOnMobile)
}

export function getElementAnimationAttribute(element: EventPageElement) {
  const animation = element.props?.animation
  if (!isRecord(animation)) return undefined

  return JSON.stringify(animation)
}

export function resolveElementVideoSource(
  element: EventPageElement,
  generalSession: GeneralSessionPresentationSource = null
): ElementVideoSource {
  const props = element.props ?? {}

  if (props.useGeneralSession === true && generalSession) {
    const sourceType = normalizeVideoSourceType(generalSession.sourceType)
    const url = String(
      generalSession.playbackUrl ??
        (sourceType === "hls"
          ? generalSession.hlsUrl
          : generalSession.mp4Url) ??
        generalSession.hlsUrl ??
        generalSession.mp4Url ??
        ""
    )

    if (url) {
      const isRefreshableSignedMp4 =
        sourceType === "mp4" &&
        url === generalSession.mp4Url &&
        typeof generalSession.mp4ExpiresAt === "number" &&
        Boolean(generalSession.mp4SourceIdentity)

      return {
        url,
        sourceType,
        expiresAt: isRefreshableSignedMp4
          ? generalSession.mp4ExpiresAt
          : null,
        sourceIdentity: isRefreshableSignedMp4
          ? generalSession.mp4SourceIdentity
          : null,
        refreshable: isRefreshableSignedMp4,
      }
    }
  }

  return {
    url: String(props.url ?? ""),
    sourceType: normalizeVideoSourceType(props.sourceType),
  }
}

export function parseGeneralSessionProgramSource(
  input: unknown
): GeneralSessionPresentationSource {
  if (!isRecord(input) || !isRecord(input.program)) return null

  const program = input.program
  if (
    typeof program.program_kind === "string" &&
    program.program_kind !== "video"
  ) {
    return null
  }

  const sourceType = normalizeVideoSourceType(program.program_source_type)
  const playbackUrl =
    sourceType === "hls"
      ? program.program_m3u8_url
      : program.program_mp4_url

  if (typeof playbackUrl !== "string" || !playbackUrl.trim()) return null

  return {
    sourceType,
    playbackUrl: playbackUrl.trim(),
    mp4Url:
      sourceType === "mp4" ? playbackUrl.trim() : null,
    mp4ExpiresAt:
      sourceType === "mp4"
        ? getOptionalTimestamp(program.program_mp4_expires_at)
        : null,
    mp4SourceIdentity:
      sourceType === "mp4" &&
      typeof program.program_mp4_source_id === "string" &&
      program.program_mp4_source_id.trim()
        ? program.program_mp4_source_id.trim()
        : null,
    hlsUrl:
      sourceType === "hls" ? playbackUrl.trim() : null,
  }
}
