import { buildJupiterEmailFooterHtml, buildJupiterEmailFooterText } from "./branding.ts"
function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c)
}
type EmailOptions = { subject: string; preview: string; logoUrl: string; heading: string; introduction: string; body: string; actionUrl: string; actionLabel: string; detailHtml: string; detailText: string }
function buildEmail(options: EmailOptions) {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>${escapeHtml(options.subject)}</title>
    <style>
      @media only screen and (max-width:620px) {
        .shell { width:100% !important; }
        .pad { padding-left:24px !important; padding-right:24px !important; }
        .headline { font-size:34px !important; line-height:39px !important; }
        .brand-logo { width:100% !important; max-width:100% !important; height:auto !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#e9edf4;color:#111b32;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(options.preview)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#e9edf4;">
      <tr>
        <td align="center" style="padding:30px 12px;">
          <table role="presentation" class="shell" width="600" cellspacing="0" cellpadding="0" border="0" style="width:600px;max-width:600px;border:1px solid #c9d3e4;border-radius:22px;background:#f3f6fb;overflow:hidden;">
            <tr>
              <td align="center" style="padding:0;background:#f3f6fb;border-bottom:1px solid #c9d3e4;text-align:center;">
                <img class="brand-logo" src="${escapeHtml(options.logoUrl)}" width="600" alt="Jupiter" style="display:block;width:100%;max-width:600px;height:auto;margin:0 auto;border:0;outline:none;text-decoration:none;">
              </td>
            </tr>
            <tr>
              <td class="pad" style="padding:42px 42px 18px;background:#f3f6fb;">
                <div style="margin:0 0 18px;color:#0f6676;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:2.4px;line-height:16px;text-transform:uppercase;">Jupiter · Secure access</div>
                <h1 class="headline" style="margin:0;color:#111b32;font-family:Arial,Helvetica,sans-serif;font-size:42px;font-weight:700;letter-spacing:-1.5px;line-height:46px;">${escapeHtml(options.heading)}</h1>
                <p style="margin:22px 0 0;color:#526078;font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:28px;">${escapeHtml(options.introduction)}</p>
                <p style="margin:10px 0 0;color:#526078;font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:28px;">${escapeHtml(options.body)}</p>
              </td>
            </tr>
            <tr>
              <td class="pad" style="padding:18px 42px 42px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td align="center" bgcolor="#245fe5" style="border-radius:12px;background:#245fe5;box-shadow:0 8px 20px rgba(36,95,229,.22);">
                      <a href="${escapeHtml(options.actionUrl)}" style="display:inline-block;padding:15px 25px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;line-height:20px;text-decoration:none;">${escapeHtml(options.actionLabel)}</a>
                    </td>
                  </tr>
                </table>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:28px;width:100%;border-top:1px solid #cbd5e5;">
                  <tr><td style="padding:22px 0 0;color:#526078;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:21px;">${options.detailHtml}</td></tr>
                </table>
                <p style="margin:18px 0 0;color:#7b879d;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:19px;word-break:break-all;">Button not working? <a href="${escapeHtml(options.actionUrl)}" style="color:#526078;text-decoration:underline;">${escapeHtml(options.actionLabel)}</a>.</p>
              </td>
            </tr>
            <tr>
              <td class="pad" style="padding:22px 42px 28px;border-top:1px solid #24304a;background:#050b18;color:#93a1ba;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:20px;">
                ${buildJupiterEmailFooterHtml()}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
  return { subject: options.subject, html, text: [options.heading, "", options.introduction, options.body, "", `${options.actionLabel}: ${options.actionUrl}`, "", options.detailText, "", ...buildJupiterEmailFooterText()].join("\n") }
}
export function buildVerificationEmail(input: { code: string; url: string; logoUrl: string; registering: boolean; eventTitle?: string }) {
  return buildEmail({ subject: input.eventTitle ? `Verify your email: ${input.eventTitle}` : "Verify your email for Jupiter", preview: "Verify and continue, or enter the code on your open Jupiter page.", logoUrl: input.logoUrl, heading: "You’re one step away.", introduction: input.eventTitle ? `Confirm your email to ${input.registering ? "complete your registration for" : "access"} ${input.eventTitle}.` : input.registering ? "Confirm your email to complete your registration." : "Confirm your email to access your events.", body: "Use the button below to continue securely. This link and the fallback code expire in 10 minutes and can only be used once.", actionUrl: input.url, actionLabel: "Verify and continue", detailHtml: `Prefer a code? Enter this on your open Jupiter page:<div style="margin:16px 0;color:#111b32;font-size:32px;font-weight:700;letter-spacing:8px;">${escapeHtml(input.code)}</div>If you didn’t request this email, you can ignore it.`, detailText: `Fallback verification code: ${input.code}. If you did not request this, ignore this email.` })
}
export function buildRegistrationReceiptEmail(input: { title: string; status: string; url: string; logoUrl: string }) {
  const active = ["registered", "approved", "checked_in"].includes(input.status)
  const status = input.status === "pending_approval" ? "awaiting organizer approval" : input.status === "waitlisted" ? "on the waitlist; a seat is not confirmed" : ["declined", "cancelled"].includes(input.status) ? input.status : "confirmed"
  return buildEmail({ subject: `Registration ${status}: ${input.title}`, preview: `Your registration for ${input.title} is ${status}.`, logoUrl: input.logoUrl, heading: active ? "Your place is confirmed." : "Your registration update.", introduction: input.title, body: `Your registration is ${status}.`, actionUrl: input.url, actionLabel: active ? "Open your event" : "View event", detailHtml: "If you need to change or cancel your registration, contact the organizer.", detailText: "If you need to change or cancel your registration, contact the organizer." })
}
