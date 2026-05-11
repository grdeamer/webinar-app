import { useCallback, useEffect, useRef, useState } from "react"

export default function useAudienceCue() {
  const [showAudienceCue, setShowAudienceCue] = useState(false)
  const [audienceCueRegion, setAudienceCueRegion] = useState("Europe")
  const [audienceCueMoonMode, setAudienceCueMoonMode] = useState(false)

  const [audienceCueQuestionLabel, setAudienceCueQuestionLabel] = useState(
    "How are outcomes differing across regions?"
  )

  const audienceCueTimeoutRef = useRef<number | null>(null)

  const triggerAudienceCue = useCallback(
    (options?: {
      region?: string
      moonMode?: boolean
      questionLabel?: string
      durationMs?: number
    }) => {
      if (audienceCueTimeoutRef.current) {
        window.clearTimeout(audienceCueTimeoutRef.current)
      }

      setAudienceCueRegion(options?.region ?? "Europe")
      setAudienceCueMoonMode(options?.moonMode ?? false)

      setAudienceCueQuestionLabel(
        options?.questionLabel ??
          "How are outcomes differing across regions?"
      )

      setShowAudienceCue(true)

      audienceCueTimeoutRef.current = window.setTimeout(() => {
        setShowAudienceCue(false)
        audienceCueTimeoutRef.current = null
      }, options?.durationMs ?? 5000)
    },
    []
  )

  useEffect(() => {
    return () => {
      if (audienceCueTimeoutRef.current) {
        window.clearTimeout(audienceCueTimeoutRef.current)
      }
    }
  }, [])

  return {
    showAudienceCue,
    setShowAudienceCue,
    audienceCueRegion,
    audienceCueMoonMode,
    audienceCueQuestionLabel,
    triggerAudienceCue,
  }
}