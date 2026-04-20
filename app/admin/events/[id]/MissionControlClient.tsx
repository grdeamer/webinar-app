"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"
import StageTransitionOverlay from "@/components/live/StageTransitionOverlay"

type EventRoutingStateLike = {
  mode?: string | null
  destination_type?: string | null
  destination_session_id?: string | null
  transition_type?: string | null
  transition_duration_ms?: number | null
}

type SessionOption = {
  id: string
  title: string
}

type BreakoutOption = {
  id: string
  title: string
}

type TransitionVariant = "general_session" | "session" | "breakout" | "off_air"
type TransitionType =
  | "auto"
  | "fade"
  | "wipe"
  | "wipe_left"
  | "wipe_right"
  | "zoom"
  | "zoom_in"
  | "zoom_out"
  | "dip_to_black"
  | "main_stage_arrival"

type TransitionPreset = {
  transitionType: TransitionType
  duration: number
  headline: string
  message: string
}

type RunOfShowDestinationKind =
  | "general_session"
  | "session"
  | "breakout"
  | "off_air"

type RunOfShowItem = {
  id: string
  label: string
  destinationKind: RunOfShowDestinationKind
  destinationId: string | null
  transitionType: TransitionType
  duration: number
  headline: string
  message: string
}

const MAIN_STAGE_PRESETS: Record<string, TransitionPreset> = {
  keynote_start: {
    transitionType: "main_stage_arrival",
    duration: 3200,
    headline: "Now Entering Main Stage",
    message: "The keynote is beginning now.",
  },
  session_change: {
    transitionType: "wipe_left",
    duration: 2200,
    headline: "Please Stand By",
    message: "We’re moving to the next session.",
  },
  return_from_break: {
    transitionType: "zoom",
    duration: 2600,
    headline: "Welcome Back",
    message: "We’re returning to the main stage.",
  },
}

const SESSION_PRESETS: Record<string, TransitionPreset> = {
  enter_session: {
    transitionType: "wipe_left",
    duration: 2200,
    headline: "Entering Session",
    message: "Your next session is opening.",
  },
  move_to_next: {
    transitionType: "wipe_left",
    duration: 2000,
    headline: "Please Stand By",
    message: "We’re moving to the next session.",
  },
  focused_start: {
    transitionType: "zoom_in",
    duration: 2600,
    headline: "Now Entering Session",
    message: "We’re bringing you into the next room.",
  },
}

const BREAKOUT_PRESETS: Record<string, TransitionPreset> = {
  open_breakout: {
    transitionType: "wipe_right",
    duration: 2200,
    headline: "Entering Breakout",
    message: "We’re moving you into a breakout room.",
  },
  split_rooms: {
    transitionType: "zoom_out",
    duration: 2400,
    headline: "Breakouts Are Opening",
    message: "Please stand by while we move you into your room.",
  },
  breakout_focus: {
    transitionType: "fade",
    duration: 2000,
    headline: "Breakout Session",
    message: "Your breakout experience is starting now.",
  },
}

const OFF_AIR_PRESETS: Record<string, TransitionPreset> = {
  intermission: {
    transitionType: "dip_to_black",
    duration: 2800,
    headline: "We’ll Be Right Back",
    message: "We’re taking a short break.",
  },
  end_of_day: {
    transitionType: "fade",
    duration: 2400,
    headline: "Thank You",
    message: "Today’s programming has concluded.",
  },
  reset_room: {
    transitionType: "dip_to_black",
    duration: 2000,
    headline: "Stand By",
    message: "Preparing the next experience.",
  },
}

function isRunOfShowItem(value: unknown): value is RunOfShowItem {
  if (!value || typeof value !== "object") return false
  const item = value as Record<string, unknown>

  return (
    typeof item.id === "string" &&
    typeof item.label === "string" &&
    typeof item.destinationKind === "string" &&
    (typeof item.destinationId === "string" || item.destinationId === null) &&
    typeof item.transitionType === "string" &&
    typeof item.duration === "number" &&
    typeof item.headline === "string" &&
    typeof item.message === "string"
  )
}

function normalizeRunOfShowItems(value: unknown): RunOfShowItem[] {
  if (!Array.isArray(value)) return []
  return value.filter(isRunOfShowItem)
}

