// Serves the premium hourly lobby baseline behind server-side account entitlements.

import { buildPublicErrorBody, logApiError } from "@/lib/apiErrors";
import { resolveRequestUser } from "@/lib/authSession";
import { recordCostEvent } from "@/lib/csCostTracker";
import { hasExtendedDataAccess } from "@/lib/founderAccess";
import { getCachedHourlyLobbyBaseline } from "@/lib/hourlyLobbyBaseline";
import { publishedHourlyCohort } from "@/lib/hourlyLobbyCohortSelection";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

const json = (data, status = 200) => Response.json(data, {
  status,
  headers: { "Cache-Control": "private, no-store" },
});

export async function GET(request) {
  try {
    const resolved = await resolveRequestUser(request, { cache: false });
    if (!resolved) return json({ ok: false, error: "Unauthorized" }, 401);
    if (!hasExtendedDataAccess(resolved.user)) {
      return json({ ok: false, error: "Premium or Founder access required" }, 403);
    }
    recordCostEvent({
      endpoint: "/api/casinoscores/lobby/hourly",
      includeHourly: true,
    });

    const cached = await getCachedHourlyLobbyBaseline();
    const baseline = publishedHourlyCohort(cached) ? cached : null;
    return json({ ok: true, baseline });
  } catch (error) {
    logApiError({ route: "casinoscores-lobby-hourly", stage: "build-hourly-baseline", error });
    return json(buildPublicErrorBody({ message: "Kunde inte hämta timjämförelsen just nu." }), 500);
  }
}
