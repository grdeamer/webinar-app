export type ProgramAudioState = {
  is_live: boolean
  layout?: string
  stage_participant_ids?: string[]
  primary_participant_id?: string | null
  pinned_participant_id?: string | null
  screen_share_participant_id?: string | null
  program_blocks?: {
    type: string
    assignedParticipantId?: string | null
    hidden?: boolean
    opacity?: number
  }[]
}

export type ProgramAudioSelection = {
  microphones: Set<string>
  screenShares: Set<string>
}

// Use committed Program state only. Preview/local storage must never open a mic.
export function selectProgramAudio(state: ProgramAudioState | null): ProgramAudioSelection {
  const microphones = new Set<string>()
  const screenShares = new Set<string>()
  if (!state?.is_live) return { microphones, screenShares }

  const primary = state.primary_participant_id || state.pinned_participant_id
  if (state.program_blocks?.length) {
    for (const block of state.program_blocks) {
      if (!block || typeof block.type !== "string" || block.hidden || (typeof block.opacity === "number" && block.opacity <= 0)) continue
      const type = block.type.toLowerCase().replace(/[-_\s]+/g, "_")
      if (["camera", "camera_slot", "cam", "participant", "presenter", "speaker", "video_track"].includes(type)) {
        const identity = block.assignedParticipantId || primary
        if (identity) microphones.add(identity)
      }
      if (["screen", "screenshare", "screen_share", "share", "screen_track"].includes(type)) {
        const identity = block.assignedParticipantId || state.screen_share_participant_id
        if (identity) screenShares.add(identity)
      }
    }
  } else {
    // Legacy Program layouts have no composition blocks.
    if (state.layout === "grid") {
      for (const identity of state.stage_participant_ids ?? []) microphones.add(identity)
    } else if (primary) {
      microphones.add(primary)
    }
    if (state.layout === "screen_speaker" && state.screen_share_participant_id) {
      screenShares.add(state.screen_share_participant_id)
    }
  }
  return { microphones, screenShares }
}

export function programAudioAllows(
  selection: ProgramAudioSelection,
  identity: string,
  source: string
): boolean {
  if (source === "microphone") return selection.microphones.has(identity)
  if (source === "screen_share_audio") return selection.screenShares.has(identity)
  // Unlabelled tracks cannot be attributed to a Program audio source safely.
  return false
}
