export const JUPITER_EMAIL_BRAND_LINE = "Jupiter — Events with Gravity"
export const JUPITER_EMAIL_COMPANY_LINE = "A product of August Black, Inc."
export const JUPITER_EMAIL_URL = "https://jupiter.events"

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

export function buildJupiterEmailFooterHtml(context?: string) {
  const contextHtml = context
    ? `<p style="margin:0 0 16px;color:#93a1ba;font-size:12px;line-height:20px;">${escapeHtml(context)}</p>`
    : ""

  return `${contextHtml}<div style="color:#ffffff;font-size:13px;font-weight:700;line-height:21px;">${JUPITER_EMAIL_BRAND_LINE}</div>
    <div style="margin-top:2px;color:#93a1ba;font-size:12px;line-height:20px;">${JUPITER_EMAIL_COMPANY_LINE}</div>
    <a href="${JUPITER_EMAIL_URL}" style="display:inline-block;margin-top:7px;color:#b8c7e3;font-size:12px;line-height:20px;text-decoration:underline;">jupiter.events</a>`
}

export function buildJupiterEmailFooterText(context?: string) {
  return [
    ...(context ? [context, ""] : []),
    JUPITER_EMAIL_BRAND_LINE,
    JUPITER_EMAIL_COMPANY_LINE,
    JUPITER_EMAIL_URL,
  ]
}
