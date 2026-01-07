import yahooFinance, { ExtendedCookieJar } from "yahoo-finance2";

const g = globalThis;
const MIN_YAHOO_GAP_MS = 1500;

if (!g.__yahooFinanceClient) {
  const cookieJar = new ExtendedCookieJar();
  yahooFinance.setGlobalConfig({
    cookieJar,
    queue: { concurrency: 1 },
  });
  g.__yahooFinanceClient = {
    cookieJar,
    lastRequestAt: 0,
  };
}

export async function withYahooThrottle(fn) {
  const state = g.__yahooFinanceClient;
  const now = Date.now();
  const waitMs = Math.max(0, state.lastRequestAt + MIN_YAHOO_GAP_MS - now);
  if (waitMs) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  const result = await fn();
  state.lastRequestAt = Date.now();
  return result;
}

export default yahooFinance;
