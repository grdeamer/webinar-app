# First meeting: local Zoom window return

Entry: `/admin/jupiter-io/returns` → **This Mac · Zoom window** (default).
This mode does not start a worker, join Zoom, acquire microphone/camera media,
upload media, or use the RTMS service. It displays a window already joined in
Zoom on the same Mac. Only the first meeting tile is enabled for this pilot.

1. Join a test meeting in the Zoom desktop app. Keep its camera and microphone
   off. Have another participant provide test video and share a presentation.
2. Arrange Zoom's participant panel beside the shared presentation.
3. Add the meeting's name and join link to the first Jupiter tile.
4. Select **Select Zoom window**. Choose that meeting's window in the browser's
   picker. macOS may require Screen & System Audio Recording permission for the
   browser; the application cannot grant that permission itself.
5. Check that the selected picture matches the meeting. The link is a launch
   convenience, not proof of the window's identity. **Expand** keeps the first
   tile mounted; selecting another source stops its current capture.
6. **Stop capture**, removal, refresh, closing the view, or leaving the meeting's
   page stops all acquired tracks. Stop also retires a pending picker result.

Audio is requested off, unexpected audio tracks are removed, and playback is
muted. Capture permissions are separate from Zoom camera/microphone settings;
Jupiter cannot change those Zoom settings through display capture. Captured
media stays in the current browser; viewing it from another computer requires
a separate, future sender/receiver transport. Minimized windows may freeze.

Validation: TypeScript and scoped ESLint checks pass. Production build and live
capture results must be recorded after deployment. Real capture must be selected
interactively; placeholders and static screenshots do not qualify live media.
