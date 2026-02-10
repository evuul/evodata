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

export async function GET(request, { params }) {
  const token = getToken(request);
  const resolved = await resolveUserFromToken(token);
  if (!resolved) return json({ error: "Unauthorized" }, { status: 401 });

  const id = params?.id;
  const t = await getSupportTicket(id);
  if (!t) return json({ error: "Not found" }, { status: 404 });

  const email = String(resolved.user?.email || resolved.email || "").toLowerCase();
  if (String(t.email || "").toLowerCase() !== email) return json({ error: "Forbidden" }, { status: 403 });

  return json({
    ticket: {
      id: t.id,
      subject: t.subject,
      message: t.message,
      status: t.status,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      adminReply: t.adminReply,
    },
  });
}

export async function PUT(request, { params }) {
  const token = getToken(request);
  const resolved = await resolveUserFromToken(token);
  if (!resolved) return json({ error: "Unauthorized" }, { status: 401 });

  let payload = null;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const id = params?.id;
  const t = await getSupportTicket(id);
  if (!t) return json({ error: "Not found" }, { status: 404 });

  const email = String(resolved.user?.email || resolved.email || "").toLowerCase();
  if (String(t.email || "").toLowerCase() !== email) return json({ error: "Forbidden" }, { status: 403 });

  const action = String(payload?.action || "").trim();
  if (action !== "close") return json({ error: "Unknown action" }, { status: 400 });

  const next = await updateSupportTicket(id, { status: "closed" });
  return json({
    ticket: {
      id: next.id,
      subject: next.subject,
      message: next.message,
      status: next.status,
      createdAt: next.createdAt,
      updatedAt: next.updatedAt,
      adminReply: next.adminReply,
    },
  });
}
