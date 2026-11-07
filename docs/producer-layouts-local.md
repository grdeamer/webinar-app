# Producer layouts — local implementation

The **Choose layout** grid in the producer header provides:

- **Flight Deck**: balanced Preview/Program with a spacious lower Sources/Scenes dock.
- **Launchpad**: persistent library on the left and the switcher on the right.
- **Spotlight**: larger Program on the left, Preview on the right, TAKE pointing toward Program.

The existing Mission Control dashboard name is unchanged. People & devices opens the existing stage rail as a drawer. Source and scene tabs preserve their mounted controls; Mixer opens the existing audio drawer. All library assets are available in the grid rather than truncating the list at six. The source dock opens initially and remains collapsible/resizable. Small desktops fall back to a lower dock so the library cannot crowd the monitors out.

## Preference scope

The authenticated `/admin/events/[id]/producer/room` page supplies its verified operator UUID. The choice is stored under a versioned per-user localStorage key. It survives reloads in that browser, is separate for different users, and does not sync across devices. Invalid saved values fall back to Flight Deck. If identity or browser storage is unavailable, changing layout still works for that visit and the UI reports the persistence limitation. No database preference or production configuration was changed.

## Connection continuity

Layout state lives beneath the existing producer control hook. Switching changes CSS grid placement, dimensions and visibility only. It does not change the ProtectedLiveKitRoom key, recreate Program subscriptions, alter the source canvas, call TAKE, send mixer commands, or start/stop compute. Source publishers, Program video element and mixer controller keep their existing owners. Layout changes may cause normal canvas resize measurements, but do not submit a new composition.

## Local verification

- 406 isolated release app tests passed, including layout-name, preference-key isolation and bounded monitor-ratio checks.
- Development-only `/dev/producer-layouts` runs the actual preference provider, chooser and workspace shell against synthetic slots. Five repeated layout switches preserved the exact monitor DOM node and MediaStream object, fixture engine-session identity, mixer gain, selected source and Program intent. Metadata progress continued.
- Reload restored the selected layout; blocked localStorage writes fell back safely to visit-only selection. Desktop widths 1440, 1024 and 820 had no horizontal overflow.
- The browser test blocked external and engine/API requests and observed zero such requests. This verifies local UI continuity, not a live EC2/WebRTC media qualification. No paid workers, camera/microphone capture, recording, deployment or Git push.
- Scoped lint, TypeScript and local Next webpack build passed.

Open `http://127.0.0.1:3007/dev/producer-layouts` while the existing local development server is running. The route returns not-found outside development. Reproduce with `node scripts/verify-producer-layouts-local.mjs`; it requires installed Chrome, the repository's playwright-core package and that local dev URL. It creates a separate temporary browser and closes it afterward.
