type PreparedMedia = Pick<HTMLMediaElement, 'ended' | 'paused' | 'loop' | 'play'>

/** TAKE selects the already-decoded playhead. Re-cue explicitly to replay a finished file. */
export async function takePreparedMedia(items: readonly { element: PreparedMedia; loop: boolean }[]) {
  // Validate the complete canvas before altering any input.
  if (items.some(({ element }) => element.ended)) throw new Error('A file has finished. Cue the canvas again before replaying.')
  await Promise.all(items.map(async ({ element, loop }) => {
    element.loop = loop
    // Playing prepared media needs neither a seek nor another play() handshake.
    if (element.paused) await element.play()
  }))
}
