import yahooFinance, { withYahooThrottle } from "@/lib/yahooFinanceClient";

const RANGE_TO_DAYS = {
  "1mo": 31,
  "3mo": 93,
  "6mo": 183,
  "1y": 365,
  "2y": 730,
};

const toDateString = (value) => {
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
  } catch {
    return null;
  }
};

function rangeToPeriod1(range) {
  const days = RANGE_TO_DAYS[range] ?? RANGE_TO_DAYS["1y"];
  const period1 = new Date();
  period1.setUTCDate(period1.getUTCDate() - (days + 10));
  return period1;
}

async function fetchYahooChartVolume(symbol, range = "1y") {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol
  )}?range=${range}&interval=1d`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Yahoo chart request failed: ${response.status}`);
  }
  const data = await response.json();
  const result = data?.chart?.result?.[0];
  const timestamps = Array.isArray(result?.timestamp) ? result.timestamp : [];
  const volumes = Array.isArray(result?.indicators?.quote?.[0]?.volume)
    ? result.indicators.quote[0].volume
    : [];
  if (!timestamps.length || !volumes.length) {
    throw new Error("Yahoo chart returned no volume data");
  }

  const volumeByDate = new Map();
  for (let i = 0; i < timestamps.length; i += 1) {
    const ts = timestamps[i];
    const vol = volumes[i];
    const date = new Date(ts * 1000);
    if (!Number.isFinite(vol) || Number.isNaN(date.getTime())) continue;
    volumeByDate.set(date.toISOString().slice(0, 10), Number(vol));
  }
  return volumeByDate;
}

async function fetchYahooHistoricalVolume(symbol, range = "1y") {
  const period1 = rangeToPeriod1(range);
  const historical = await withYahooThrottle(() =>
    yahooFinance.historical(symbol, {
      period1,
      period2: new Date(),
      interval: "1d",
    })
  );

  const volumeByDate = new Map();
  for (const row of historical ?? []) {
    const date = toDateString(row?.date);
    if (!date) continue;
    const volume = Number(row?.volume ?? row?.adjVolume ?? 0);
    if (!Number.isFinite(volume)) continue;
    volumeByDate.set(date, volume);
  }
  if (!volumeByDate.size) {
    throw new Error("Yahoo historical returned no volume data");
  }
  return volumeByDate;
}

export async function fetchYahooTradingVolumeByDate(symbol, { range = "1y" } = {}) {
  try {
    return { volumeByDate: await fetchYahooChartVolume(symbol, range), source: "yahoo-chart" };
  } catch (chartErr) {
    try {
      return { volumeByDate: await fetchYahooHistoricalVolume(symbol, range), source: "yahoo-finance2" };
    } catch {
      throw chartErr;
    }
  }
}
