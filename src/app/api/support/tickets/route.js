// Lists and creates support tickets for authenticated users.

import { NextResponse } from "next/server";
import { getJson } from "@/lib/authStore";
import { createSupportTicket, getSupportUserTicketsKey, listSupportTicketsByIds } from "@/lib/supportStore";
import { getRequestSessionToken as getToken, resolveUserFromToken } from "@/lib/authSession";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

const json = (data, init = {}) =>
  NextResponse.json(data, {
    status: init.status ?? 200,
    headers: { "Cache-Control": "no-store" },
  });

const toSummary = (t) => ({
  id: t.id,
  subject: t.subject,
  createdBy: t.createdBy || "user",
  status: t.status,
  createdAt: t.createdAt,
  updatedAt: t.updatedAt,
  hasReply: Boolean(t.adminReply?.message),
  replyAt: t.adminReply?.repliedAt ?? null,
});

export async function GET(request) {
  const token = getToken(request);
  const resolved = await resolveUserFromToken(token);
  if (!resolved) return json({ error: "Unauthorized" }, { status: 401 });

  const email = String(resolved.user?.email || resolved.email || "").toLowerCase();
  const ids = (await getJson(getSupportUserTicketsKey(email))) || [];
  const tickets = await listSupportTicketsByIds(ids, 50);

  return json({
    ok: true,
    viewerEmail: email,
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

  return json({ ok: true, ticket: toSummary(ticket) });
}
