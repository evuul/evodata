import { NextResponse } from "next/server";
import { getJson, getSessionKey, getUserKey, setJson } from "@/lib/authStore";

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

const normalizeMessages = (user) => {
  const list = Array.isArray(user?.privateMessages) ? user.privateMessages : [];
  return list.filter((item) => item && typeof item === "object");
};

export async function POST(request) {
  const token = getToken(request);
  const resolved = await resolveUserFromToken(token);
  if (!resolved) return json({ error: "Unauthorized" }, { status: 401 });

  const actorEmail = String(resolved.user?.email || resolved.email || "").trim().toLowerCase();
  if (actorEmail !== ADMIN_EMAIL) return json({ error: "Forbidden" }, { status: 403 });

  let payload = null;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const toEmail = String(payload?.toEmail || "").trim().toLowerCase();
  const subject = String(payload?.subject || "").trim();
  const message = String(payload?.message || "").trim();
  if (!toEmail || !toEmail.includes("@")) {
    return json({ error: "Invalid recipient email." }, { status: 400 });
  }
  if (subject.length < 2 || subject.length > 120) {
    return json({ error: "Subject must be 2-120 characters." }, { status: 400 });
  }
  if (message.length < 3 || message.length > 2000) {
    return json({ error: "Message must be 3-2000 characters." }, { status: 400 });
  }

  const recipient = await getJson(getUserKey(toEmail));
  if (!recipient?.email) {
    return json({ error: "Recipient not found." }, { status: 404 });
  }

  const now = new Date().toISOString();
  const senderName = [resolved.user?.firstName, resolved.user?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  const nextMessage = {
    id: `pm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    subject,
    message,
    fromEmail: actorEmail,
    fromName: senderName || "Admin",
    createdAt: now,
    readAt: null,
  };

  const existing = normalizeMessages(recipient);
  recipient.privateMessages = [nextMessage, ...existing].slice(0, 50);
  recipient.updatedAt = now;
  await setJson(getUserKey(recipient.email), recipient);

  return json({
    ok: true,
    mode: "private-message",
    recipient: recipient.email,
    messageId: nextMessage.id,
    createdAt: nextMessage.createdAt,
  });
}
