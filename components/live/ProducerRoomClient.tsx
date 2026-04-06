"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useTracks,
  VideoTrack,
} from "@livekit/components-react"
import { Track } from "livekit-client"
import type {
  TrackReference,
  TrackReferenceOrPlaceholder,
} from "@livekit/components-core"

type StageLayout = "solo" | "grid" | "screen_speaker"
type StageTransitionType = "cut" | "fade" | "dip_to_black"

type StageStateResponse = {
  state?: {
    session_id: string
    preview_layout?: StageLayout
    preview_stage_participant_ids?: string[]
    preview_primary_participant_id?: string | null
    program_layout?: StageLayout
    program_stage_participant_ids?: string[]
    program_primary_participant_id?: string | null
    transition_type?: StageTransitionType
    transition_started_at?: string | null
  }
}

type ParticipantRecord = {
  identity: string
  name: string
  cameraTrack?: TrackReference
  screenTrack?: TrackReference
}

type SceneRecord = {
  id: string
  name: string
  layout: StageLayout
  stage_participant_ids: string[]
  primary_participant_id: string | null
}

function isTrackReference(
  value: TrackReferenceOrPlaceholder | null | undefined
): value is TrackReference {
  return !!value && !!value.publication
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

function SectionEyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="text-[11px] uppercase tracking-[0.24em] text-white/40">
      {children}
    </div>
  )
}

function GlassPanel({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cx(
        "rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl",
        className
      )}
    >
      {children}
    </div>
  )
}

function MetricPill({
  label,
  value,
  tone = "default",
}: {
  label: string
  value: string
  tone?: "default" | "sky" | "red" | "emerald" | "amber"
}) {
  const toneClass =
    tone === "sky"
      ? "border-sky-400/20 bg-sky-400/10 text-sky-100"
      : tone === "red"
        ? "border-red-400/25 bg-red-500/10 text-red-100"
        : tone === "emerald"
          ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
          : tone === "amber"
            ? "border-amber-400/25 bg-amber-500/10 text-amber-100"
            : "border-white/10 bg-white/5 text-white/80"

  return (
    <div className={cx("rounded-full border px-3 py-1.5 text-xs", toneClass)}>
      <span className="text-white/45">{label}</span>
      <span className="ml-1 font-medium text-white">{value}</span>
    </div>
  )
}

function StatusDot({ tone = "red" }: { tone?: "red" | "emerald" | "sky" | "amber" }) {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-400 shadow-[0_0_16px_rgba(74,222,128,0.9)]"
      : tone === "sky"
        ? "bg-sky-400 shadow-[0_0_16px_rgba(56,189,248,0.9)]"
        : tone === "amber"
          ? "bg-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.9)]"
          : "bg-red-400 shadow-[0_0_16px_rgba(248,113,113,0.95)]"

  return <span className={cx("inline-block h-2.5 w-2.5 rounded-full", toneClass)} />
}

function LayoutChip({
  active,
  onClick,
  title,
  description,
}: {
  active: boolean
  onClick: () => void
  title: string
  description: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "w-full rounded-2xl border p-3 text-left transition hover:border-white/20 hover:bg-white/[0.07]",
        active
          ? "border-sky-400/40 bg-sky-500/10 shadow-[0_0_0_1px_rgba(56,189,248,0.12)_inset]"
          : "border-white/10 bg-black/20"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-white">{title}</div>
          <div className="mt-1 text-xs leading-5 text-white/50">{description}</div>
        </div>
        {active ? <StatusDot tone="sky" /> : <span className="mt-1 h-2.5 w-2.5 rounded-full border border-white/20" />}
      </div>
    </button>
  )
}

function TransitionButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "rounded-xl border px-3 py-2 text-sm transition",
        active
          ? "border-white/30 bg-white text-slate-950"
          : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
      )}
    >
      {children}
    </button>
  )
}

function ParticipantBadge({ name }: { name: string }) {
  return (
    <div className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-white/70">
      {name}
    </div>
  )
}

