import type { CSSProperties, ReactNode } from "react"
import ActivityTracker from "@/components/ActivityTracker"
import FeaturedQuestionOverlay from "@/components/FeaturedQuestionOverlay"
import GeneralSessionKickGuard from "@/components/GeneralSessionKickGuard"
import GeneralSessionQA from "@/components/GeneralSessionQA"
import GeneralSessionQAModeration from "@/components/GeneralSessionQAModeration"
import PresenterQAPanel from "@/components/PresenterQAPanel"
import SpeakerConfidenceMonitor from "@/components/SpeakerConfidenceMonitor"
import GeneralSessionStateWatcher from "@/components/live/GeneralSessionStateWatcher"
import OnAirCorner from "@/app/general-session/OnAirCorner"
import ProgramStageRenderer from "@/app/general-session/ProgramStageRenderer"

type ControlState = "holding" | "live" | "paused" | "ended"

type ProgramStateLike = {
  is_live?: boolean | null
  layout?: "solo" | "grid" | "screen_speaker" | null
  stage_participant_ids?: string[] | null
  primary_participant_id?: string | null
  pinned_participant_id?: string | null
} | null

type ProgramDbLike = {
  lower_third_active?: boolean | null
  lower_third_name?: string | null
  lower_third_title?: string | null
}

type LowerPanelLike = {
  kind?: "pdf" | "image" | null
  name?: string | null
  path?: string | null
} | null

