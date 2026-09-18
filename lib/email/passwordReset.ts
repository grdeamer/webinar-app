import {
  buildJupiterEmailFooterHtml,
  buildJupiterEmailFooterText,
} from "./branding.ts"

type JupiterPasswordResetEmailOptions = {
  resetUrl: string
  logoUrl: string
  name?: string | null
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

export function buildJupiterPasswordResetEmail(options: JupiterPasswordResetEmailOptions) {
  const subject = "Reset your Jupiter password"
  const preview = "A secure password reset was requested for your Jupiter account."
  const safeName = escapeHtml(firstName(options.name))
  const safeResetUrl = escapeHtml(options.resetUrl)
  const safeLogoUrl = escapeHtml(options.logoUrl)

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>${subject}</title>
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
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preview}</div>
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
                <div style="margin:0 0 18px;color:#0f6676;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:2.4px;line-height:16px;text-transform:uppercase;">Jupiter · Secure access</div>
                <h1 class="headline" style="margin:0;color:#111b32;font-family:Arial,Helvetica,sans-serif;font-size:42px;font-weight:700;letter-spacing:-1.5px;line-height:46px;">Reset your password.</h1>
                <p style="margin:22px 0 0;color:#526078;font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:28px;">Hi ${safeName},</p>
                <p style="margin:10px 0 0;color:#526078;font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:28px;">We received a request to choose a new password for your Jupiter account. Use the secure link below to continue.</p>
              </td>
            </tr>
            <tr>
              <td class="pad" style="padding:18px 42px 42px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td align="center" bgcolor="#245fe5" style="border-radius:12px;background:#245fe5;box-shadow:0 8px 20px rgba(36,95,229,.22);">
                      <a href="${safeResetUrl}" style="display:inline-block;padding:15px 25px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;line-height:20px;text-decoration:none;">Choose a new password</a>
                    </td>
                  </tr>
                </table>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:28px;width:100%;border-top:1px solid #cbd5e5;">
                  <tr><td style="padding:22px 0 0;color:#526078;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:21px;"><strong style="color:#111b32;">Didn’t request this?</strong><br>You can safely ignore this email. Your current password will remain unchanged.</td></tr>
                </table>
                <p style="margin:18px 0 0;color:#7b879d;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:19px;word-break:break-all;">Button not working? <a href="${safeResetUrl}" style="color:#526078;text-decoration:underline;">Open the secure password reset</a>.</p>
              </td>
            </tr>
            <tr>
              <td class="pad" style="padding:22px 42px 28px;border-top:1px solid #24304a;background:#050b18;color:#93a1ba;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:20px;">
                ${buildJupiterEmailFooterHtml("This security message was sent because a password reset was requested for your account.")}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

  const text = [
    "Reset your password.",
    "",
    `Hi ${firstName(options.name)},`,
    "",
    "We received a request to choose a new password for your Jupiter account.",
    `Choose a new password: ${options.resetUrl}`,
    "",
    "If you did not request this, you can safely ignore this email. Your current password will remain unchanged.",
    "",
    ...buildJupiterEmailFooterText("This security message was sent because a password reset was requested for your account."),
  ].join("\n")

  return { subject, html, text }
}
