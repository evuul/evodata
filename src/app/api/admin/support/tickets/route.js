import { NextResponse } from "next/server";
import { getJson, getSessionKey, getUserKey } from "@/lib/authStore";
import { getSupportTicketsIndexKey, listSupportTicketsByIds } from "@/lib/supportStore";

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

export async function GET(request) {
  const token = getToken(request);
  const resolved = await resolveUserFromToken(token);
  if (!resolved) return json({ error: "Unauthorized" }, { status: 401 });
  if (!requireAdmin(resolved)) return json({ error: "Forbidden" }, { status: 403 });

  const ids = (await getJson(getSupportTicketsIndexKey())) || [];
  const tickets = await listSupportTicketsByIds(ids, 80);

  const rows = tickets
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
    .map((t) => ({
      id: t.id,
      subject: t.subject,
      status: t.status,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      email: t.email,
      firstName: t.firstName,
      lastName: t.lastName,
      hasReply: Boolean(t.adminReply?.message),
    }));

  return json({ tickets: rows, total: rows.length });
}

