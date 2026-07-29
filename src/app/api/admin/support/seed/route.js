// Seeds support records for authenticated administrator testing.

import { NextResponse } from "next/server";
import { createSupportTicket, updateSupportTicket } from "@/lib/supportStore";
import { getRequestSessionToken as getToken, resolveUserFromToken } from "@/lib/authSession";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

const json = (data, init = {}) =>
  NextResponse.json(data, {
    status: init.status ?? 200,
    headers: { "Cache-Control": "no-store" },
  });

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "alexander.ek@live.se").trim().toLowerCase();

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

  return json({ ok: true, ticketId: ticket.id });
}
