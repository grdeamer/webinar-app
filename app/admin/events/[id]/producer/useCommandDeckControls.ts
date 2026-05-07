import { useCallback, useEffect, useRef, useState } from "react"
import type {
  CinematicTransitionType,
  TakeControlProps,
  TakeMode,
} from "./commandDeckTypes"

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false

  const tagName = target.tagName.toLowerCase()
  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    target.isContentEditable
  )
}

export function useRuntimeLabel(): string {
  const startedAtRef = useRef(Date.now())
  const [runtimeSeconds, setRuntimeSeconds] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setRuntimeSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000))
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return `${String(Math.floor(runtimeSeconds / 60)).padStart(2, "0")}:${String(
    runtimeSeconds % 60
  ).padStart(2, "0")}`
}

export function useTakeControls({
  previewProgramDifferent,
  takeBusy,
  onTake,
}: TakeControlProps): {
  takeFlash: TakeMode | null
  triggerTake: (
    mode: TakeMode,
    transitionType?: CinematicTransitionType,
    transitionDurationMs?: number
  ) => void
} {
  const [takeFlash, setTakeFlash] = useState<TakeMode | null>(null)
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const transportCooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [transportLocked, setTransportLocked] = useState(false)

  const triggerTake = useCallback(
    (
      mode: TakeMode,
      transitionType?: CinematicTransitionType,
      transitionDurationMs = 600
    ) => {
      if (takeBusy || !previewProgramDifferent || transportLocked) return

      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current)
      }

      if (transportCooldownRef.current) {
        clearTimeout(transportCooldownRef.current)
      }

      setTransportLocked(true)
      setTakeFlash(mode)

      onTake(mode, transitionType, transitionDurationMs)

      flashTimeoutRef.current = setTimeout(() => {
        setTakeFlash(null)
        flashTimeoutRef.current = null
      }, Math.max(520, transitionDurationMs * 0.72))

      transportCooldownRef.current = setTimeout(() => {
        setTransportLocked(false)
        transportCooldownRef.current = null
      }, Math.max(transitionDurationMs + 120, 520))
    },
    [previewProgramDifferent, takeBusy, transportLocked, onTake]
  )

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return
      if (isTypingTarget(event.target)) return

      const key = event.key.toLowerCase()

      if (key === "t" || key === "c") {
        event.preventDefault()
        triggerTake("cut")
        return
      }

      if (key === "a") {
        event.preventDefault()
        triggerTake("auto")
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [triggerTake])

  useEffect(() => {
    return () => {
      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current)
      }

      if (transportCooldownRef.current) {
        clearTimeout(transportCooldownRef.current)
      }
    }
  }, [])

  return { takeFlash, triggerTake }
}