"use client"

import { useEffect, useMemo } from "react"
import { AudioTrack, useTracks } from "@livekit/components-react"
import { RemoteTrackPublication, Track } from "livekit-client"
import { programAudioAllows, selectProgramAudio, type ProgramAudioState } from "@/lib/live/programAudio"

/** Audience playback/subscription control, not a shared-room permission boundary. */
export default function ProgramAudioRenderer({ state }: { state: ProgramAudioState | null }) {
  const tracks = useTracks([
    Track.Source.Microphone, Track.Source.ScreenShareAudio, Track.Source.Unknown,
    Track.Source.Camera, Track.Source.ScreenShare,
  ], { onlySubscribed: false })
  const selection = useMemo(() => selectProgramAudio(state), [state])
  const audible = tracks.filter(ref => !ref.participant.isLocal &&
    ref.publication.kind === Track.Kind.Audio &&
    programAudioAllows(selection, ref.participant.identity, ref.publication.source))

  useEffect(() => {
    for (const ref of tracks) {
      if (ref.participant.isLocal || !(ref.publication instanceof RemoteTrackPublication)) continue
      // Video keeps its existing rendering rules; audio is opt-in from Program.
      const subscribe = ref.publication.kind === Track.Kind.Video ||
        programAudioAllows(selection, ref.participant.identity, ref.publication.source)
      if (ref.publication.isDesired !== subscribe) ref.publication.setSubscribed(subscribe)
    }
  }, [tracks, selection])

  return <div hidden>{audible.map(ref => (
    <AudioTrack key={`${ref.participant.identity}:${ref.publication.trackSid}`} trackRef={ref} />
  ))}</div>
}
