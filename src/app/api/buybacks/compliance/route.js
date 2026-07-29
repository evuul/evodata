// Builds buyback compliance metrics from validated public query parameters.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { readBuybackFiles } from "@/lib/buybacksSync";
import { buildBuybackComplianceSeries, summarizeBuybackCompliance } from "@/lib/buybackCompliance";
import { fetchYahooTradingVolumeByDate } from "@/lib/yahooVolumeHistory";
import { normalizeComplianceRange, normalizeIsoDate } from "@/lib/buybackRequestValidation";

const BUYBACKS_ACTIVE = (process.env.BUYBACKS_ACTIVE ?? "1") === "1";
const DEFAULT_SYMBOL = "EVO.ST";
const DEFAULT_RANGE = "1y";
const DEFAULT_START_DATE = "2026-05-18";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const startDate = normalizeIsoDate(searchParams.get("startDate"), DEFAULT_START_DATE);
  const range = normalizeComplianceRange(searchParams.get("range"), DEFAULT_RANGE);

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
        syncError: null,
        startDate,
        range,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: "Buyback compliance data is temporarily unavailable",
        updatedAt: new Date().toISOString(),
        symbol: DEFAULT_SYMBOL,
        buybacksActive: BUYBACKS_ACTIVE,
        syncError: null,
        startDate,
        range,
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