function destinationLabel(
  item: RunOfShowItem,
  maps: {
    generalSessionMap: Record<string, string>
    sessionMap: Record<string, string>
    breakoutMap: Record<string, string>
  }
) {
  if (item.destinationKind === "general_session") {
    return item.destinationId
      ? maps.generalSessionMap[item.destinationId] || item.label
      : item.label
  }

  if (item.destinationKind === "session") {
    return item.destinationId ? maps.sessionMap[item.destinationId] || item.label : item.label
  }

  if (item.destinationKind === "breakout") {
    return item.destinationId ? maps.breakoutMap[item.destinationId] || item.label : item.label
  }

  return item.label
}

export default function MissionControlClient({
  routingState,
  sessions,
  breakouts,
  generalSessions,
  sessionMap,
  breakoutMap,
  generalSessionMap,
  initialRunOfShow,
  saveRunOfShow,
  goGeneralSession,
  goToSession,
  goToBreakout,
  goOffAir,
  fireGeneralSessionCue,
  fireSessionCue,
  fireBreakoutCue,
  fireOffAirCue,
  clearTransitionState,
}: {
  routingState: EventRoutingStateLike | null
  sessions: SessionOption[]
  breakouts: BreakoutOption[]
  generalSessions: SessionOption[]
  sessionMap: Record<string, string>
  breakoutMap: Record<string, string>
  generalSessionMap: Record<string, string>
  initialRunOfShow: unknown[]
  saveRunOfShow: (cues: RunOfShowItem[]) => Promise<void>
  goGeneralSession: (formData: FormData) => Promise<void>
  goToSession: (formData: FormData) => Promise<void>
  goToBreakout: (formData: FormData) => Promise<void>
  goOffAir: (formData: FormData) => Promise<void>
  fireGeneralSessionCue: (formData: FormData) => Promise<void>
  fireSessionCue: (formData: FormData) => Promise<void>
  fireBreakoutCue: (formData: FormData) => Promise<void>
  fireOffAirCue: (formData: FormData) => Promise<void>
  clearTransitionState: () => Promise<void>
}) {
  const [mainStageOpen, setMainStageOpen] = useState(false)
  const [sessionOpen, setSessionOpen] = useState(false)
  const [breakoutOpen, setBreakoutOpen] = useState(false)
  const [offAirOpen, setOffAirOpen] = useState(false)

  const defaultGeneralSessionId = generalSessions[0]?.id ?? ""
  const defaultSessionId = sessions[0]?.id ?? ""
  const defaultBreakoutId = breakouts[0]?.id ?? ""

  const [mainStageSessionId, setMainStageSessionId] = useState(defaultGeneralSessionId)
  const [mainStageTransitionType, setMainStageTransitionType] =
    useState<TransitionType>("auto")
  const [mainStageDuration, setMainStageDuration] = useState(3000)
  const [mainStageHeadline, setMainStageHeadline] = useState("Now Entering Main Stage")
  const [mainStageMessage, setMainStageMessage] = useState("The keynote is beginning now.")

  const [sessionId, setSessionId] = useState(defaultSessionId)
  const [sessionTransitionType, setSessionTransitionType] = useState<TransitionType>("auto")
  const [sessionDuration, setSessionDuration] = useState(2200)
  const [sessionHeadline, setSessionHeadline] = useState("Entering Session")
  const [sessionMessage, setSessionMessage] = useState("Your next session is opening.")

  const [breakoutId, setBreakoutId] = useState(defaultBreakoutId)
  const [breakoutTransitionType, setBreakoutTransitionType] =
    useState<TransitionType>("auto")
  const [breakoutDuration, setBreakoutDuration] = useState(2200)
  const [breakoutHeadline, setBreakoutHeadline] = useState("Entering Breakout")
  const [breakoutMessage, setBreakoutMessage] = useState(
    "We’re moving you into a breakout room."
  )

  const [offAirTransitionType, setOffAirTransitionType] = useState<TransitionType>("auto")
  const [offAirDuration, setOffAirDuration] = useState(2600)
  const [offAirHeadline, setOffAirHeadline] = useState("We’ll Be Right Back")
  const [offAirMessage, setOffAirMessage] = useState(
    "Returning attendees to the event home page."
  )

  const [previewActive, setPreviewActive] = useState(false)
  const [previewVariant, setPreviewVariant] = useState<TransitionVariant>("general_session")
  const [previewType, setPreviewType] = useState<TransitionType>("fade")
  const [previewHeadline, setPreviewHeadline] = useState<string | null>(null)
  const [previewMessage, setPreviewMessage] = useState<string | null>(null)
  const [previewHoldMs, setPreviewHoldMs] = useState(3000)

  const [runOfShowItems, setRunOfShowItems] = useState<RunOfShowItem[]>(
    normalizeRunOfShowItems(initialRunOfShow)
  )

  useEffect(() => {
    if (!mainStageSessionId && generalSessions[0]?.id) {
      setMainStageSessionId(generalSessions[0].id)
    }
  }, [generalSessions, mainStageSessionId])

  useEffect(() => {
    if (!sessionId && sessions[0]?.id) {
      setSessionId(sessions[0].id)
    }
  }, [sessions, sessionId])

  useEffect(() => {
    if (!breakoutId && breakouts[0]?.id) {
      setBreakoutId(breakouts[0].id)
    }
  }, [breakouts, breakoutId])

  useEffect(() => {
    let cancelled = false

    async function persist() {
      try {
        await saveRunOfShow(runOfShowItems)
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to save run of show", error)
        }
      }
    }

    void persist()

    return () => {
      cancelled = true
    }
  }, [runOfShowItems, saveRunOfShow])

  const currentDestinationLabel = useMemo(() => {
    const destinationId = routingState?.destination_session_id
    if (!destinationId) return null

    if (routingState?.destination_type === "general_session") {
      return generalSessionMap[destinationId] || destinationId
    }

    return (
      sessionMap[destinationId] ||
      breakoutMap[destinationId] ||
      generalSessionMap[destinationId] ||
      destinationId
    )
  }, [routingState, sessionMap, breakoutMap, generalSessionMap])

  function scheduleTransitionClear(durationMs: number) {
    const delay = Math.max(1200, durationMs + 800)

    window.setTimeout(() => {
      void clearTransitionState()
    }, delay)
  }

  function runPreview(args: {
    variant: TransitionVariant
    transitionType: TransitionType
    headline: string
    message: string
    duration: number
  }) {
    const resolvedPreviewType =
      args.transitionType === "auto"
        ? args.variant === "off_air"
          ? "dip_to_black"
          : args.variant === "session"
            ? "wipe_left"
            : args.variant === "breakout"
              ? "wipe_right"
              : "main_stage_arrival"
        : args.transitionType

    setPreviewVariant(args.variant)
    setPreviewType(resolvedPreviewType)
    setPreviewHeadline(args.headline)
    setPreviewMessage(args.message)
    setPreviewHoldMs(args.duration)
    setPreviewActive(false)

    window.setTimeout(() => {
      setPreviewActive(true)
    }, 20)
  }

  function applyMainStagePreset(key: keyof typeof MAIN_STAGE_PRESETS) {
    const preset = MAIN_STAGE_PRESETS[key]
    setMainStageTransitionType(preset.transitionType)
    setMainStageDuration(preset.duration)
    setMainStageHeadline(preset.headline)
    setMainStageMessage(preset.message)
  }

  function applySessionPreset(key: keyof typeof SESSION_PRESETS) {
    const preset = SESSION_PRESETS[key]
    setSessionTransitionType(preset.transitionType)
    setSessionDuration(preset.duration)
    setSessionHeadline(preset.headline)
    setSessionMessage(preset.message)
  }

  function applyBreakoutPreset(key: keyof typeof BREAKOUT_PRESETS) {
    const preset = BREAKOUT_PRESETS[key]
    setBreakoutTransitionType(preset.transitionType)
    setBreakoutDuration(preset.duration)
    setBreakoutHeadline(preset.headline)
    setBreakoutMessage(preset.message)
  }

  function applyOffAirPreset(key: keyof typeof OFF_AIR_PRESETS) {
    const preset = OFF_AIR_PRESETS[key]
    setOffAirTransitionType(preset.transitionType)
    setOffAirDuration(preset.duration)
    setOffAirHeadline(preset.headline)
    setOffAirMessage(preset.message)
  }

  function addRunOfShowItem(item: Omit<RunOfShowItem, "id">) {
    setRunOfShowItems((current) => [
      ...current,
      {
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random()}`,
        ...item,
      },
    ])
  }

  async function fireRunOfShowItem(item: RunOfShowItem) {
    const formData = new FormData()

    if (item.destinationKind === "general_session" && item.destinationId) {
      formData.set("sessionId", item.destinationId)
    }

    if (item.destinationKind === "session" && item.destinationId) {
      formData.set("sessionId", item.destinationId)
    }

    if (item.destinationKind === "breakout" && item.destinationId) {
      formData.set("breakoutId", item.destinationId)
    }

    formData.set("transitionType", item.transitionType)
    formData.set("transitionDuration", String(item.duration))
    formData.set("headline", item.headline)
    formData.set("message", item.message)

    if (item.destinationKind === "general_session") {
      await fireGeneralSessionCue(formData)
    } else if (item.destinationKind === "session") {
      await fireSessionCue(formData)
    } else if (item.destinationKind === "breakout") {
      await fireBreakoutCue(formData)
    } else {
      await fireOffAirCue(formData)
    }

    removeRunOfShowItem(item.id)
    scheduleTransitionClear(item.duration)
  }

  function removeRunOfShowItem(id: string) {
    setRunOfShowItems((current) => current.filter((item) => item.id !== id))
  }

  function moveRunOfShowItemUp(id: string) {
    setRunOfShowItems((current) => {
      const index = current.findIndex((item) => item.id === id)
      if (index <= 0) return current

      const next = [...current]
      const temp = next[index - 1]
      next[index - 1] = next[index]
      next[index] = temp
      return next
    })
  }

  function moveRunOfShowItemDown(id: string) {
    setRunOfShowItems((current) => {
      const index = current.findIndex((item) => item.id === id)
      if (index === -1 || index >= current.length - 1) return current

      const next = [...current]
      const temp = next[index + 1]
      next[index + 1] = next[index]
      next[index] = temp
      return next
    })
  }

  return (
    <div className="space-y-6 p-6 text-white">
      <div>
        <h1 className="text-2xl font-bold">Mission Control</h1>
        <p className="text-sm text-white/55">
          Event routing, audience transitions, and run-of-show controls.
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="text-sm text-white/50">Current Routing Mode</div>
        <div className="text-lg font-semibold">{routingState?.mode || "Not set"}</div>

        {routingState?.destination_type ? (
          <div className="mt-2 text-sm text-white/60">
            Routing Destination Type: {routingState.destination_type}
          </div>
        ) : null}

        {currentDestinationLabel ? (
          <div className="mt-1 text-sm text-white/60">Destination: {currentDestinationLabel}</div>
        ) : null}

        {routingState?.transition_type ? (
          <div className="mt-1 text-sm text-white/60">
            Transition: {routingState.transition_type}
          </div>
        ) : null}

        {typeof routingState?.transition_duration_ms === "number" ? (
          <div className="mt-1 text-sm text-white/60">
            Duration: {routingState.transition_duration_ms}ms
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Dialog open={mainStageOpen} onOpenChange={setMainStageOpen}>
          <DialogTrigger asChild>
            <Button className="w-full rounded-xl bg-green-600 px-4 py-3 font-medium text-white hover:bg-green-500">
              Go Main Stage
            </Button>
          </DialogTrigger>

          <DialogContent className="border-white/10 bg-slate-950 text-white sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Main Stage Transition</DialogTitle>
              <DialogDescription className="text-white/60">
                Configure the audience transition before sending everyone to the main stage.
              </DialogDescription>
            </DialogHeader>

            <form
              action={async (formData) => {
                if (mainStageSessionId) {
                  formData.set("sessionId", mainStageSessionId)
                }
                await goGeneralSession(formData)
                setMainStageOpen(false)
                scheduleTransitionClear(mainStageDuration)
              }}
              className="space-y-5"
            >
              <div className="space-y-2">
                <label className="text-sm text-white/70">Main Stage Session</label>
                <select
                  value={mainStageSessionId}
                  onChange={(e) => setMainStageSessionId(e.target.value)}
                  className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm"
                >
                  {generalSessions.length === 0 ? (
                    <option value="">No main stage session found</option>
                  ) : (
                    generalSessions.map((session) => (
                      <option key={session.id} value={session.id}>
                        {session.title}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-white/70">Presets</label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-white/10 bg-transparent text-white hover:bg-white/10"
                    onClick={() => applyMainStagePreset("keynote_start")}
                  >
                    Start Main Stage
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-white/10 bg-transparent text-white hover:bg-white/10"
                    onClick={() => applyMainStagePreset("session_change")}
                  >
                    Session Change
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-white/10 bg-transparent text-white hover:bg-white/10"
                    onClick={() => applyMainStagePreset("return_from_break")}
                  >
                    Return to Main Stage
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-white/70">Transition Type</label>
                <select
                  name="transitionType"
                  value={mainStageTransitionType}
                  onChange={(e) => setMainStageTransitionType(e.target.value as TransitionType)}
                  className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm"
                >
                  <option value="auto">Auto (Recommended)</option>
                  <option value="main_stage_arrival">Main Stage Arrival</option>
                  <option value="fade">Fade</option>
                  <option value="wipe">Wipe</option>
                  <option value="wipe_left">Wipe Left</option>
                  <option value="wipe_right">Wipe Right</option>
                  <option value="zoom">Zoom</option>
                  <option value="zoom_in">Zoom In</option>
                  <option value="zoom_out">Zoom Out</option>
                  <option value="dip_to_black">Dip to Black</option>
                </select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm text-white/70">
                  <span>Duration</span>
                  <span>{mainStageDuration}ms</span>
                </div>

                <Slider
                  value={[mainStageDuration]}
                  onValueChange={(value) => setMainStageDuration(value[0] ?? 3000)}
                  min={800}
                  max={6000}
                  step={100}
                />

                <input type="hidden" name="transitionDuration" value={mainStageDuration} />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-white/70">Headline</label>
                <input
                  name="headline"
                  value={mainStageHeadline}
                  onChange={(e) => setMainStageHeadline(e.target.value)}
                  placeholder="Headline"
                  className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-white/70">Message</label>
                <textarea
                  name="message"
                  value={mainStageMessage}
                  onChange={(e) => setMainStageMessage(e.target.value)}
                  placeholder="Message"
                  rows={4}
                  className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm"
                />
              </div>

              <div className="flex flex-wrap justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/10 bg-transparent text-white hover:bg-white/10"
                  onClick={() => setMainStageOpen(false)}
                >
                  Cancel
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="border-white/10 bg-transparent text-white hover:bg-white/10"
                  onClick={() =>
                    runPreview({
                      variant: "general_session",
                      transitionType: mainStageTransitionType,
                      headline: mainStageHeadline || "Now Entering Main Stage",
                      message: mainStageMessage || "The keynote is beginning now.",
                      duration: mainStageDuration,
                    })
                  }
                >
                  Preview Transition
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="border-white/10 bg-transparent text-white hover:bg-white/10"
                  onClick={() =>
                    addRunOfShowItem({
                      label:
                        generalSessions.find((item) => item.id === mainStageSessionId)?.title ||
                        mainStageHeadline ||
                        "Main Stage",
                      destinationKind: "general_session",
                      destinationId: mainStageSessionId || null,
                      transitionType: mainStageTransitionType,
                      duration: mainStageDuration,
                      headline: mainStageHeadline || "Now Entering Main Stage",
                      message: mainStageMessage || "The keynote is beginning now.",
                    })
                  }
                  disabled={!mainStageSessionId || generalSessions.length === 0}
                >
                  Add to Run of Show
                </Button>

                <Button
                  type="submit"
                  className="bg-green-600 text-white hover:bg-green-500"
                  disabled={!mainStageSessionId || generalSessions.length === 0}
                >
                  Apply Transition
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={sessionOpen} onOpenChange={setSessionOpen}>
          <DialogTrigger asChild>
            <Button className="w-full rounded-xl bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-500">
              Send to Session
            </Button>
          </DialogTrigger>

          <DialogContent className="border-white/10 bg-slate-950 text-white sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Session Transition</DialogTitle>
              <DialogDescription className="text-white/60">
                Choose a destination session and configure the audience transition.
              </DialogDescription>
            </DialogHeader>

            <form
              action={async (formData) => {
                await goToSession(formData)
                setSessionOpen(false)
                scheduleTransitionClear(sessionDuration)
              }}
              className="space-y-5"
            >
              <div className="space-y-2">
                <label className="text-sm text-white/70">Destination Session</label>
                <select
                  name="sessionId"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm"
                >
                  {sessions.length === 0 ? (
                    <option value="">No sessions available</option>
                  ) : (
                    sessions.map((session) => (
                      <option key={session.id} value={session.id}>
                        {session.title}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-white/70">Presets</label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-white/10 bg-transparent text-white hover:bg-white/10"
                    onClick={() => applySessionPreset("enter_session")}
                  >
                    Enter Session
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-white/10 bg-transparent text-white hover:bg-white/10"
                    onClick={() => applySessionPreset("move_to_next")}
                  >
                    Move to Next
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-white/10 bg-transparent text-white hover:bg-white/10"
                    onClick={() => applySessionPreset("focused_start")}
                  >
                    Focused Start
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-white/70">Transition Type</label>
                <select
                  name="transitionType"
                  value={sessionTransitionType}
                  onChange={(e) => setSessionTransitionType(e.target.value as TransitionType)}
                  className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm"
                >
                  <option value="auto">Auto (Recommended)</option>
                  <option value="fade">Fade</option>
                  <option value="wipe">Wipe</option>
                  <option value="wipe_left">Wipe Left</option>
                  <option value="wipe_right">Wipe Right</option>
                  <option value="zoom">Zoom</option>
                  <option value="zoom_in">Zoom In</option>
                  <option value="zoom_out">Zoom Out</option>
                  <option value="dip_to_black">Dip to Black</option>
                </select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm text-white/70">
                  <span>Duration</span>
                  <span>{sessionDuration}ms</span>
                </div>

                <Slider
                  value={[sessionDuration]}
                  onValueChange={(value) => setSessionDuration(value[0] ?? 2200)}
                  min={800}
                  max={6000}
                  step={100}
                />

                <input type="hidden" name="transitionDuration" value={sessionDuration} />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-white/70">Headline</label>
                <input
                  name="headline"
                  value={sessionHeadline}
                  onChange={(e) => setSessionHeadline(e.target.value)}
                  placeholder="Headline"
                  className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-white/70">Message</label>
                <textarea
                  name="message"
                  value={sessionMessage}
                  onChange={(e) => setSessionMessage(e.target.value)}
                  placeholder="Message"
                  rows={4}
                  className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm"
                />
              </div>

              <div className="flex flex-wrap justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/10 bg-transparent text-white hover:bg-white/10"
                  onClick={() => setSessionOpen(false)}
                >
                  Cancel
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="border-white/10 bg-transparent text-white hover:bg-white/10"
                  onClick={() =>
                    runPreview({
                      variant: "session",
                      transitionType: sessionTransitionType,
                      headline: sessionHeadline || "Entering Session",
                      message: sessionMessage || "Your next session is opening.",
                      duration: sessionDuration,
                    })
                  }
                >
                  Preview Transition
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="border-white/10 bg-transparent text-white hover:bg-white/10"
                  onClick={() =>
                    addRunOfShowItem({
                      label:
                        sessions.find((item) => item.id === sessionId)?.title ||
                        sessionHeadline ||
                        "Session",
                      destinationKind: "session",
                      destinationId: sessionId || null,
                      transitionType: sessionTransitionType,
                      duration: sessionDuration,
                      headline: sessionHeadline || "Entering Session",
                      message: sessionMessage || "Your next session is opening.",
                    })
                  }
                  disabled={!sessionId || sessions.length === 0}
                >
                  Add to Run of Show
                </Button>

                <Button
                  type="submit"
                  className="bg-blue-600 text-white hover:bg-blue-500"
                  disabled={!sessionId || sessions.length === 0}
                >
                  Apply Transition
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={breakoutOpen} onOpenChange={setBreakoutOpen}>
          <DialogTrigger asChild>
            <Button className="w-full rounded-xl bg-purple-600 px-4 py-3 font-medium text-white hover:bg-purple-500">
              Send to Breakout
            </Button>
          </DialogTrigger>

          <DialogContent className="border-white/10 bg-slate-950 text-white sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Breakout Transition</DialogTitle>
              <DialogDescription className="text-white/60">
                Choose a destination breakout and configure the audience transition.
              </DialogDescription>
            </DialogHeader>

            <form
              action={async (formData) => {
                await goToBreakout(formData)
                setBreakoutOpen(false)
                scheduleTransitionClear(breakoutDuration)
              }}
              className="space-y-5"
            >
              <div className="space-y-2">
                <label className="text-sm text-white/70">Destination Breakout</label>
                <select
                  name="breakoutId"
                  value={breakoutId}
                  onChange={(e) => setBreakoutId(e.target.value)}
                  className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm"
                >
                  {breakouts.length === 0 ? (
                    <option value="">No breakouts available</option>
                  ) : (
                    breakouts.map((breakout) => (
                      <option key={breakout.id} value={breakout.id}>
                        {breakout.title}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-white/70">Presets</label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-white/10 bg-transparent text-white hover:bg-white/10"
                    onClick={() => applyBreakoutPreset("open_breakout")}
                  >
                    Open Breakout
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-white/10 bg-transparent text-white hover:bg-white/10"
                    onClick={() => applyBreakoutPreset("split_rooms")}
                  >
                    Split Rooms
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-white/10 bg-transparent text-white hover:bg-white/10"
                    onClick={() => applyBreakoutPreset("breakout_focus")}
                  >
                    Breakout Focus
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-white/70">Transition Type</label>
                <select
                  name="transitionType"
                  value={breakoutTransitionType}
                  onChange={(e) => setBreakoutTransitionType(e.target.value as TransitionType)}
                  className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm"
                >
                  <option value="auto">Auto (Recommended)</option>
                  <option value="fade">Fade</option>
                  <option value="wipe">Wipe</option>
                  <option value="wipe_left">Wipe Left</option>
                  <option value="wipe_right">Wipe Right</option>
                  <option value="zoom">Zoom</option>
                  <option value="zoom_in">Zoom In</option>
                  <option value="zoom_out">Zoom Out</option>
                  <option value="dip_to_black">Dip to Black</option>
                </select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm text-white/70">
                  <span>Duration</span>
                  <span>{breakoutDuration}ms</span>
                </div>

                <Slider
                  value={[breakoutDuration]}
                  onValueChange={(value) => setBreakoutDuration(value[0] ?? 2200)}
                  min={800}
                  max={6000}
                  step={100}
                />

                <input type="hidden" name="transitionDuration" value={breakoutDuration} />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-white/70">Headline</label>
                <input
                  name="headline"
                  value={breakoutHeadline}
                  onChange={(e) => setBreakoutHeadline(e.target.value)}
                  placeholder="Headline"
                  className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-white/70">Message</label>
                <textarea
                  name="message"
                  value={breakoutMessage}
                  onChange={(e) => setBreakoutMessage(e.target.value)}
                  placeholder="Message"
                  rows={4}
                  className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm"
                />
              </div>

              <div className="flex flex-wrap justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/10 bg-transparent text-white hover:bg-white/10"
                  onClick={() => setBreakoutOpen(false)}
                >
                  Cancel
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="border-white/10 bg-transparent text-white hover:bg-white/10"
                  onClick={() =>
                    runPreview({
                      variant: "breakout",
                      transitionType: breakoutTransitionType,
                      headline: breakoutHeadline || "Entering Breakout",
                      message:
                        breakoutMessage || "We’re moving you into a breakout room.",
                      duration: breakoutDuration,
                    })
                  }
                >
                  Preview Transition
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="border-white/10 bg-transparent text-white hover:bg-white/10"
                  onClick={() =>
                    addRunOfShowItem({
                      label:
                        breakouts.find((item) => item.id === breakoutId)?.title ||
                        breakoutHeadline ||
                        "Breakout",
                      destinationKind: "breakout",
                      destinationId: breakoutId || null,
                      transitionType: breakoutTransitionType,
                      duration: breakoutDuration,
                      headline: breakoutHeadline || "Entering Breakout",
                      message:
                        breakoutMessage || "We’re moving you into a breakout room.",
                    })
                  }
                  disabled={!breakoutId || breakouts.length === 0}
                >
                  Add to Run of Show
                </Button>

                <Button
                  type="submit"
                  className="bg-purple-600 text-white hover:bg-purple-500"
                  disabled={!breakoutId || breakouts.length === 0}
                >
                  Apply Transition
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={offAirOpen} onOpenChange={setOffAirOpen}>
          <DialogTrigger asChild>
            <Button className="w-full rounded-xl bg-gray-700 px-4 py-3 font-medium text-white hover:bg-gray-600">
              Off Air
            </Button>
          </DialogTrigger>

          <DialogContent className="border-white/10 bg-slate-950 text-white sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Off Air Transition</DialogTitle>
              <DialogDescription className="text-white/60">
                Configure the transition that returns attendees to the event home page.
              </DialogDescription>
            </DialogHeader>

            <form
              action={async (formData) => {
                await goOffAir(formData)
                setOffAirOpen(false)
                scheduleTransitionClear(offAirDuration)
              }}
              className="space-y-5"
            >
              <div className="space-y-2">
                <label className="text-sm text-white/70">Presets</label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-white/10 bg-transparent text-white hover:bg-white/10"
                    onClick={() => applyOffAirPreset("intermission")}
                  >
                    Intermission
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-white/10 bg-transparent text-white hover:bg-white/10"
                    onClick={() => applyOffAirPreset("end_of_day")}
                  >
                    End of Day
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-white/10 bg-transparent text-white hover:bg-white/10"
                    onClick={() => applyOffAirPreset("reset_room")}
                  >
                    Reset Room
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-white/70">Transition Type</label>
                <select
                  name="transitionType"
                  value={offAirTransitionType}
                  onChange={(e) => setOffAirTransitionType(e.target.value as TransitionType)}
                  className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm"
                >
                  <option value="auto">Auto (Recommended)</option>
                  <option value="fade">Fade</option>
                  <option value="wipe">Wipe</option>
                  <option value="wipe_left">Wipe Left</option>
                  <option value="wipe_right">Wipe Right</option>
                  <option value="zoom">Zoom</option>
                  <option value="zoom_in">Zoom In</option>
                  <option value="zoom_out">Zoom Out</option>
                  <option value="dip_to_black">Dip to Black</option>
                </select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm text-white/70">
                  <span>Duration</span>
                  <span>{offAirDuration}ms</span>
                </div>

                <Slider
                  value={[offAirDuration]}
                  onValueChange={(value) => setOffAirDuration(value[0] ?? 2600)}
                  min={800}
                  max={6000}
                  step={100}
                />

                <input type="hidden" name="transitionDuration" value={offAirDuration} />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-white/70">Headline</label>
                <input
                  name="headline"
                  value={offAirHeadline}
                  onChange={(e) => setOffAirHeadline(e.target.value)}
                  placeholder="Headline"
                  className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-white/70">Message</label>
                <textarea
                  name="message"
                  value={offAirMessage}
                  onChange={(e) => setOffAirMessage(e.target.value)}
                  placeholder="Message"
                  rows={4}
                  className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm"
                />
              </div>

              <div className="flex flex-wrap justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/10 bg-transparent text-white hover:bg-white/10"
                  onClick={() => setOffAirOpen(false)}
                >
                  Cancel
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="border-white/10 bg-transparent text-white hover:bg-white/10"
                  onClick={() =>
                    runPreview({
                      variant: "off_air",
                      transitionType: offAirTransitionType,
                      headline: offAirHeadline || "We’ll Be Right Back",
                      message:
                        offAirMessage || "Returning attendees to the event home page.",
                      duration: offAirDuration,
                    })
                  }
                >
                  Preview Transition
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="border-white/10 bg-transparent text-white hover:bg-white/10"
                  onClick={() =>
                    addRunOfShowItem({
                      label: offAirHeadline || "Off Air",
                      destinationKind: "off_air",
                      destinationId: null,
                      transitionType: offAirTransitionType,
                      duration: offAirDuration,
                      headline: offAirHeadline || "We’ll Be Right Back",
                      message:
                        offAirMessage || "Returning attendees to the event home page.",
                    })
                  }
                >
                  Add to Run of Show
                </Button>

                <Button type="submit" className="bg-gray-700 text-white hover:bg-gray-600">
                  Apply Transition
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Run of Show</h2>
            <p className="mt-1 text-sm text-white/55">
              Queue upcoming audience transitions before firing them live.
            </p>
          </div>

          <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/60">
            {runOfShowItems.length} queued
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {runOfShowItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-white/50">
              No queued transitions yet.
            </div>
          ) : (
            runOfShowItems.map((item, index) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-4 rounded-xl border border-white/10 bg-black/20 p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/40">
                    Cue {index + 1}
                  </div>

                  <div className="mt-1 text-base font-medium text-white">
                    {destinationLabel(item, {
                      generalSessionMap,
                      sessionMap,
                      breakoutMap,
                    })}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-white/55">
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                      {item.destinationKind}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                      {item.transitionType}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                      {item.duration}ms
                    </span>
                  </div>

                  <div className="mt-2 text-sm text-white/65">{item.headline}</div>
                  <div className="mt-1 text-sm text-white/45">{item.message}</div>
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    className="bg-emerald-600 text-white hover:bg-emerald-500"
                    onClick={() => {
                      void fireRunOfShowItem(item)
                    }}
                  >
                    Fire
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="border-white/10 bg-transparent text-white hover:bg-white/10"
                    onClick={() => moveRunOfShowItemUp(item.id)}
                    disabled={index === 0}
                  >
                    Move Up
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="border-white/10 bg-transparent text-white hover:bg-white/10"
                    onClick={() => moveRunOfShowItemDown(item.id)}
                    disabled={index === runOfShowItems.length - 1}
                  >
                    Move Down
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="border-white/10 bg-transparent text-white hover:bg-white/10"
                    onClick={() => removeRunOfShowItem(item.id)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/40 p-4 text-xs">
        <pre>{JSON.stringify(routingState, null, 2)}</pre>
      </div>

      <StageTransitionOverlay
        active={previewActive}
        variant={previewVariant}
        transitionType={previewType}
        headline={previewHeadline}
        message={previewMessage}
        holdMs={previewHoldMs}
        isPreview={true}
      />
    </div>
  )
}