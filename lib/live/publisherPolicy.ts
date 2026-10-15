import { programAudioAllows, selectProgramAudio, type ProgramAudioState } from "./programAudio"

export type PublisherTrack = { sid: string; source: string; kind: "audio" | "video" }
export type PublisherSubscriber = { identity: string; canPublish: boolean }
export type PublisherTrackPermission = { participantIdentity: string; allowAll: boolean; allowedTrackSids: string[] }

export function publisherTrackPermissions(
  identity: string,
  tracks: PublisherTrack[],
  subscribers: PublisherSubscriber[],
  program: ProgramAudioState | null
): PublisherTrackPermission[] {
  const selection = selectProgramAudio(program)
  const programSids = tracks.filter(track => track.kind === "audio"
    ? programAudioAllows(selection, identity, track.source)
    : (track.source === "camera" && selection.microphones.has(identity)) ||
      (track.source === "screen_share" && selection.screenShares.has(identity))
  ).map(track => track.sid)

  return subscribers.filter(subscriber => subscriber.identity !== identity)
    .flatMap<PublisherTrackPermission>(subscriber => {
      // Publish permission is verified by the SFU, never by client-supplied role metadata.
      if (subscriber.canPublish) return [{ participantIdentity: subscriber.identity, allowAll: true, allowedTrackSids: [] }]
      return programSids.length ? [{ participantIdentity: subscriber.identity, allowAll: false, allowedTrackSids: programSids }] : []
    })
}
