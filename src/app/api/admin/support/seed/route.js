import { NextResponse } from "next/server";
import { getJson, getSessionKey, getUserKey } from "@/lib/authStore";
import { createSupportTicket, updateSupportTicket } from "@/lib/supportStore";

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

export async function POST(request) {
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

  const mode = String(payload?.mode || "open");
  const ticket = await createSupportTicket({
    email: resolved.user.email,
    firstName: resolved.user.firstName || "Alexander",
    lastName: resolved.user.lastName || "",
    subject: "Demo: Support ticket",
    message:
      "Hej! Detta är en test-ticket för att se hur supporten fungerar. Här kan användaren beskriva sitt problem.",
  });

  if (mode === "answered") {
    await updateSupportTicket(ticket.id, {
      status: "answered",
      adminReply: {
        message:
          "Tack! Vi har kollat och återkommer med en fix. Under tiden kan du prova att logga ut och in igen.",
        repliedAt: new Date().toISOString(),
        repliedBy: ADMIN_EMAIL,
      },
    });
  }

  return json({ ticketId: ticket.id });
}

