// Serves the cached Evolution short-interest snapshot for public dashboard reads.

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import {
  EVO_LEI,
} from "@/lib/fiShortRegister";
import { resolveFiShortSnapshot } from "@/lib/fiShortSnapshot";
import { logApiError } from "@/lib/apiErrors";

const CACHE_CONTROL = "no-store, max-age=0, must-revalidate";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const requestedLei = searchParams.get('lei');
  if (requestedLei && requestedLei !== EVO_LEI) {
    return new Response(JSON.stringify({ error: "Unsupported issuer" }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': CACHE_CONTROL },
    });
  }
  const lei = EVO_LEI;

  try {
    const data = await resolveFiShortSnapshot({ lei });
    const total = typeof data.totalPercent === "number" ? data.totalPercent : null;
    const publicPercent = Number.isFinite(data.publicPercent) ? data.publicPercent : null;
    const nonPublicPercent =
      total != null && publicPercent != null ? Math.max(0, +(total - publicPercent).toFixed(2)) : null;

    const body = {
      lei,
      totalPercent: total,
      publicPercent,
      nonPublicPercent,
      publicPositions: Array.isArray(data.publicPositions) ? data.publicPositions : [],
      publicPositionsError: null,
      observedDate: data.observedDate,
      fetchedAt: data.fetchedAt ?? null,
      cached: Boolean(data.cached),
      stale: Boolean(data.stale),
      source: data.source,
    };
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': CACHE_CONTROL },
    });
  } catch (err) {
    logApiError({ route: "short", stage: "resolve-snapshot", error: err });
    return new Response(JSON.stringify({ error: "Short-interest data is temporarily unavailable" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': CACHE_CONTROL },
    });
  }
}