function MiniSceneCard({
  scene,
  isActive,
  onLoad,
  onDelete,
}: {
  scene: SceneRecord
  isActive: boolean
  onLoad: () => void
  onDelete: () => void
}) {
  return (
    <div
      className={cx(
        "min-w-[240px] rounded-[24px] border p-4",
        isActive
          ? "border-sky-400/35 bg-sky-500/10"
          : "border-white/10 bg-white/[0.04]"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-white">{scene.name}</div>
          <div className="mt-1 text-xs text-white/45">
            {scene.layout} • {scene.stage_participant_ids.length} on stage
          </div>
        </div>
        {isActive ? <StatusDot tone="sky" /> : null}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, index) => {
          const filled = index < Math.min(scene.stage_participant_ids.length, 3)
          return (
            <div
              key={`${scene.id}-slot-${index}`}
              className={cx(
                "aspect-video rounded-xl border",
                filled
                  ? "border-white/15 bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.18),rgba(15,23,42,0.8))]"
                  : "border-white/10 bg-black/30"
              )}
            />
          )
        })}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onLoad}
          className="rounded-xl bg-sky-500 px-3 py-2 text-sm font-medium text-slate-950 transition hover:bg-sky-400"
        >
          Load
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 transition hover:bg-white/10"
        >
          Delete
        </button>
      </div>
    </div>
  )
}

function ProgramMonitor({
  title,
  subtitle,
  layout,
  stageIds,
  primaryId,
  emptyLabel,
  accent,
  live,
  realTrackRefs,
}: {
  title: string
  subtitle: string
  layout: StageLayout
  stageIds: string[]
  primaryId: string | null
  emptyLabel: string
  accent: "sky" | "red"
  live?: boolean
  realTrackRefs: TrackReference[]
}) {
  const selectedTracks = useMemo(
    () =>
      realTrackRefs.filter((trackRef) =>
        stageIds.includes(trackRef.participant.identity)
      ),
    [realTrackRefs, stageIds]
  )

  const selectedScreenTracks = useMemo(
    () =>
      selectedTracks.filter(
        (trackRef) => trackRef.publication.source === Track.Source.ScreenShare
      ),
    [selectedTracks]
  )

  const selectedCameraTracks = useMemo(
    () =>
      selectedTracks.filter(
        (trackRef) => trackRef.publication.source === Track.Source.Camera
      ),
    [selectedTracks]
  )

  const selectedPrimaryCamera =
    (primaryId
      ? selectedCameraTracks.find(
          (trackRef) => trackRef.participant.identity === primaryId
        )
      : null) || selectedCameraTracks[0] || null

  const selectedPrimaryScreen =
    (primaryId
      ? selectedScreenTracks.find(
          (trackRef) => trackRef.participant.identity === primaryId
        )
      : null) || selectedScreenTracks[0] || null

  const accentClass =
    accent === "red"
      ? "border-red-400/25 shadow-[0_0_0_1px_rgba(248,113,113,0.08)_inset]"
      : "border-sky-400/25 shadow-[0_0_0_1px_rgba(56,189,248,0.08)_inset]"

  const badgeClass =
    accent === "red"
      ? "border-red-400/25 bg-red-500/10 text-red-100"
      : "border-sky-400/25 bg-sky-500/10 text-sky-100"

  return (
    <GlassPanel className={cx("relative overflow-hidden p-4", accentClass)}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <SectionEyebrow>{title}</SectionEyebrow>
            {live ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-red-400/25 bg-red-500/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-red-100">
                <StatusDot tone="red" />
                Live
              </div>
            ) : null}
          </div>
          <div className="mt-2 text-sm text-white/60">{subtitle}</div>
        </div>

        <div className={cx("rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em]", badgeClass)}>
          {layout.replace("_", " + ")}
        </div>
      </div>

      <div className="relative mt-4 overflow-hidden rounded-[24px] border border-white/10 bg-black shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
        {layout === "screen_speaker" && selectedPrimaryScreen ? (
          <div className="relative">
            <VideoTrack
              trackRef={selectedPrimaryScreen}
              className="aspect-video w-full object-contain"
            />

            {selectedPrimaryCamera ? (
              <div className="absolute bottom-4 right-4 w-56 max-w-[34%] overflow-hidden rounded-2xl border border-white/15 bg-black shadow-2xl">
                <VideoTrack
                  trackRef={selectedPrimaryCamera}
                  className="aspect-video w-full object-cover"
                />
                <div className="border-t border-white/10 bg-black/80 px-3 py-2 text-xs text-white/80">
                  {selectedPrimaryCamera.participant.name ||
                    selectedPrimaryCamera.participant.identity}
                </div>
              </div>
            ) : null}
          </div>
        ) : layout === "grid" && selectedCameraTracks.length > 1 ? (
          <div className="grid gap-px bg-white/10 md:grid-cols-2">
            {selectedCameraTracks.map((trackRef) => (
              <div
                key={`${title}-${trackRef.publication.trackSid}`}
                className="overflow-hidden bg-black"
              >
                <VideoTrack
                  trackRef={trackRef}
                  className="aspect-video w-full object-cover"
                />
                <div className="border-t border-white/10 bg-black/80 px-3 py-2 text-xs text-white/80">
                  {trackRef.participant.name || trackRef.participant.identity}
                </div>
              </div>
            ))}
          </div>
        ) : selectedPrimaryCamera ? (
          <div>
            <VideoTrack
              trackRef={selectedPrimaryCamera}
              className="aspect-video w-full object-cover"
            />
            <div className="border-t border-white/10 bg-black/80 px-3 py-2 text-xs text-white/80">
              {selectedPrimaryCamera.participant.name ||
                selectedPrimaryCamera.participant.identity}
            </div>
          </div>
        ) : (
          <div className="flex aspect-video items-center justify-center bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.14),rgba(2,6,23,0.95))] text-sm text-white/45">
            {emptyLabel}
          </div>
        )}

        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/10 to-transparent" />
      </div>

      <div className="relative mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">On stage</div>
          <div className="mt-2 text-xl font-semibold text-white">{stageIds.length}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">Primary</div>
          <div className="mt-2 truncate text-sm font-medium text-white">
            {primaryId || "Not locked"}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">Mode</div>
          <div className="mt-2 text-sm font-medium capitalize text-white">
            {layout.replace("_", " ")}
          </div>
        </div>
      </div>
    </GlassPanel>
  )
}

