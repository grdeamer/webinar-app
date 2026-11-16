/** Only ordinary Zoom join links; never arbitrary navigation or host/start tokens. */
export function meetingJoinLink(value: string): string {
  const input = value.trim()
  if (/^[\d\s-]+$/.test(input)) {
    const id = input.replace(/[\s-]/g, "")
    if (/^\d{9,11}$/.test(id)) return `https://zoom.us/j/${id}`
  }
  let url: URL
  try { url = new URL(input) } catch { throw new Error("Enter a Zoom join link or a 9–11 digit meeting ID.") }
  if (url.protocol !== "https:" || url.username || url.password || url.port ||
      !(url.hostname === "zoom.us" || url.hostname.endsWith(".zoom.us")) ||
      !/^\/j\/\d{9,11}\/?$/.test(url.pathname)) {
    throw new Error("Use an HTTPS Zoom meeting join link (zoom.us/j/…).")
  }
  const clean = new URL(url.pathname, url.origin)
  const passcode = url.searchParams.get("pwd")
  if (passcode) clean.searchParams.set("pwd", passcode)
  return clean.href
}
