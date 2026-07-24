export type ElementAnimationEffect =
  | "none"
  | "fade"
  | "slide-up"
  | "slide-down"
  | "slide-left"
  | "slide-right"
  | "scale"

export type ElementAnimationEasing =
  | "linear"
  | "ease"
  | "ease-in"
  | "ease-out"
  | "ease-in-out"

export type ElementAnimationConfig = {
  intro: ElementAnimationEffect
  outro: ElementAnimationEffect
  delay: number
  duration: number
  easing: ElementAnimationEasing
}

export const DEFAULT_ELEMENT_ANIMATION: ElementAnimationConfig = {
  intro: "none",
  outro: "none",
  delay: 0,
  duration: 400,
  easing: "ease-out",
}

export const ELEMENT_ANIMATION_EFFECT_OPTIONS: Array<{
  label: string
  value: ElementAnimationEffect
}> = [
  { label: "None", value: "none" },
  { label: "Fade", value: "fade" },
  { label: "Slide Up", value: "slide-up" },
  { label: "Slide Down", value: "slide-down" },
  { label: "Slide Left", value: "slide-left" },
  { label: "Slide Right", value: "slide-right" },
  { label: "Scale", value: "scale" },
]

export const ELEMENT_ANIMATION_EASING_OPTIONS: Array<{
  label: string
  value: ElementAnimationEasing
}> = [
  { label: "Linear", value: "linear" },
  { label: "Ease", value: "ease" },
  { label: "Ease In", value: "ease-in" },
  { label: "Ease Out", value: "ease-out" },
  { label: "Ease In Out", value: "ease-in-out" },
]

function isAnimationEffect(value: unknown): value is ElementAnimationEffect {
  return ELEMENT_ANIMATION_EFFECT_OPTIONS.some((option) => option.value === value)
}

function isAnimationEasing(value: unknown): value is ElementAnimationEasing {
  return ELEMENT_ANIMATION_EASING_OPTIONS.some((option) => option.value === value)
}

export function getElementAnimationConfig(
  props?: Record<string, unknown>
): ElementAnimationConfig {
  const animation =
    props?.animation && typeof props.animation === "object"
      ? (props.animation as Record<string, unknown>)
      : {}
  const delay = Number(animation.delay)
  const duration = Number(animation.duration)

  return {
    intro: isAnimationEffect(animation.intro)
      ? animation.intro
      : DEFAULT_ELEMENT_ANIMATION.intro,
    outro: isAnimationEffect(animation.outro)
      ? animation.outro
      : DEFAULT_ELEMENT_ANIMATION.outro,
    delay: Number.isFinite(delay) && delay >= 0
      ? delay
      : DEFAULT_ELEMENT_ANIMATION.delay,
    duration: Number.isFinite(duration) && duration >= 0
      ? duration
      : DEFAULT_ELEMENT_ANIMATION.duration,
    easing: isAnimationEasing(animation.easing)
      ? animation.easing
      : DEFAULT_ELEMENT_ANIMATION.easing,
  }
}
