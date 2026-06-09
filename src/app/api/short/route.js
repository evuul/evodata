export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import {
  EVO_LEI,
  resolveFiShortSnapshot,
} from "@/lib/fiShortRegister";

const CACHE_CONTROL = "no-store, max-age=0, must-revalidate";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lei = searchParams.get('lei') || EVO_LEI;

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
      source: data.source,
      fetchedAt: data.fetchedAt ?? null,
      cached: Boolean(data.cached),
      stale: Boolean(data.stale),
    };
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': CACHE_CONTROL },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': CACHE_CONTROL },
    });
  }
}
