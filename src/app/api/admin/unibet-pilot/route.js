// Exposes isolated Unibet pilot reliability metrics to the administrator.

import { getRequestSessionToken, resolveUserFromToken } from "@/lib/authSession";
import { isConfiguredAdminEmail } from "@/lib/adminAccess";
import { getUnibetPilotHistory } from "@/lib/unibetPilotStore";
import { summarizeUnibetPilotHistory } from "@/lib/unibetPilot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

const json = (data, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(request) {
  const token = getRequestSessionToken(request);
  const resolved = await resolveUserFromToken(token);
  if (!resolved) return json({ ok: false, error: "Unauthorized" }, 401);

  const email = resolved.user?.email || resolved.email;
  if (!isConfiguredAdminEmail(email)) return json({ ok: false, error: "Forbidden" }, 403);

  const url = new URL(request.url);
  const requestedLimit = Number(url.searchParams.get("limit") || 288);
  const history = await getUnibetPilotHistory(requestedLimit);
  const reliability = summarizeUnibetPilotHistory(history);

  return json({
    ok: true,
    pilot: true,
    isolated: true,
    generatedAt: new Date().toISOString(),
    reliability,
    samples: history,
  });
}
