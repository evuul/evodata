const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.AUTH_EMAIL_FROM || process.env.FEEDBACK_EMAIL_FROM;

const isConfigured = () => Boolean(RESEND_API_KEY && FROM_EMAIL);

export const isMailerConfigured = () => isConfigured();

export const sendEmail = async ({ toEmail, subject, html }) => {
  if (!isConfigured()) {
    throw new Error("Mailer not configured");
  }
  if (!toEmail || !subject || !html) {
    throw new Error("Missing email payload");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [toEmail],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Resend failed: ${response.status} ${text}`);
  }
};
