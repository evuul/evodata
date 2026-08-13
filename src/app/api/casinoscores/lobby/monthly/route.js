// Serves the precomputed premium month-by-month lobby comparison.

import averagePlayersData from "@/app/data/averagePlayers.json";
import { resolveRequestUser } from "@/lib/authSession";
import {
  getMonthlyLobbyActivitySnapshot,
  getOverviewSnapshot,
  setMonthlyLobbyActivitySnapshot,
} from "@/lib/csStore";
import { hasExtendedDataAccess } from "@/lib/founderAccess";
import {
  mergeDailyLobbyHistory,
  mergeMonthlyLobbyActivitySnapshot,
} from "@/lib/monthlyLobbyActivity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

const json = (data, status = 200) => Response.json(data, {
  status,
  headers: { "Cache-Control": "private, no-store" },
});

export async function GET(request) {
  const resolved = await resolveRequestUser(request, { cache: false });
  if (!resolved) return json({ ok: false, error: "Unauthorized" }, 401);
  if (!hasExtendedDataAccess(resolved.user)) {
    return json({ ok: false, error: "Monthly comparison access required" }, 403);
  }

  const stored = await getMonthlyLobbyActivitySnapshot();
  if (stored?.activity?.length) return json({ ok: true, ...stored });

  const overviewSnapshots = await Promise.all([
    getOverviewSnapshot(730),
    getOverviewSnapshot(365),
    getOverviewSnapshot(180),
  ]);
  const overview = overviewSnapshots.find((snapshot) => snapshot?.data?.dailyTotals?.length)?.data;
  if (!overview) {
    return json({ ok: false, error: "Monthly comparison is being prepared" }, 503);
  }

  const dailyRows = mergeDailyLobbyHistory(
    averagePlayersData,
    overview.rawDailyTotals ?? overview.dailyTotals
  );
  const materialized = mergeMonthlyLobbyActivitySnapshot(null, dailyRows, overview.generatedAt);
  await setMonthlyLobbyActivitySnapshot(materialized);
  return json({ ok: true, ...materialized });
}
