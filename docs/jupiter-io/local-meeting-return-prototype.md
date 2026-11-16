# Local Zoom window return prototype

Implemented 16 November 2026 in the existing Io Multiview dialog, under
“Meeting returns · prototype”. The existing outgoing feed view is still available.

Production entry: `/admin/jupiter-io/returns` (existing administrator access required).
No meeting links or media are committed or persisted.

## Try two rooms

1. Open Io in a supported desktop browser on HTTPS or localhost.
2. Open two Zoom meetings/windows on the same computer, using Zoom's permitted
   concurrent-meeting setup or independently opened meeting clients.
3. Open Multiview → Meeting returns. Give each tile a room name and Zoom join
   link or meeting ID; choose Set link. Links are session-only, not persisted.
4. On each tile, choose Select Zoom window and select the matching meeting in
   the browser picker. The application cannot verify that the selected window
   belongs to the entered meeting. Check each picture before relying on it.
5. Click either picture to open its saved HTTPS Zoom join link. Zoom/browser
   admission and app-launch prompts still apply. Monitoring does not stop merely
   because this tab loses focus.
6. Listen to at most one tile, if the selected capture includes audio. Window
   audio support varies by OS/browser; no audio track is labelled explicitly.
7. Stop each tile, close the dialog, or switch to outgoing feeds to release
   capture tracks. Closing while the picker is pending retires a late result.

No sender worker, API call, media upload, recording, EC2 start or meeting join is
performed by attaching a local window. This does not supply unattended remote
meeting receivers. It requires both meetings/windows on the operator's computer.
Minimized/hidden windows may freeze; capture availability and actual Zoom launch
remain to be verified interactively with real meetings.

## Validation

TypeScript, scoped ESLint, meeting-link validation and existing multiview tests
pass. These checks do not establish live capture, audio support, concurrency,
Zoom app launch or unattended capacity. No paid/live test has been executed.
