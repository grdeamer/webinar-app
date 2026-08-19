export function buildDistrictAccessEmail({
  code,
  eventTitle,
}: {
  code: string
  eventTitle: string
}) {
  const subject = `Your district room access code — ${eventTitle}`
  const text = [
    "Your district room is ready.",
    "",
    `Use this one-time code on the ${eventTitle} attendee page: ${code}`,
    "",
    "The code expires in 10 minutes. For your security, do not forward it.",
    "",
    "Jupiter Events",
  ].join("\n")

  const html = `
    <!doctype html>
    <html lang="en">
      <body style="margin:0;background:#eef3fb;font-family:Arial,sans-serif;color:#121c2f">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef3fb;padding:28px 12px">
          <tr><td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #dbe3ef;border-radius:24px;overflow:hidden">
              <tr><td style="padding:26px 32px;background:#071120;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:4px">JUPITER</td></tr>
              <tr><td style="padding:38px 32px">
                <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#60728f">District breakout access</div>
                <h1 style="margin:12px 0 14px;font-size:32px;line-height:1.12">Your room is ready.</h1>
                <p style="margin:0 0 26px;color:#526078;font-size:16px;line-height:1.55">Enter this one-time code on the ${escapeHtml(eventTitle)} attendee page. Jupiter will reveal only the district room assigned to your email address.</p>
                <div style="padding:22px;border-radius:16px;background:#eef4ff;border:1px solid #cad9f6;text-align:center;font-size:34px;font-weight:700;letter-spacing:10px;color:#15315d">${code}</div>
                <p style="margin:24px 0 0;color:#718099;font-size:13px;line-height:1.5">This code expires in 10 minutes. For your security, do not forward it.</p>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </body>
    </html>`

  return { subject, text, html }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

