import { NextResponse } from "next/server";
import yahooFinance from "yahoo-finance2";

export const revalidate = 60;
export const dynamic = "force-dynamic";

const CACHE_CONTROL = "public, max-age=60, s-maxage=60, stale-while-revalidate=120";
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minuter

const g = globalThis;
g.__stockRouteCache ??= new Map();

function makeEtag(obj) {
  const s = JSON.stringify(obj);
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return `W/"${h.toString(16)}"`;
}

function getCached(symbol) {
  const hit = g.__stockRouteCache.get(symbol);
  if (!hit) return null;
  if (hit.exp > Date.now()) return hit;
  g.__stockRouteCache.delete(symbol);
  return null;
}

function setCached(symbol, data, etag) {
  g.__stockRouteCache.set(symbol, { data, etag, exp: Date.now() + CACHE_TTL_MS });
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbolRaw = searchParams.get("symbol") || "";
  const symbol = symbolRaw.trim().toUpperCase();

  if (!symbol) {
    return NextResponse.json({ error: "Stock symbol required" }, { status: 400 });
  }

  const cached = getCached(symbol);
  if (cached) {
    const inm = request.headers.get("if-none-match");
    if (inm && cached.etag && inm === cached.etag) {
      return new Response(null, {
        status: 304,
        headers: {
          ETag: cached.etag,
          "Cache-Control": CACHE_CONTROL,
        },
      });
    }
    return NextResponse.json(cached.data, {
      status: 200,
      headers: {
        ETag: cached.etag,
        "Cache-Control": CACHE_CONTROL,
      },
    });
  }

  try {
    const now = new Date();
    const period1 = new Date(now.getFullYear(), 0, 1);

    const quote = await yahooFinance.quote(symbol);
    if (!quote) {
      return NextResponse.json({ error: `No data found for symbol ${symbol}` }, { status: 404 });
    }

    const historicalRaw = await yahooFinance.historical(symbol, {
      period1,
      period2: now,
      interval: "1d",
    });

    if (!Array.isArray(historicalRaw) || historicalRaw.length === 0) {
      return NextResponse.json({ error: `No historical data found for symbol ${symbol}` }, { status: 404 });
    }

    const historicalData = historicalRaw
      .map((row) => {
        const date = row?.date ? new Date(row.date) : null;
        const close = Number(row?.close ?? row?.adjClose);
        if (!date || Number.isNaN(date.getTime()) || !Number.isFinite(close)) return null;
        return { date, close };
      })
      .filter((row) => row && row.date >= period1 && row.date <= now)
      .sort((a, b) => a.date - b.date);

    if (!historicalData.length) {
      return NextResponse.json({ error: "Could not find start of year price" }, { status: 404 });
    }

    const startOfYearPrice = historicalData[0]?.close;
    const currentPrice = Number(quote?.regularMarketPrice);

    const ytdChangePercent =
      Number.isFinite(currentPrice) && Number.isFinite(startOfYearPrice) && startOfYearPrice !== 0
        ? ((currentPrice - startOfYearPrice) / startOfYearPrice) * 100
        : null;

    let gains = 0;
    let losses = 0;
    for (let i = 1; i < historicalData.length; i++) {
      const previousClose = historicalData[i - 1]?.close;
      const currentClose = historicalData[i]?.close;
      if (!Number.isFinite(previousClose) || !Number.isFinite(currentClose)) continue;
      const delta = currentClose - previousClose;
      if (delta > 0) gains += 1;
      else if (delta < 0) losses += 1;
    }

    const payload = {
      price: {
        regularMarketPrice: {
          raw: Number.isFinite(currentPrice) ? currentPrice : null,
        },
        regularMarketChangePercent: {
          raw: Number.isFinite(quote?.regularMarketChangePercent)
            ? Number(quote.regularMarketChangePercent)
            : null,
        },
      },
      marketCap: Number.isFinite(quote?.marketCap) ? Number(quote.marketCap) : null,
      ytdChangePercent,
      daysWithGains: gains,
      daysWithLosses: losses,
      generatedAt: now.toISOString(),
    };

    const etag = makeEtag(payload);
    setCached(symbol, payload, etag);

    return NextResponse.json(payload, {
      status: 200,
      headers: {
        ETag: etag,
        "Cache-Control": CACHE_CONTROL,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
