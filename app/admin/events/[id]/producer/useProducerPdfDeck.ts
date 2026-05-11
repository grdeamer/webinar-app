"use client"

import { useEffect, useMemo, useState } from "react"
import type { PreviewBlock } from "./useProducerBlocks"
import {
  type LocalPdfDeck,
  estimatePdfPageCount,
} from "./pdfDeckUtils"

type Params = {
  eventId: string
  sessionId: string
  setPreviewBlocks: React.Dispatch<
    React.SetStateAction<PreviewBlock[]>
  >
  setSelectedSceneId: (id: string | null) => void
  setSceneName: (name: string) => void
  setError: (value: string | null) => void
  setProgramSlideLabel: (value: string | null) => void
  handlePdfUpload: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => void | Promise<void>
  takeProgram: (
    mode: "cut" | "auto",
    transitionType?: any,
    options?: {
      sceneId?: string | null
      slideLabel?: string | null
      transitionDurationMs?: number
    }
  ) => void
}

export default function useProducerPdfDeck({
  eventId,
  sessionId,
  setPreviewBlocks,
  setSelectedSceneId,
  setSceneName,
  setError,
  setProgramSlideLabel,
  handlePdfUpload,
  takeProgram,
}: Params) {
  const [localPdfDeck, setLocalPdfDeck] =
    useState<LocalPdfDeck | null>(null)

  const localPdfDeckStorageKey = useMemo(
    () =>
      `jupiter:producer:${eventId}:${sessionId}:pdfDeck`,
    [eventId, sessionId]
  )

  async function handleProducerPdfUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.currentTarget.files?.[0] ?? null

    await handlePdfUpload(event)

    if (!file) return

    const src = URL.createObjectURL(file)
    const name = file.name.replace(/\.pdf$/i, "")

    try {
      const pageCount = await estimatePdfPageCount(file)

      setLocalPdfDeck({
        name,
        pageCount,
        src,
      })
    } catch (_err: unknown) {
      setLocalPdfDeck({
        name,
        pageCount: 1,
        src,
      })
    }
  }

  useEffect(() => {
    try {
      const rawDeck =
        window.localStorage.getItem(
          localPdfDeckStorageKey
        )

      if (!rawDeck) return

      const parsedDeck = JSON.parse(
        rawDeck
      ) as Partial<LocalPdfDeck>

      if (
        !parsedDeck.name ||
        typeof parsedDeck.pageCount !== "number"
      ) {
        return
      }

      setLocalPdfDeck({
        name: parsedDeck.name,
        pageCount: Math.max(1, parsedDeck.pageCount),
        src: null,
      })
    } catch (_err: unknown) {
      // Ignore corrupted cache
    }
  }, [localPdfDeckStorageKey])

  useEffect(() => {
    try {
      if (!localPdfDeck) {
        window.localStorage.removeItem(
          localPdfDeckStorageKey
        )

        return
      }

      window.localStorage.setItem(
        localPdfDeckStorageKey,
        JSON.stringify({
          name: localPdfDeck.name,
          pageCount: localPdfDeck.pageCount,
        })
      )
    } catch (_err: unknown) {
      // Ignore storage failures
    }
  }, [localPdfDeck, localPdfDeckStorageKey])

  function sendSlideToPreview(slideIndex: number) {
    setSelectedSceneId(null)
    setError(null)
    setProgramSlideLabel(null)

    const slideLabel = localPdfDeck?.name
      ? `${localPdfDeck.name} · Slide ${slideIndex}`
      : `Slide ${slideIndex}`

    setPreviewBlocks((prev) => {
      const existingSlideBlock = prev.find((block) => {
        if (block.type !== "pdf") return false

        if (
          localPdfDeck?.src &&
          block.src === localPdfDeck.src
        ) {
          return true
        }

        const label = block.label ?? ""

        return label.includes("Slide ")
      })

      if (existingSlideBlock) {
        return prev.map((block) =>
          block.id === existingSlideBlock.id
            ? {
                ...block,
                src: localPdfDeck?.src ?? block.src,
                label: slideLabel,
              }
            : block
        )
      }

      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          type: "pdf",
          src: localPdfDeck?.src ?? undefined,
          x: 10,
          y: 10,
          width: 60,
          height: 60,
          zIndex: prev.length + 1,
          label: slideLabel,
        },
      ]
    })

    setSceneName(`${slideLabel} Preview`)
  }

  function takeSlide(slideIndex: number) {
    sendSlideToPreview(slideIndex)

    window.setTimeout(() => {
      takeProgram("cut", undefined, {
        sceneId: null,
        slideLabel: localPdfDeck?.name
          ? `${localPdfDeck.name} · Slide ${slideIndex}`
          : `Slide ${slideIndex}`,
      })
    }, 175)
  }

  return {
    localPdfDeck,
    handleProducerPdfUpload,
    sendSlideToPreview,
    takeSlide,
  }
}