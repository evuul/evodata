import { NextResponse } from "next/server";
import { getJson, getSessionKey, getUserKey } from "@/lib/authStore";
import { getSupportTicket, updateSupportTicket } from "@/lib/supportStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

const json = (data, init = {}) =>
  NextResponse.json(data, {
    status: init.status ?? 200,
    headers: { "Cache-Control": "no-store" },
  });

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "alexander.ek@live.se").trim().toLowerCase();

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

const requireAdmin = (resolved) => {
  const email = String(resolved?.user?.email || resolved?.email || "").toLowerCase();
  return email && email === ADMIN_EMAIL;
};

export async function GET(request, { params }) {
  const token = getToken(request);
  const resolved = await resolveUserFromToken(token);
  if (!resolved) return json({ error: "Unauthorized" }, { status: 401 });
  if (!requireAdmin(resolved)) return json({ error: "Forbidden" }, { status: 403 });

  const id = params?.id;
  const t = await getSupportTicket(id);
  if (!t) return json({ error: "Not found" }, { status: 404 });
  return json({ ticket: t });
}

export async function PUT(request, { params }) {
  const token = getToken(request);
  const resolved = await resolveUserFromToken(token);
  if (!resolved) return json({ error: "Unauthorized" }, { status: 401 });
  if (!requireAdmin(resolved)) return json({ error: "Forbidden" }, { status: 403 });

  let payload = null;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const id = params?.id;
  const action = String(payload?.action || "").trim();

  if (action === "reply") {
    const message = String(payload?.message || "").trim();
    if (message.length < 3) return json({ error: "Invalid reply" }, { status: 400 });
    const next = await updateSupportTicket(id, {
      status: "answered",
      adminReply: {
        message,
        repliedAt: new Date().toISOString(),
        repliedBy: ADMIN_EMAIL,
      },
    });
    if (!next) return json({ error: "Not found" }, { status: 404 });
    return json({ ticket: next });
  }

  if (action === "close") {
    const next = await updateSupportTicket(id, { status: "closed" });
    if (!next) return json({ error: "Not found" }, { status: 404 });
    return json({ ticket: next });
  }

  return json({ error: "Unknown action" }, { status: 400 });
}

