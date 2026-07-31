// Exports extended daily player history for authenticated Founder accounts.

import { findFounderAccess } from "@/lib/founderAccess";
import {
  buildFounderExportRows,
  normalizeFounderExportRequest,
  serializeFounderCsv,
} from "@/lib/founderExport";
import { resolveRequestUser } from "@/lib/authSession";
import { getCachedDailyAggregates } from "@/lib/csStore";
import { SERIES_SLUGS } from "../../casinoscores/players/shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

const SERIES_SLUG_SET = new Set(SERIES_SLUGS);
const jsonError = (error, status) => Response.json(
  { error },
  { status, headers: { "Cache-Control": "no-store" } }
);

const stockholmTodayYmd = () => {
  try {
    return new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Europe/Stockholm",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()).replaceAll("/", "-");
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
};

export async function GET(request) {
  const resolved = await resolveRequestUser(request, { cache: false });
  if (!resolved) return jsonError("Unauthorized", 401);
  if (!findFounderAccess(resolved.user?.email)) return jsonError("Founder access required", 403);

  const { searchParams } = new URL(request.url);
  const exportRequest = normalizeFounderExportRequest(searchParams, SERIES_SLUG_SET);
  if (!exportRequest.ok) return jsonError(exportRequest.error, 400);

  try {
    // Match the overview snapshot key so an export normally reuses already aggregated data.
    const aggregates = await getCachedDailyAggregates(SERIES_SLUGS, exportRequest.days + 5);
    const rows = buildFounderExportRows({
      aggregates,
      slugs: SERIES_SLUGS,
      scope: exportRequest.scope,
      game: exportRequest.game,
      days: exportRequest.days,
      todayYmd: stockholmTodayYmd(),
    });
    const csv = serializeFounderCsv(rows, { scope: exportRequest.scope });
    const suffix = exportRequest.scope === "game" ? exportRequest.game : "lobby";

    return new Response(`\uFEFF${csv}`, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="evotracker-${suffix}-${exportRequest.days}d.csv"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return jsonError("Export unavailable", 503);
  }
}
