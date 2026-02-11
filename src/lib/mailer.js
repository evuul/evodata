const RESEND_API_KEY = process.env.RESEND_API_KEY;
const DEFAULT_FROM_EMAIL = "EvoTracker <noreply@evotracker.org>";
const RAW_FROM_EMAIL = process.env.AUTH_EMAIL_FROM || process.env.FEEDBACK_EMAIL_FROM || DEFAULT_FROM_EMAIL;
const FROM_EMAIL = RAW_FROM_EMAIL.replace(/EvoData/gi, "EvoTracker").replace(/evodata\.app/gi, "evotracker.org");

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
