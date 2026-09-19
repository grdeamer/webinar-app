window.POA_CONFIG = {
  /*
    Jupiter public runtime integration.
    The client also accepts agenda/current/next/announcement fields returned
    inside a top-level "data" or "runtime" object.
    Expected response shape:
      {
        "active_session": "kickoff",
        "button_text": "Enter live meeting",
        "button_url": "https://...",
        "sync_token": "..."
      }

    It polls every 10 seconds and keeps the last good state on an error.
  */
  STATE_ENDPOINT: "https://app.jupiter.events/api/public/events/caplyta-september-poa-meeting/runtime",
  DISTRICT_DIRECTORY_ENDPOINT: "https://app.jupiter.events/api/public/events/caplyta-september-poa-meeting/district-directory",

  EVENT_SLUG: "caplyta-september-poa-meeting",
  POLL_INTERVAL_MS: 10000,

  // Used for the live Eastern Time clock and automatic schedule fallback.
  TIME_ZONE: "America/New_York",

  // Fallback only; Jupiter's runtime agenda is the source of truth when available.
  EVENT_DATE: "2026-09-24",

  // Optional local speaker overrides, keyed by session key.
  // Example: kickoff: { name: "Name", role: "Title", bio: "Bio", photo_url: "https://..." }
  SPEAKER_PROFILES: {},

  FALLBACK_STATE: {
    active_session: null,
    button_text: "Enter live meeting",
    button_url: "https://letstrainonline.zoom.us/j/81667427994",
    status: "closed"
  }
};
