export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { ensureRecentBuybackSync, readBuybackFiles } from "@/lib/buybacksSync";
import { buildBuybackComplianceSeries, summarizeBuybackCompliance } from "@/lib/buybackCompliance";
import { fetchYahooTradingVolumeByDate } from "@/lib/yahooVolumeHistory";

const BUYBACKS_ACTIVE = (process.env.BUYBACKS_ACTIVE ?? "1") === "1";
const DEFAULT_SYMBOL = "EVO.ST";
const DEFAULT_RANGE = "1y";
const DEFAULT_START_DATE = "2026-05-18";

function isMondayInStockholm(date = new Date()) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: "Europe/Stockholm",
  }).format(date);
  return weekday === "Mon";
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const force = searchParams.get("force") === "1";
  const startDate = searchParams.get("startDate") || DEFAULT_START_DATE;
  const range = searchParams.get("range") || DEFAULT_RANGE;
  const shouldSync = BUYBACKS_ACTIVE && (force || isMondayInStockholm());
  let syncError = null;

  if (shouldSync) {
    try {
      await ensureRecentBuybackSync();
    } catch (err) {
      syncError = err instanceof Error ? err.message : String(err);
      console.error("Auto buyback sync failed for compliance:", syncError);
    }
  }

  try {
    const { oldData, curData } = await readBuybackFiles();
    const combined = [...(Array.isArray(oldData) ? oldData : []), ...(Array.isArray(curData) ? curData : [])];
    const { volumeByDate, source } = await fetchYahooTradingVolumeByDate(DEFAULT_SYMBOL, { range });
    const series = buildBuybackComplianceSeries(combined, volumeByDate, { startDate });
    const summary = summarizeBuybackCompliance(series);

    return NextResponse.json(
      {
        ok: true,
        series,
        summary,
        updatedAt: new Date().toISOString(),
        symbol: DEFAULT_SYMBOL,
        source,
        buybacksActive: BUYBACKS_ACTIVE,
        syncError,
        startDate,
        range,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        updatedAt: new Date().toISOString(),
        symbol: DEFAULT_SYMBOL,
        buybacksActive: BUYBACKS_ACTIVE,
        syncError,
        startDate,
        range,
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
