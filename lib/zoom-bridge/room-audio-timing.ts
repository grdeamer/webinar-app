// Buffer the first chunk and recover after an underrun. Follow the existing
// playback timeline for every chunk that arrives while audio is still queued.
export function nextRoomAudioStart(scheduledUntil: number, currentTime: number) {
  return scheduledUntil > currentTime ? scheduledUntil : currentTime + 1.25
}
