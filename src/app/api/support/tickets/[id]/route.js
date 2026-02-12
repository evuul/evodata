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
  if (action !== "reopen") return json({ error: "Unknown action" }, { status: 400 });
  if (String(t.status || "").toLowerCase() !== "closed") {
    return json({ error: "Only closed tickets can be reopened." }, { status: 400 });
  }

  const followUp = String(payload?.message || "").trim();
  if (followUp.length < 3) {
    return json({ error: "Follow-up message is too short." }, { status: 400 });
  }

  const reopenStamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  const prevReply = String(t?.adminReply?.message || "").trim();
  const prevReplyAt = String(t?.adminReply?.repliedAt || "").slice(0, 16).replace("T", " ");
  const replyBlock = prevReply
    ? `\n\n---\nSupport reply (${prevReplyAt || reopenStamp})\n${prevReply}`
    : "";
  const nextMessage = `${String(t.message || "").trim()}${replyBlock}\n\n---\nFollow-up (${reopenStamp})\n${followUp}`;
  const next = await updateSupportTicket(id, {
    status: "open",
    message: nextMessage,
    adminReply: null,
  });
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
