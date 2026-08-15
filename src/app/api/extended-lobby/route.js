// Serves Extended lobby data only to Premium, Founder, and administrator accounts.

import { resolveRequestUser } from "@/lib/authSession";
import { hasExtendedDataAccess } from "@/lib/founderAccess";
import {
  getLatestSuccessfulUnibetPilotSample,
  getLatestUnibetPilotSample,
} from "@/lib/unibetPilotStore";
import { buildExtendedLobbyPayload, resolveExtendedLobbySample } from "@/lib/extendedLobby";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

const json = (data, status = 200) => Response.json(data, {
  status,
  headers: { "Cache-Control": "private, no-store" },
});

export async function GET(request) {
  const resolved = await resolveRequestUser(request);
  if (!resolved) return json({ ok: false, error: "Unauthorized" }, 401);
  if (!hasExtendedDataAccess(resolved.user)) {
    return json({ ok: false, error: "Extended lobby access required" }, 403);
  }

  const sample = await getLatestUnibetPilotSample();
  const latestSuccessfulSample = sample?.status === "ok"
    ? sample
    : await getLatestSuccessfulUnibetPilotSample();
  const resolvedSample = resolveExtendedLobbySample(sample, latestSuccessfulSample);
  if (!resolvedSample) {
    return json({ ok: false, error: "Extended lobby data is temporarily unavailable" }, 503);
  }

  return json({
    ok: true,
    ...buildExtendedLobbyPayload(resolvedSample.sample),
    stale: resolvedSample.stale,
    staleAgeMs: resolvedSample.staleAgeMs,
  });
}
