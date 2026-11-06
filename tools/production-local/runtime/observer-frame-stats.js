/** Count only observed, checksum-validated markers. Never infer valid frames from RTC totals. */
export class ObserverFrameStats {
  constructor() {
    this.frames = 0; this.validFrames = 0; this.invalidFrames = 0; this.duplicateFrames = 0; this.slateFrames = 0; this.markerSkipped = 0; this.selectionMismatches = 0
    this.key = null; this.previous = null; this.selection = null
  }
  accept(authority, program, provenance, now) {
    this.frames++
    const candidate = authority?.frame === 1 ? 'primary' : authority?.frame === 2 ? 'standby' : null
    const contentCandidate = provenance?.revision === 1 ? 'primary' : provenance?.revision === 2 ? 'standby' : null
    if (!authority || !program || !provenance) this.invalidFrames++
    if (candidate && contentCandidate !== candidate) this.selectionMismatches++
    const nextKey = candidate && program ? `${authority.revision}:${program.revision}:${program.frame}` : null
    if (nextKey && nextKey !== this.key) {
      this.validFrames++; this.key = nextKey
      if (this.previous?.generation === authority.revision && this.previous.revision === program.revision && this.previous.candidate === candidate) {
        const delta = (program.frame - this.previous.frame + 65536) % 65536
        if (delta > 1 && delta < 32768) this.markerSkipped += delta - 1
      }
      this.previous = { generation: authority.revision, revision: program.revision, candidate, frame: program.frame }
    } else if (nextKey) this.duplicateFrames++
    else if (authority && program && !candidate) this.slateFrames++
    if (!this.selection || this.selection.generation !== (authority?.revision || 0) || this.selection.candidate !== candidate || this.selection.revision !== (program?.revision ?? null)) this.selection = { generation: authority?.revision || 0, candidate, revision: program?.revision ?? null, firstDecodedAtMs: now }
  }
  snapshot() {
    return { frames: this.frames, validFrames: this.validFrames, invalidFrames: this.invalidFrames, duplicateFrames: this.duplicateFrames, slateFrames: this.slateFrames, markerSkipped: this.markerSkipped, selectionMismatches: this.selectionMismatches, selection: this.selection }
  }
}
