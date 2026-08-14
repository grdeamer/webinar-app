"use client"

import { useCallback, useEffect } from "react"
import type { SceneSummary } from "./assetDockTypes"

function isTypingTarget(target: EventTarget | null): boolean {
  const element = target instanceof HTMLElement ? target : null
  return Boolean(
    element?.closest(
      'input,textarea,select,button,a,[contenteditable="true"],[role="dialog"]'
    )
  )
}

type Params = {
  scenes: SceneSummary[]
  applyScene: (sceneId: string) => Promise<void>
  applySceneAndTake: (sceneId: string) => Promise<void>
  flashSceneHotkey: (sceneId: string) => void
  takeProgram: (
    mode: "cut" | "auto",
    transitionType?: "fade"
  ) => void
}

export default function useProducerHotkeys({
  scenes,
  applyScene,
  applySceneAndTake,
  flashSceneHotkey,
  takeProgram,
}: Params) {
  const handleTransportHotkeys = useCallback(
    (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return
      if (event.repeat || event.metaKey || event.ctrlKey || !event.altKey) return

      const key = event.key.toLowerCase()

      if (key === "t" || key === "c") {
        event.preventDefault()
        takeProgram("cut")
        return
      }

      if (key === "a") {
        event.preventDefault()
        takeProgram("auto", "fade")
      }
    },
    [takeProgram]
  )

  const handleSceneHotkeys = useCallback(
    (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return
      if (event.repeat || event.metaKey || event.ctrlKey) return

      const digitMatch = event.code.match(/^Digit([1-9])$/)
      if (event.altKey && event.shiftKey && digitMatch) {
        const index = Number(digitMatch[1]) - 1
        const scene = scenes[index]

        if (scene) {
          event.preventDefault()
          flashSceneHotkey(scene.id)
          void applySceneAndTake(scene.id)
        }

        return
      }

      if (!event.altKey && !event.shiftKey && digitMatch) {
        const index = Number(digitMatch[1]) - 1
        const scene = scenes[index]

        if (scene) {
          event.preventDefault()
          flashSceneHotkey(scene.id)
          void applyScene(scene.id)
        }
      }
    },
    [
      scenes,
      applyScene,
      applySceneAndTake,
      flashSceneHotkey,
    ]
  )

  useEffect(() => {
    window.addEventListener(
      "keydown",
      handleTransportHotkeys
    )

    return () => {
      window.removeEventListener(
        "keydown",
        handleTransportHotkeys
      )
    }
  }, [handleTransportHotkeys])

  useEffect(() => {
    window.addEventListener(
      "keydown",
      handleSceneHotkeys
    )

    return () => {
      window.removeEventListener(
        "keydown",
        handleSceneHotkeys
      )
    }
  }, [handleSceneHotkeys])
}