function ProducerRoomInner({
  stageEndpoint,
}: {
  stageEndpoint: string
}) {
  const trackRefs = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: false },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: true }
  )

  const realTrackRefs = useMemo(
    () => trackRefs.filter(isTrackReference),
    [trackRefs]
  )

  const { producers, stageCandidates } = useMemo(() => {
    const byIdentity = new Map<string, ParticipantRecord>()

    for (const trackRef of realTrackRefs) {
      const identity = trackRef.participant.identity
      const existing = byIdentity.get(identity) ?? {
        identity,
        name: trackRef.participant.name || identity,
      }

      if (trackRef.publication.source === Track.Source.Camera) {
        existing.cameraTrack = trackRef
      }

      if (trackRef.publication.source === Track.Source.ScreenShare) {
        existing.screenTrack = trackRef
      }

      byIdentity.set(identity, existing)
    }

    const allParticipants = Array.from(byIdentity.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    )

    return {
      producers: allParticipants.filter((p) => p.identity.startsWith("producer-")),
      stageCandidates: allParticipants.filter(
        (p) => !p.identity.startsWith("producer-")
      ),
    }
  }, [realTrackRefs])

  const activeScreenSharer = useMemo(() => {
    return (
      stageCandidates.find((participant) => Boolean(participant.screenTrack)) || null
    )
  }, [stageCandidates])

  const [layout, setLayout] = useState<StageLayout>("solo")
  const [stageIds, setStageIds] = useState<string[]>([])
  const [primaryId, setPrimaryId] = useState<string | null>(null)

  const [programLayout, setProgramLayout] = useState<StageLayout>("solo")
  const [programStageIds, setProgramStageIds] = useState<string[]>([])
  const [programPrimaryId, setProgramPrimaryId] = useState<string | null>(null)

  const [takeTransition, setTakeTransition] =
    useState<StageTransitionType>("fade")
  const [saving, setSaving] = useState(false)

  const [scenes, setScenes] = useState<SceneRecord[]>([])
  const [sceneName, setSceneName] = useState("")

  const scenesEndpoint = `${stageEndpoint}/scenes`

  useEffect(() => {
    let cancelled = false

    async function loadStageState() {
      try {
        const res = await fetch(stageEndpoint, { cache: "no-store" })
        const data = (await res.json().catch((): null => null)) as
          | StageStateResponse
          | null

        if (!res.ok || cancelled || !data?.state) return

        setLayout(data.state.preview_layout || "solo")
        setStageIds(data.state.preview_stage_participant_ids || [])
        setPrimaryId(data.state.preview_primary_participant_id || null)

        setProgramLayout(data.state.program_layout || "solo")
        setProgramStageIds(data.state.program_stage_participant_ids || [])
        setProgramPrimaryId(data.state.program_primary_participant_id || null)
      } catch {
        // ignore
      }
    }

    async function loadScenes() {
      try {
        const res = await fetch(scenesEndpoint, { cache: "no-store" })
        const data = (await res.json().catch((): null => null)) as
          | { scenes?: SceneRecord[] }
          | null

        if (!res.ok || cancelled) return
        setScenes(data?.scenes || [])
      } catch {
        // ignore
      }
    }

    void loadStageState()
    void loadScenes()

    const intervalId = window.setInterval(() => {
      void loadStageState()
    }, 3000)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [stageEndpoint, scenesEndpoint])

  async function refreshScenes() {
    const res = await fetch(scenesEndpoint, { cache: "no-store" })
    const data = (await res.json().catch((): null => null)) as
      | { scenes?: SceneRecord[] }
      | null

    if (res.ok) {
      setScenes(data?.scenes || [])
    }
  }

  async function saveStageState(next: {
    layout?: StageLayout
    stageIds?: string[]
    primaryId?: string | null
  }) {
    const nextLayout = next.layout ?? layout
    const nextStageIds = next.stageIds ?? stageIds
    const nextPrimaryId =
      next.primaryId !== undefined
        ? next.primaryId
        : nextStageIds.includes(primaryId || "")
          ? primaryId
          : nextStageIds[0] || null

    setSaving(true)

    try {
      const res = await fetch(stageEndpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          layout: nextLayout,
          stage_participant_ids: nextStageIds,
          primary_participant_id: nextPrimaryId,
        }),
      })

      const data = (await res.json().catch((): null => null)) as
        | { error?: string }
        | null

      if (!res.ok) {
        throw new Error(data?.error || "Failed to save stage state")
      }

      setLayout(nextLayout)
      setStageIds(nextStageIds)
      setPrimaryId(nextPrimaryId)
    } catch (error) {
      console.error("Failed to save stage state", error)
      alert(error instanceof Error ? error.message : "Failed to save stage state")
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (!activeScreenSharer) return
    if (!stageIds.includes(activeScreenSharer.identity)) return
    if (layout === "screen_speaker" && primaryId === activeScreenSharer.identity) {
      return
    }

    void saveStageState({
      layout: "screen_speaker",
      primaryId: activeScreenSharer.identity,
    })
  }, [activeScreenSharer, stageIds, layout, primaryId])

  useEffect(() => {
    const stagedScreenSharer = stageCandidates.find(
      (participant) =>
        stageIds.includes(participant.identity) && Boolean(participant.screenTrack)
    )

    if (stagedScreenSharer) return
    if (layout !== "screen_speaker") return

    void saveStageState({
      layout: "solo",
      primaryId: stageIds[0] || null,
    })
  }, [stageCandidates, stageIds, layout])

  async function takeLive() {
    try {
      const res = await fetch(`${stageEndpoint}/take`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          transition_type: takeTransition,
        }),
      })

      const data = (await res.json().catch((): null => null)) as
        | { error?: string }
        | null

      if (!res.ok) {
        throw new Error(data?.error || "Failed to take program live")
      }

      setProgramLayout(layout)
      setProgramStageIds(stageIds)
      setProgramPrimaryId(primaryId)
    } catch (error) {
      console.error("Failed to take live", error)
      alert(error instanceof Error ? error.message : "Failed to take program live")
    }
  }

  function clearPreview() {
    void saveStageState({
      stageIds: [],
      primaryId: null,
    })
  }

  async function clearAndTakeLive() {
    try {
      await saveStageState({
        stageIds: [],
        primaryId: null,
      })

      const res = await fetch(`${stageEndpoint}/take`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          transition_type: takeTransition,
        }),
      })

      const data = (await res.json().catch((): null => null)) as
        | { error?: string }
        | null

      if (!res.ok) {
        throw new Error(data?.error || "Failed to clear and take live")
      }

      setProgramStageIds([])
      setProgramPrimaryId(null)
    } catch (error) {
      console.error("Failed to clear and take live", error)
      alert(error instanceof Error ? error.message : "Failed to clear and take live")
    }
  }

  function toggleParticipant(identity: string) {
    if (stageIds.includes(identity)) {
      const nextIds = stageIds.filter((id) => id !== identity)
      const nextPrimary = primaryId === identity ? nextIds[0] || null : primaryId

      void saveStageState({
        stageIds: nextIds,
        primaryId: nextPrimary,
      })
      return
    }

    const nextIds = [...stageIds, identity]

    void saveStageState({
      stageIds: nextIds,
      primaryId: primaryId || identity,
    })
  }

  function makePrimary(identity: string) {
    if (!stageIds.includes(identity)) return
    void saveStageState({ primaryId: identity })
  }

  async function saveCurrentScene() {
    try {
      const res = await fetch(scenesEndpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: sceneName || "Untitled Scene",
          layout,
          stage_participant_ids: stageIds,
          primary_participant_id: primaryId,
        }),
      })

      const data = (await res.json().catch((): null => null)) as
        | { error?: string }
        | null

      if (!res.ok) {
        throw new Error(data?.error || "Failed to save scene")
      }

      setSceneName("")
      await refreshScenes()
    } catch (error) {
      console.error("Failed to save scene", error)
      alert(error instanceof Error ? error.message : "Failed to save scene")
    }
  }

  function loadScene(scene: SceneRecord) {
    void saveStageState({
      layout: scene.layout,
      stageIds: scene.stage_participant_ids,
      primaryId: scene.primary_participant_id,
    })
  }

  async function deleteScene(sceneId: string) {
    try {
      const res = await fetch(`${scenesEndpoint}/${sceneId}`, {
        method: "DELETE",
      })

      const data = (await res.json().catch((): null => null)) as
        | { error?: string }
        | null

      if (!res.ok) {
        throw new Error(data?.error || "Failed to delete scene")
      }

      await refreshScenes()
    } catch (error) {
      console.error("Failed to delete scene", error)
      alert(error instanceof Error ? error.message : "Failed to delete scene")
    }
  }

  const activeSceneId = useMemo(() => {
    const currentIds = [...stageIds].sort().join("|")

    return (
      scenes.find((scene) => {
        const sceneIds = [...scene.stage_participant_ids].sort().join("|")
        return (
          scene.layout === layout &&
          sceneIds === currentIds &&
          (scene.primary_participant_id || null) === (primaryId || null)
        )
      })?.id || null
    )
  }, [layout, stageIds, primaryId, scenes])

  const previewNames = useMemo(
    () =>
      stageCandidates
        .filter((participant) => stageIds.includes(participant.identity))
        .map((participant) => participant.name),
    [stageCandidates, stageIds]
  )

  const liveNames = useMemo(
    () =>
      stageCandidates
        .filter((participant) => programStageIds.includes(participant.identity))
        .map((participant) => participant.name),
    [stageCandidates, programStageIds]
  )

  return (
    <div className="relative overflow-hidden rounded-[36px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.18),rgba(2,6,23,0.96)_42%),linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,1))] p-4 text-white shadow-[0_30px_120px_rgba(0,0,0,0.55)] md:p-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-8%] h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute right-[-6%] top-[10%] h-80 w-80 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute bottom-[-12%] left-[24%] h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06),transparent_40%)]" />
      </div>

      <RoomAudioRenderer />

      <div className="relative space-y-5">
        <GlassPanel className="overflow-hidden p-5 md:p-6">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <SectionEyebrow>Jupiter Mission Control</SectionEyebrow>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
                Direct the live story with cinematic control.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65 md:text-base">
                Build the next moment in Preview, monitor what is on Program, then
                take the show live with deliberate transitions.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <MetricPill label="Preview" value={`${stageIds.length} selected`} tone="sky" />
                <MetricPill label="Program" value={`${programStageIds.length} live`} tone="red" />
                <MetricPill label="Transition" value={takeTransition.replace("_", " ")} tone="amber" />
                <MetricPill
                  label="Status"
                  value={saving ? "Saving" : "Ready"}
                  tone={saving ? "emerald" : "default"}
                />
              </div>

              {activeScreenSharer ? (
                <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-sky-100">
                  <StatusDot tone="sky" />
                  Screen share detected: {activeScreenSharer.name}
                </div>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:w-[430px] xl:grid-cols-1">
              <div className="rounded-[24px] border border-red-400/20 bg-red-500/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.22em] text-red-100/80">
                      Program Status
                    </div>
                    <div className="mt-2 text-lg font-semibold text-white">On Air</div>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-red-400/25 bg-black/20 px-3 py-1 text-xs uppercase tracking-[0.18em] text-red-100">
                    <StatusDot tone="red" />
                    Live
                  </div>
                </div>
                <div className="mt-3 text-sm text-white/70">
                  Program reflects your current live stage. Preview changes do not go
                  live until you take them.
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 sm:col-span-2 xl:col-span-1">
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">
                  Control Room
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {producers.length > 0 ? (
                    producers.map((producer) => (
                      <ParticipantBadge key={producer.identity} name={producer.name} />
                    ))
                  ) : (
                    <div className="text-sm text-white/45">Producer feed not visible yet.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </GlassPanel>

        <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
          <div className="space-y-5">
            <GlassPanel className="p-4">
              <SectionEyebrow>Stage Layouts</SectionEyebrow>
              <div className="mt-4 space-y-3">
                <LayoutChip
                  active={layout === "solo"}
                  onClick={() => void saveStageState({ layout: "solo" })}
                  title="Solo"
                  description="Single featured speaker. Best for keynotes and host moments."
                />
                <LayoutChip
                  active={layout === "grid"}
                  onClick={() => void saveStageState({ layout: "grid" })}
                  title="Grid"
                  description="Multi-person stage for panels, discussions, and group moments."
                />
                <LayoutChip
                  active={layout === "screen_speaker"}
                  onClick={() => void saveStageState({ layout: "screen_speaker" })}
                  title="Screen + Speaker"
                  description="Shared content with an active presenter window layered on top."
                />
              </div>
            </GlassPanel>

            <GlassPanel className="p-4">
              <div className="flex items-center justify-between gap-3">
                <SectionEyebrow>Save Current Look</SectionEyebrow>
                <div className="text-xs text-white/40">{scenes.length} saved</div>
              </div>
              <div className="mt-4 space-y-3">
                <input
                  value={sceneName}
                  onChange={(e) => setSceneName(e.target.value)}
                  placeholder="Opening keynote"
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => void saveCurrentScene()}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  Save Preview as Scene
                </button>
              </div>
            </GlassPanel>

            <GlassPanel className="p-4">
              <SectionEyebrow>Preview Roster</SectionEyebrow>
              <div className="mt-4 space-y-2">
                {previewNames.length > 0 ? (
                  previewNames.map((name) => (
                    <div
                      key={`preview-${name}`}
                      className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/80"
                    >
                      {name}
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-3 py-4 text-sm text-white/40">
                    Preview is empty.
                  </div>
                )}
              </div>
            </GlassPanel>
          </div>

          <div className="space-y-5">
            <div className="grid gap-5 2xl:grid-cols-2">
              <ProgramMonitor
                title="Preview"
                subtitle="Build the next beat here before it goes live."
                layout={layout}
                stageIds={stageIds}
                primaryId={primaryId}
                emptyLabel="Nothing in preview yet"
                accent="sky"
                realTrackRefs={realTrackRefs}
              />

              <ProgramMonitor
                title="Program"
                subtitle="This is what your audience sees right now."
                layout={programLayout}
                stageIds={programStageIds}
                primaryId={programPrimaryId}
                emptyLabel="Nothing live yet"
                accent="red"
                live
                realTrackRefs={realTrackRefs}
              />
            </div>

            <GlassPanel className="p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <SectionEyebrow>Transitions</SectionEyebrow>
                  <div className="mt-2 text-sm text-white/60">
                    Choose how Preview replaces Program.
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <TransitionButton
                    active={takeTransition === "cut"}
                    onClick={() => setTakeTransition("cut")}
                  >
                    Cut
                  </TransitionButton>
                  <TransitionButton
                    active={takeTransition === "fade"}
                    onClick={() => setTakeTransition("fade")}
                  >
                    Fade
                  </TransitionButton>
                  <TransitionButton
                    active={takeTransition === "dip_to_black"}
                    onClick={() => setTakeTransition("dip_to_black")}
                  >
                    Dip to Black
                  </TransitionButton>
                </div>
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_1fr_1.2fr]">
                <button
                  type="button"
                  onClick={clearPreview}
                  className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-sm font-medium text-yellow-100 transition hover:bg-yellow-500/15"
                >
                  Clear Preview
                </button>
                <button
                  type="button"
                  onClick={clearAndTakeLive}
                  className="rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-100 transition hover:bg-red-500/15"
                >
                  Clear + Take Live
                </button>
                <button
                  type="button"
                  onClick={() => void takeLive()}
                  className="rounded-2xl bg-[linear-gradient(135deg,#fb7185,#ef4444)] px-4 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-[0_20px_50px_rgba(239,68,68,0.35)] transition hover:brightness-110"
                >
                  Take Live
                </button>
              </div>
            </GlassPanel>

            <GlassPanel className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <SectionEyebrow>Saved Looks</SectionEyebrow>
                  <div className="mt-2 text-sm text-white/60">
                    Reusable scenes you can load directly into Preview.
                  </div>
                </div>
              </div>

              <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
                {scenes.length === 0 ? (
                  <div className="w-full rounded-[24px] border border-dashed border-white/10 bg-black/20 p-5 text-sm text-white/45">
                    No saved scenes yet.
                  </div>
                ) : (
                  scenes.map((scene) => (
                    <MiniSceneCard
                      key={scene.id}
                      scene={scene}
                      isActive={activeSceneId === scene.id}
                      onLoad={() => loadScene(scene)}
                      onDelete={() => void deleteScene(scene.id)}
                    />
                  ))
                )}
              </div>
            </GlassPanel>
          </div>

          <div className="space-y-5">
            <GlassPanel className="p-4">
              <SectionEyebrow>Live Status</SectionEyebrow>
              <div className="mt-4 space-y-3 text-sm text-white/70">
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                  <span>Program stage</span>
                  <span className="font-medium text-white">{programStageIds.length} live</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                  <span>Preview stage</span>
                  <span className="font-medium text-white">{stageIds.length} selected</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                  <span>Primary speaker</span>
                  <span className="max-w-[150px] truncate font-medium text-white">
                    {primaryId || "Not set"}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                  <span>Program focus</span>
                  <span className="max-w-[150px] truncate font-medium text-white">
                    {programPrimaryId || "Not set"}
                  </span>
                </div>
              </div>
            </GlassPanel>

            <GlassPanel className="p-4">
              <SectionEyebrow>Q&A Monitor</SectionEyebrow>
              <div className="mt-4 rounded-[24px] border border-dashed border-white/10 bg-black/20 p-4">
                <div className="text-sm font-medium text-white">Cinematic Q&A placeholder</div>
                <div className="mt-2 text-sm leading-6 text-white/50">
                  Reserve this rail for featured questions, regional callouts, and the
                  globe-driven storytelling layer you want to add next.
                </div>
              </div>
            </GlassPanel>

            <GlassPanel className="p-4">
              <SectionEyebrow>Live Chat</SectionEyebrow>
              <div className="mt-4 space-y-3">
                {[
                  "Audience energy looks strong.",
                  "Preview ready for next speaker.",
                  "Waiting for next engagement module.",
                ].map((message, index) => (
                  <div
                    key={`chat-${index}`}
                    className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-white/65"
                  >
                    {message}
                  </div>
                ))}
              </div>
            </GlassPanel>

            <GlassPanel className="p-4">
              <SectionEyebrow>Program Roster</SectionEyebrow>
              <div className="mt-4 space-y-2">
                {liveNames.length > 0 ? (
                  liveNames.map((name) => (
                    <div
                      key={`live-${name}`}
                      className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/80"
                    >
                      {name}
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-3 py-4 text-sm text-white/40">
                    Nothing live yet.
                  </div>
                )}
              </div>
            </GlassPanel>
          </div>
        </div>

        <GlassPanel className="p-4 md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <SectionEyebrow>Participants / Inputs</SectionEyebrow>
              <div className="mt-2 text-sm text-white/60">
                Add people to Preview, choose the primary speaker, then take the look live.
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <MetricPill label="Remote feeds" value={String(stageCandidates.length)} />
              <MetricPill
                label="Screenshares"
                value={String(stageCandidates.filter((p) => p.screenTrack).length)}
                tone="sky"
              />
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {stageCandidates.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-white/10 bg-black/20 p-6 text-sm text-white/50">
                No remote participants publishing yet.
              </div>
            ) : (
              stageCandidates.map((participant) => {
                const onStage = stageIds.includes(participant.identity)
                const isPrimary = primaryId === participant.identity

                return (
                  <div
                    key={participant.identity}
                    className={cx(
                      "overflow-hidden rounded-[26px] border shadow-[0_16px_50px_rgba(0,0,0,0.28)]",
                      onStage
                        ? "border-emerald-400/25 bg-[linear-gradient(180deg,rgba(16,185,129,0.12),rgba(255,255,255,0.04))]"
                        : "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))]"
                    )}
                  >
                    <div className="border-b border-white/10 px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-white">
                            {participant.name}
                          </div>
                          <div className="truncate text-xs text-white/40">
                            {participant.identity}
                          </div>
                        </div>
                        <div className="flex flex-wrap justify-end gap-2 text-[11px]">
                          {participant.cameraTrack ? (
                            <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-white/70">
                              Cam
                            </span>
                          ) : null}
                          {participant.screenTrack ? (
                            <span className="rounded-full border border-sky-400/20 bg-sky-500/10 px-2 py-1 text-sky-100">
                              Screen Live
                            </span>
                          ) : null}
                          {isPrimary ? (
                            <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2 py-1 text-amber-100">
                              Primary
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="bg-black">
                      {participant.screenTrack ? (
                        <VideoTrack
                          trackRef={participant.screenTrack}
                          className="aspect-video w-full object-contain"
                        />
                      ) : participant.cameraTrack ? (
                        <VideoTrack
                          trackRef={participant.cameraTrack}
                          className="aspect-video w-full object-cover"
                        />
                      ) : (
                        <div className="flex aspect-video items-center justify-center bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.14),rgba(2,6,23,0.95))] text-xs text-white/40">
                          No preview available
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 px-4 py-4">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => toggleParticipant(participant.identity)}
                          className={cx(
                            "rounded-2xl px-3 py-2.5 text-sm font-medium transition",
                            onStage
                              ? "bg-red-500/90 text-white hover:bg-red-500"
                              : "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                          )}
                        >
                          {onStage ? "Remove from Preview" : "Add to Preview"}
                        </button>
                        <button
                          type="button"
                          onClick={() => makePrimary(participant.identity)}
                          disabled={!onStage}
                          className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white/85 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {isPrimary ? "Primary Locked" : "Make Primary"}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </GlassPanel>
      </div>
    </div>
  )
}

export default function ProducerRoomClient({
  token,
  serverUrl,
  stageEndpoint,
}: {
  token: string
  serverUrl: string
  stageEndpoint: string
}) {
  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect
      audio
      video
      className="contents"
    >
      <ProducerRoomInner stageEndpoint={stageEndpoint} />
    </LiveKitRoom>
  )
}
