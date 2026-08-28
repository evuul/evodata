// Serves the premium hourly lobby baseline behind server-side account entitlements.

import { buildPublicErrorBody, logApiError } from "@/lib/apiErrors";
import { resolveRequestUser } from "@/lib/authSession";
import { recordCostEvent } from "@/lib/csCostTracker";
import { getLatestPlayersSnapshot } from "@/lib/csStore";
import { hasExtendedDataAccess } from "@/lib/founderAccess";
import {
  buildHourlyLobbyPayload,
  loadHourlyLobbyBaseline,
} from "@/lib/hourlyLobbyBaseline";

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

    const [baseline, latestSnapshot] = await Promise.all([
      loadHourlyLobbyBaseline(),
      getLatestPlayersSnapshot(),
    ]);
    if (!baseline?.buckets?.length) {
      return json({ ok: false, error: "Hourly comparison is being prepared" }, 503);
    }

    return json({
      ok: true,
      ...buildHourlyLobbyPayload({ baseline, latestSnapshot }),
    });
  } catch (error) {
    logApiError({ route: "casinoscores-lobby-hourly", stage: "build-hourly-baseline", error });
    return json(buildPublicErrorBody({ message: "Kunde inte hämta timjämförelsen just nu." }), 500);
  }
}
