// Extracts the current Stockholm session quote from Yahoo's one-day chart response.

function toPositiveNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function normalizeYahooSessionQuote(payload) {
  const result = payload?.chart?.result?.[0];
  const meta = result?.meta;
  const quote = result?.indicators?.quote?.[0];
  const firstOpen = Array.isArray(quote?.open) ? quote.open.find((value) => value != null) : null;
  const marketTimeSeconds = toPositiveNumber(meta?.regularMarketTime);

  return {
    currentPrice: toPositiveNumber(meta?.regularMarketPrice),
    previousClose: toPositiveNumber(
      meta?.previousClose ?? meta?.regularMarketPreviousClose ?? meta?.chartPreviousClose
    ),
    marketOpen: toPositiveNumber(meta?.regularMarketOpen) ?? toPositiveNumber(firstOpen),
    quoteTime: marketTimeSeconds ? new Date(marketTimeSeconds * 1000) : null,
  };
}
