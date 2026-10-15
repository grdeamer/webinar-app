# Program audio playback

Audience players use `ProgramAudioRenderer` with automatic LiveKit subscriptions
disabled. The renderer subscribes to and mounts only audio selected from committed
Program state. Preview state and browser-local Program messages do not open mics.

- Camera blocks select their assigned participant's microphone.
- Screen blocks select screen-share audio, independently of microphones.
- Hidden/transparent blocks, unknown audio sources, missing state, and Off Air
  select no audio. Legacy session layouts select their Program speakers.
- Producers retain backstage monitoring through their existing room renderer.
- This does not add audio playback for uploaded video files.

## Remaining privacy boundary

This is a playback and subscription fix in Jupiter's audience clients, not an SFU
authorization boundary. Audience tokens still allow subscription in the same
LiveKit room as publishers. A modified client could request other tracks.
Transport isolation remains open: use a separate audience Program room/feed or
publisher-enforced track permissions covering every publisher and join path.
Do not describe this change as private backstage transport.

Stage changes follow existing state polling; this is not sample-accurate mixing.
A live two-device test must still verify speaker changes, screen audio, backstage
conversation, and Off Air before release. Automated tests cover selection,
playback elements, and subscription changes with SDK test doubles.
