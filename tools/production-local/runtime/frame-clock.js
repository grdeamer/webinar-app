/** Deadline clock never adds another idle frame after the work already missed a deadline. */
export function nextFrameDeadline(deadline, now, fps) {
  const next = deadline + 1000 / fps
  return next < now - 1000 / fps ? now : next
}
