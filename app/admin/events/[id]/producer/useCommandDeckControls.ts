import { useCallback, useEffect, useRef, useState } from "react"
import type { TakeControlProps, TakeMode } from "./commandDeckTypes"

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
  triggerTake: (mode: TakeMode) => void
} {
  const [takeFlash, setTakeFlash] = useState<TakeMode | null>(null)
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const triggerTake = useCallback(
    (mode: TakeMode) => {
      if (takeBusy || !previewProgramDifferent) return

      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current)
      }

      setTakeFlash(mode)
      onTake(mode)

      flashTimeoutRef.current = setTimeout(() => {
        setTakeFlash(null)
        flashTimeoutRef.current = null
      }, 520)
    },
    [previewProgramDifferent, takeBusy, onTake]
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
    }
  }, [])

  return { takeFlash, triggerTake }
}