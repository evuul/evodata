import { NextResponse } from "next/server";
import { getJson, getSessionKey, getUserKey } from "@/lib/authStore";
import { isMailerConfigured, sendEmail } from "@/lib/mailer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "alexander.ek@live.se").trim().toLowerCase();

const json = (data, init = {}) =>
  NextResponse.json(data, {
    status: init.status ?? 200,
    headers: { "Cache-Control": "no-store", ...(init.headers || {}) },
  });

const getToken = (request) => {
  const auth = request.headers.get("authorization") || "";
  if (!auth.toLowerCase().startsWith("bearer ")) return null;
  return auth.slice(7).trim();
};

const resolveUserFromToken = async (token) => {
  if (!token) return null;
  const session = await getJson(getSessionKey(token));
  if (!session?.email) return null;
  const user = await getJson(getUserKey(session.email));
  return user ? { user, email: session.email } : null;
};

const buildTestMailHtml = ({ to }) => `
<!doctype html>
<html>
  <body style="margin:0;background:#0b1220;color:#e2e8f0;font-family:Inter,Segoe UI,Roboto,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:linear-gradient(145deg,#111b31,#0d1630);border:1px solid rgba(148,163,184,.25);border-radius:16px;">
          <tr><td style="padding:26px 28px;">
            <div style="font-size:12px;letter-spacing:1.6px;text-transform:uppercase;color:#93c5fd;font-weight:700;">EvoTracker Admin</div>
            <h1 style="margin:10px 0 0 0;font-size:26px;color:#f8fafc;">Mail test successful</h1>
            <p style="margin:14px 0 0 0;color:#cbd5e1;line-height:1.65;">
              This is a test email from <strong>EvoTracker</strong> (<code>/api/admin/mail-test</code>).
            </p>
            <p style="margin:8px 0 0 0;color:#94a3b8;">Recipient: ${to}</p>
            <p style="margin:8px 0 0 0;color:#94a3b8;">Sent at: ${new Date().toISOString()}</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

export async function POST(request) {
  const token = getToken(request);
  const resolved = await resolveUserFromToken(token);
  if (!resolved) return json({ error: "Unauthorized" }, { status: 401 });

  const actorEmail = String(resolved.user?.email || resolved.email || "").toLowerCase();
  if (actorEmail !== ADMIN_EMAIL) {
    return json({ error: "Forbidden" }, { status: 403 });
  }

  if (!isMailerConfigured()) {
    return json({ error: "Mailer not configured" }, { status: 503 });
  }

  let payload = null;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const toEmail = String(payload?.toEmail || actorEmail).trim().toLowerCase();
  const subject = String(payload?.subject || "EvoTracker mail test").trim();
  if (!toEmail) return json({ error: "toEmail missing" }, { status: 400 });

  await sendEmail({
    toEmail,
    subject,
    html: buildTestMailHtml({ to: toEmail }),
  });

  return json({ ok: true, toEmail, subject });
}
