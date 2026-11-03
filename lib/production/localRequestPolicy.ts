/** Intercept only denied requests. Allowed polling must not allocate a Playwright Route per request. */
export const BLOCKED_LOCAL_MEDIA_REQUEST = /^(?!https?:\/\/127\.0\.0\.1(?::\d+)?(?:\/|$)).+/i