export default function GeneralSessionExperience({
  roomKey,
  eventSlug,
  title,
  themeStyle,
  panelStyle,
  headerBandStyle,
  logoJustify,
  clientLogoSignedUrl,
  programState,
  derivedControlState,
  programDb,
  lowerPanel,
  lowerPanelSignedUrl,
  materialsHeight,
  programLayoutLabel,
  programParticipantCount,
  isAdmin,
  isPresenter,
  topNotice,
}: {
  roomKey: string
  eventSlug: string
  title: string
  themeStyle: CSSProperties
  panelStyle: CSSProperties
  headerBandStyle: CSSProperties
  logoJustify: string
  clientLogoSignedUrl: string | null
  programState: ProgramStateLike
  derivedControlState: ControlState
  programDb: ProgramDbLike
  lowerPanel: LowerPanelLike
  lowerPanelSignedUrl: string | null
  materialsHeight: number
  programLayoutLabel: string
  programParticipantCount: number
  isAdmin: boolean
  isPresenter: boolean
  topNotice?: ReactNode
}) {
  return (
    <main className="min-h-screen p-4 md:p-6" style={themeStyle}>
      <ActivityTracker roomKey={roomKey} />
      <GeneralSessionStateWatcher eventSlug={eventSlug} />

      <OnAirCorner roomKey={roomKey} initialState={derivedControlState} />
      <GeneralSessionKickGuard roomKey={roomKey} />

      <div className="mx-auto w-full max-w-screen-2xl">
        <div
          className="overflow-hidden rounded-3xl border border-white/10 shadow-[0_24px_70px_rgba(0,0,0,0.30)] ring-1 ring-white/5 backdrop-blur-[2px]"
          style={panelStyle}
        >
          <div
            className="border-b border-black/10 px-5 py-4 md:px-8 md:py-5"
            style={headerBandStyle}
          >
            <div className={`flex min-h-[64px] w-full items-center ${logoJustify}`}>
              {clientLogoSignedUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={clientLogoSignedUrl}
                  alt="Client logo"
                  className="max-h-16 w-auto max-w-full object-contain"
                />
              ) : (
                <div className="text-sm text-slate-400">
                  {isAdmin || isPresenter ? "No client logo selected" : ""}
                </div>
              )}
            </div>
          </div>

          <div className="border-b border-white/10 bg-black/10 px-5 py-4 md:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{title || "General Session"}</h1>
                <p className="mt-1 text-sm text-white/60">
                  Program output now follows Producer Room state.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-xs ${
                    programState?.is_live
                      ? "border-red-400/30 bg-red-500/10 text-red-200"
                      : "border-white/10 bg-white/5 text-white/60"
                  }`}
                >
                  {programState?.is_live ? "Program Live" : "Program Holding"}
                </span>

                {isAdmin || isPresenter ? (
                  <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
                    Host mode
                  </span>
                ) : (
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                    Attendee mode
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="p-5 md:p-8">
            {topNotice ? <div className="mb-4">{topNotice}</div> : null}

            <div className="grid gap-4 xl:grid-cols-12">
              <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] xl:col-span-9">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Live Broadcast</h2>
                    <p className="mt-1 text-sm text-white/55">
                      Audience-facing program output from the Producer Room.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/60">
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                      Layout: {programLayoutLabel}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                      On stage: {programParticipantCount}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                      Primary: {programState?.primary_participant_id || "none"}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                      Pinned: {programState?.pinned_participant_id || "none"}
                    </span>
                  </div>
                </div>

                {programState ? (
                  <div className="mt-3 rounded-2xl border border-sky-400/20 bg-sky-500/10 p-3 text-sm text-sky-100">
                    Program State connected. General Session is now reading the Producer Room
                    output model.
                  </div>
                ) : null}

                <div className="relative mt-4">
                  <ProgramStageRenderer />

                  <div className="pointer-events-none absolute inset-0 z-20">
                    <FeaturedQuestionOverlay roomKey={roomKey} />
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] xl:col-span-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Q&amp;A</h2>
                  {isAdmin || isPresenter ? (
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                      Moderation enabled
                    </span>
                  ) : null}
                </div>

                <div className="mt-3">
                  {isAdmin || isPresenter ? (
                    <GeneralSessionQAModeration />
                  ) : (
                    <GeneralSessionQA />
                  )}
                </div>
              </section>

              {isPresenter ? (
                <section className="rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-4 xl:col-span-12">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold">Presenter Monitor</h2>
                      <p className="mt-1 text-sm text-white/70">
                        Private Q&amp;A confidence monitor for the presenter.
                      </p>
                    </div>
                    <span className="rounded-full border border-yellow-300/30 bg-black/20 px-3 py-1 text-xs text-yellow-100">
                      Presenter only
                    </span>
                  </div>

                  <div className="mt-4">
                    <SpeakerConfidenceMonitor
                      roomKey={roomKey}
                      sessionTitle={title || "General Session"}
                      controlState={derivedControlState}
                      lowerThirdActive={Boolean(programDb.lower_third_active)}
                      lowerThirdName={programDb.lower_third_name || null}
                      lowerThirdTitle={programDb.lower_third_title || null}
                    />
                  </div>

                  <div className="mt-4">
                    <PresenterQAPanel roomKey={roomKey} />
                  </div>
                </section>
              ) : null}

              <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] xl:col-span-12">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">Materials</h2>
                    <p className="mt-1 text-xs text-white/60">
                      Optional PDF/PNG shown under the player.
                    </p>
                  </div>

                  {lowerPanel?.path ? (
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                      {lowerPanel.kind === "pdf" ? "PDF" : "Image"}:{" "}
                      {lowerPanel.name || "Untitled"}
                    </span>
                  ) : (
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                      None uploaded
                    </span>
                  )}
                </div>

                <div
                  className="mt-3 overflow-auto rounded-2xl border border-white/10 bg-black/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                  style={{ height: materialsHeight }}
                >
                  {lowerPanelSignedUrl ? (
                    lowerPanel?.kind === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={lowerPanelSignedUrl}
                        alt={lowerPanel.name || "Materials"}
                        className="h-auto w-full"
                      />
                    ) : (
                      <iframe
                        src={lowerPanelSignedUrl}
                        className="h-full w-full bg-white"
                        title={lowerPanel?.name || "Materials"}
                      />
                    )
                  ) : (
                    <div className="p-6 text-sm text-white/60">
                      Upload a PDF or image in the admin control room.
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}