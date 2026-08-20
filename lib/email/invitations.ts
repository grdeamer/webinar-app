export type JupiterInviteRole = "administrator" | "event_admin" | "producer" | "viewer"

type JupiterInviteEmailOptions = {
  inviteUrl: string
  logoUrl: string
  name?: string | null
  role: JupiterInviteRole
  eventTitle?: string | null
  existingAccount?: boolean
}

const roleLabels: Record<JupiterInviteRole, string> = {
  administrator: "Administrator",
  event_admin: "Event Admin",
  producer: "Producer",
  viewer: "Viewer",
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    "\"": "&quot;",
  })[character] ?? character)
}

function firstName(value?: string | null) {
  return String(value || "").trim().split(/\s+/)[0] || "there"
}

export function buildJupiterInviteEmail(options: JupiterInviteEmailOptions) {
  const isAdministrator = options.role === "administrator"
  const roleLabel = roleLabels[options.role]
  const eventTitle = String(options.eventTitle || "").trim()
  const safeName = escapeHtml(firstName(options.name))
  const safeRole = escapeHtml(roleLabel)
  const safeEventTitle = escapeHtml(eventTitle)
  const safeInviteUrl = escapeHtml(options.inviteUrl)
  const safeLogoUrl = escapeHtml(options.logoUrl)

  const subject = isAdministrator
    ? "Your Jupiter admin access is ready"
    : `You’re invited to ${eventTitle || "a Jupiter event"}`
  const preview = isAdministrator
    ? "Your seat at Mission Control is ready."
    : `Join the team managing ${eventTitle || "this event"} in Jupiter.`
  const heading = isAdministrator
    ? "You’re cleared for Mission Control."
    : "You’re on the event team."
  const introduction = isAdministrator
    ? "You now have administrator access to Jupiter—the workspace for shaping events from the first agenda item through the final live cue."
    : `You’ve been invited to help manage <strong style="color:#111b32;font-weight:700;">${safeEventTitle || "a Jupiter event"}</strong> as <strong style="color:#111b32;font-weight:700;">${safeRole}</strong>.`
  const capabilities = isAdministrator
    ? [
        "Build programs and manage event teams",
        "Shape and publish attendee experiences",
        "Operate live events from Mission Control",
      ]
    : options.role === "viewer"
      ? ["Review event details and the program", "Stay aligned with the production team", "Follow the event from one shared workspace"]
      : ["Manage the event program and people", "Prepare the attendee experience", "Help move the event from setup to showtime"]
  const actionLabel = options.existingAccount
    ? isAdministrator ? "Open secure access" : "Open event"
    : "Accept invitation"
  const footerNote = options.existingAccount
    ? isAdministrator
      ? "Use this secure link to confirm your Jupiter access or choose a new password."
      : "Sign in with this email address to open the event."
    : "Use this secure invitation to activate your account and choose a password."

  const capabilityRows = capabilities.map((capability) => `
    <tr>
      <td width="22" valign="top" style="padding:0 0 13px 0;color:#67e8f9;font-size:15px;line-height:22px;">—</td>
      <td valign="top" style="padding:0 0 13px 0;color:#38465f;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;">${escapeHtml(capability)}</td>
    </tr>`).join("")

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>${escapeHtml(subject)}</title>
    <style>
      @media only screen and (max-width: 620px) {
        .shell { width: 100% !important; }
        .pad { padding-left: 24px !important; padding-right: 24px !important; }
        .headline { font-size: 34px !important; line-height: 38px !important; }
        .brand-logo { width: 100% !important; max-width: 100% !important; height: auto !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#e9edf4;color:#111b32;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preview)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#e9edf4;">
      <tr>
        <td align="center" style="padding:30px 12px;">
          <table role="presentation" class="shell" width="600" cellspacing="0" cellpadding="0" border="0" style="width:600px;max-width:600px;border:1px solid #c9d3e4;border-radius:22px;background:#f3f6fb;overflow:hidden;">
            <tr>
              <td align="center" style="padding:0;background:#f3f6fb;border-bottom:1px solid #c9d3e4;text-align:center;">
                <img class="brand-logo" src="${safeLogoUrl}" width="600" alt="Jupiter" style="display:block;width:100%;max-width:600px;height:auto;margin:0 auto;border:0;outline:none;text-decoration:none;">
              </td>
            </tr>
            <tr>
              <td class="pad" style="padding:42px 42px 18px;background:#f3f6fb;">
                <div style="margin:0 0 18px;color:#0f6676;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:2.4px;line-height:16px;text-transform:uppercase;">Jupiter · Mission Control</div>
                <h1 class="headline" style="margin:0;color:#111b32;font-family:Arial,Helvetica,sans-serif;font-size:42px;font-weight:700;letter-spacing:-1.5px;line-height:46px;">${heading}</h1>
                <p style="margin:22px 0 0;color:#526078;font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:28px;">Hi ${safeName},</p>
                <p style="margin:10px 0 0;color:#526078;font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:28px;">${introduction}</p>
              </td>
            </tr>
            <tr>
              <td class="pad" style="padding:16px 42px 8px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-top:1px solid #cbd5e5;border-bottom:1px solid #cbd5e5;">
                  <tr>
                    <td style="padding:24px 0 13px;color:#65748e;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:2px;line-height:16px;text-transform:uppercase;">What you can do now</td>
                  </tr>
                  <tr>
                    <td style="padding:0 0 12px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${capabilityRows}</table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td class="pad" style="padding:28px 42px 42px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td align="center" bgcolor="#245fe5" style="border-radius:12px;background:#245fe5;box-shadow:0 8px 20px rgba(36,95,229,.22);">
                      <a href="${safeInviteUrl}" style="display:inline-block;padding:15px 24px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;line-height:20px;text-decoration:none;">${actionLabel}</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:20px 0 0;color:#65748e;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:21px;">${footerNote}</p>
                <p style="margin:12px 0 0;color:#7b879d;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:19px;word-break:break-all;">Button not working? <a href="${safeInviteUrl}" style="color:#526078;text-decoration:underline;">Open the secure invitation</a>.</p>
              </td>
            </tr>
            <tr>
              <td class="pad" style="padding:22px 42px 28px;border-top:1px solid #24304a;background:#050b18;color:#93a1ba;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:20px;">
                Jupiter.events&nbsp;&nbsp;·&nbsp;&nbsp;Events with gravity.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

  const text = [
    heading,
    "",
    `Hi ${firstName(options.name)},`,
    "",
    isAdministrator
      ? "You now have administrator access to Jupiter—the workspace for shaping events from the first agenda item through the final live cue."
      : `You’ve been invited to help manage ${eventTitle || "a Jupiter event"} as ${roleLabel}.`,
    "",
    "What you can do now:",
    ...capabilities.map((capability) => `- ${capability}`),
    "",
    `${actionLabel}: ${options.inviteUrl}`,
    "",
    footerNote,
    "",
    "Jupiter.events · Events with gravity.",
  ].join("\n")

  return { subject, html, text }
}
