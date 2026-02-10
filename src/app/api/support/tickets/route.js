import { NextResponse } from "next/server";
import { getJson, getSessionKey, getUserKey } from "@/lib/authStore";
import { createSupportTicket, getSupportUserTicketsKey, listSupportTicketsByIds } from "@/lib/supportStore";

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

const toSummary = (t) => ({
  id: t.id,
  subject: t.subject,
  status: t.status,
  createdAt: t.createdAt,
  updatedAt: t.updatedAt,
  hasReply: Boolean(t.adminReply?.message),
});

export async function GET(request) {
  const token = getToken(request);
  const resolved = await resolveUserFromToken(token);
  if (!resolved) return json({ error: "Unauthorized" }, { status: 401 });

  const email = String(resolved.user?.email || resolved.email || "").toLowerCase();
  const ids = (await getJson(getSupportUserTicketsKey(email))) || [];
  const tickets = await listSupportTicketsByIds(ids, 50);

  return json({
    tickets: tickets
      .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
      .map(toSummary),
  });
}

export async function POST(request) {
  const token = getToken(request);
  const resolved = await resolveUserFromToken(token);
  if (!resolved) return json({ error: "Unauthorized" }, { status: 401 });

  let payload = null;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const subject = String(payload?.subject || "").trim();
  const message = String(payload?.message || "").trim();
  if (subject.length < 3 || message.length < 5) {
    return json({ error: "Invalid ticket." }, { status: 400 });
  }

  const user = resolved.user;
  const ticket = await createSupportTicket({
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    subject,
    message,
  });

  return json({ ticket: toSummary(ticket) });
}

