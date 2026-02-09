const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const shell = ({ title, body, preheader = "" }) => `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;background:#0b1220;color:#e2e8f0;font-family:Inter,Segoe UI,Roboto,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      ${escapeHtml(preheader)}
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px;background:#0b1220;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:linear-gradient(145deg,#111b31,#0d1630);border:1px solid rgba(148,163,184,.25);border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:26px 28px 10px 28px;">
                <div style="font-size:12px;letter-spacing:1.6px;text-transform:uppercase;color:#93c5fd;font-weight:700;">EvoData</div>
                <h1 style="margin:10px 0 0 0;font-size:28px;line-height:1.2;color:#f8fafc;">${escapeHtml(title)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 28px 28px;">
                ${body}
                <hr style="border:none;border-top:1px solid rgba(148,163,184,.22);margin:22px 0;" />
                <p style="margin:0;color:#94a3b8;font-size:13px;">
                  EvoData • student-built dashboard for Evolution tracking
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

export const buildWelcomeEmail = ({ email, firstName, coffeeUrl }) => {
  const safeName = escapeHtml(firstName || "there");
  const safeEmail = escapeHtml(email);
  const safeCoffeeUrl = escapeHtml(coffeeUrl || "https://buymeacoffee.com/evuul");
  const body = `
    <p style="margin:0 0 14px 0;color:#cbd5e1;font-size:16px;">Hi ${safeName}, welcome aboard.</p>
    <p style="margin:0 0 14px 0;color:#cbd5e1;font-size:15px;line-height:1.65;">
      Your account is ready with <strong>${safeEmail}</strong>. You now have access to live players, trend analysis,
      forecast modules, and portfolio tracking in one place.
    </p>
    <p style="margin:0 0 16px 0;color:#cbd5e1;font-size:15px;line-height:1.65;">
      If EvoData helps you, supporting server costs keeps everything fast and free.
    </p>
    <p style="margin:0 0 18px 0;">
      <a href="${safeCoffeeUrl}" target="_blank" rel="noopener"
         style="display:inline-block;padding:11px 16px;border-radius:10px;background:linear-gradient(135deg,#f59e0b,#fbbf24);color:#111827;text-decoration:none;font-weight:800;">
         Support EvoData
      </a>
    </p>
    <p style="margin:0;color:#94a3b8;font-size:14px;">/ Alexander</p>
  `;
  return {
    subject: "Welcome to EvoData",
    html: shell({
      title: "Welcome to EvoData",
      preheader: "Your EvoData account is ready.",
      body,
    }),
  };
};

export const buildResetPasswordEmail = ({ email, resetUrl }) => {
  const safeEmail = escapeHtml(email);
  const safeResetUrl = escapeHtml(resetUrl);
  const body = `
    <p style="margin:0 0 14px 0;color:#cbd5e1;font-size:15px;line-height:1.65;">
      A password reset was requested for <strong>${safeEmail}</strong>.
    </p>
    <p style="margin:0 0 16px 0;color:#cbd5e1;font-size:15px;line-height:1.65;">
      If this was you, use the button below. The link expires in 30 minutes.
    </p>
    <p style="margin:0 0 16px 0;">
      <a href="${safeResetUrl}" target="_blank" rel="noopener"
         style="display:inline-block;padding:11px 16px;border-radius:10px;background:linear-gradient(135deg,#22d3ee,#3b82f6);color:#0b1220;text-decoration:none;font-weight:800;">
         Reset password
      </a>
    </p>
    <p style="margin:0 0 8px 0;color:#94a3b8;font-size:13px;line-height:1.6;">
      If the button does not work, copy this URL:
    </p>
    <p style="margin:0;color:#7dd3fc;font-size:13px;word-break:break-all;">${safeResetUrl}</p>
    <p style="margin:14px 0 0 0;color:#94a3b8;font-size:13px;">
      If you did not request this, you can ignore this message.
    </p>
  `;
  return {
    subject: "Reset your EvoData password",
    html: shell({
      title: "Reset your password",
      preheader: "Reset link for your EvoData account.",
      body,
    }),
  };
};
