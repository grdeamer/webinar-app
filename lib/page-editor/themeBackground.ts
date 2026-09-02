import type { CSSProperties } from "react"
import type { EventTheme } from "./sectionTypes"

export function getPageBackgroundStyle(theme: EventTheme, fallbackGradient = false): CSSProperties {
  const imageUrl = typeof theme.pageBackgroundImageUrl === "string" ? theme.pageBackgroundImageUrl.trim() : ""
  if (imageUrl) {
    const opacity = Math.min(0.9, Math.max(0, Number(theme.pageBackgroundOverlay ?? 0.28)))
    const fit = theme.pageBackgroundImageFit === "contain" ? "contain" : "cover"
    const position = typeof theme.pageBackgroundImagePosition === "string" && theme.pageBackgroundImagePosition.trim() ? theme.pageBackgroundImagePosition : "center"
    return {
      backgroundColor: theme.pageBackgroundColor || "#020617",
      backgroundImage: `linear-gradient(rgba(2,6,23,${opacity}), rgba(2,6,23,${opacity})), url(${JSON.stringify(imageUrl)})`,
      backgroundPosition: `center, ${position}`,
      backgroundRepeat: "no-repeat, no-repeat",
      backgroundSize: `cover, ${fit}`,
    }
  }
  if (!fallbackGradient) return { backgroundColor: theme.pageBackgroundColor || "#020617" }
  return {
    backgroundColor: theme.pageBackgroundColor || "#020617",
    backgroundImage: `linear-gradient(${theme.gradientAngle || "135deg"}, ${theme.gradientColorA || "#020617"}, ${theme.gradientColorB || "#020617"})`,
  }
}
