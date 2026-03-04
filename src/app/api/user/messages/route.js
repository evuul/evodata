import { NextResponse } from "next/server";
import { getJson, getSessionKey, getUserKey, setJson } from "@/lib/authStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

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
  return list
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      id: String(item.id || ""),
      subject: String(item.subject || ""),
      message: String(item.message || ""),
      fromEmail: String(item.fromEmail || ""),
      fromName: String(item.fromName || ""),
      createdAt: String(item.createdAt || ""),
      readAt: item.readAt ? String(item.readAt) : null,
    }))
    .filter((item) => item.id && item.subject && item.message);
};

export async function GET(request) {
  const token = getToken(request);
  const resolved = await resolveUserFromToken(token);
  if (!resolved) return json({ error: "Unauthorized" }, { status: 401 });

  const list = normalizeMessages(resolved.user).sort((a, b) => {
    const aTs = Date.parse(a.createdAt || "");
    const bTs = Date.parse(b.createdAt || "");
    return (Number.isFinite(bTs) ? bTs : 0) - (Number.isFinite(aTs) ? aTs : 0);
  });
  const unread = list.filter((item) => !item.readAt).length;

  return json({
    ok: true,
    messages: list,
    unreadCount: unread,
  });
}

export async function PUT(request) {
  const token = getToken(request);
  const resolved = await resolveUserFromToken(token);
  if (!resolved) return json({ error: "Unauthorized" }, { status: 401 });

  let payload = null;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const action = String(payload?.action || "").trim().toLowerCase();
  if (action !== "markread" && action !== "delete") {
    return json({ error: "Invalid action." }, { status: 400 });
  }

  const ids = Array.isArray(payload?.ids)
    ? payload.ids.map((value) => String(value || "").trim()).filter(Boolean)
    : [];
  const markAll = ids.length === 0;
  const now = new Date().toISOString();

  const user = resolved.user;
  const current = normalizeMessages(user);
  if (action === "delete") {
    const next = markAll ? [] : current.filter((item) => !ids.includes(item.id));
    user.privateMessages = next.slice(0, 50);
    user.updatedAt = now;
    await setJson(getUserKey(user.email), user);
    return json({
      ok: true,
      unreadCount: user.privateMessages.filter((item) => !item.readAt).length,
      messages: user.privateMessages,
    });
  }

  const next = current.map((item) => {
    if (item.readAt) return item;
    if (markAll || ids.includes(item.id)) {
      return { ...item, readAt: now };
    }
    return item;
  });

  user.privateMessages = next.slice(0, 50);
  user.updatedAt = now;
  await setJson(getUserKey(user.email), user);

  const unread = user.privateMessages.filter((item) => !item.readAt).length;
  return json({
    ok: true,
    unreadCount: unread,
    messages: user.privateMessages,
  });
}
