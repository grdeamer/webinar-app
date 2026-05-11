"use client"

import { useCallback, useEffect } from "react"
import type { SceneSummary } from "./assetDockTypes"

function isTypingTarget(target: EventTarget | null): boolean {
  const tag = (target as HTMLElement | null)?.tagName?.toLowerCase()

  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select"
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
      if (event.metaKey || event.ctrlKey || event.altKey) return

      const key = event.key.toLowerCase()

      if (event.code === "Space" || key === "t" || key === "c") {
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

      if (event.shiftKey && event.key >= "1" && event.key <= "9") {
        const index = Number(event.key) - 1
        const scene = scenes[index]

        if (scene) {
          event.preventDefault()
          flashSceneHotkey(scene.id)
          void applySceneAndTake(scene.id)
        }

        return
      }

      if (event.key >= "1" && event.key <= "9") {
        const index = Number(event.key) - 1
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