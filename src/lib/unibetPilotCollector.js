// Collects Evolution game counts from Unibet in an isolated headless-browser session.

import { createUnibetPilotSample } from "./unibetPilot.js";
import { existsSync } from "node:fs";

export const DEFAULT_UNIBET_PILOT_URLS = [
  "https://www.unibet.mt/livecasino/gameshows",
  "https://www.unibet.mt/livecasino/roulette",
  "https://www.unibet.mt/livecasino/baccarat",
];
export const DEFAULT_UNIBET_PILOT_TIMEOUT_MS = 9_000;

const parseSourceUrls = (value) => {
  if (Array.isArray(value)) return value.map(String).map((url) => url.trim()).filter(Boolean);
  return String(value || "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);
};

async function collectRows(page, sourceUrl, timeoutMs) {
  await page.goto(sourceUrl, { waitUntil: "domcontentloaded", timeout: timeoutMs });
  await page.waitForSelector('[data-test-name="game-tile"]', { timeout: timeoutMs });
  await page.waitForSelector('[data-test-name="player-activity-tag"] span', { timeout: timeoutMs });

  return page.$$eval('[data-test-name="game-tile"]', (tiles) =>
    tiles.map((tile) => ({
      name: tile.querySelector('[data-test-name="game-name"]')?.textContent || "",
      provider:
        tile.querySelector('[data-test-name="provider-name"]')?.textContent ||
        tile.querySelector('[data-test-name="game-tile-game-vendor"]')?.textContent ||
        "",
      players: tile.querySelector('[data-test-name="player-activity-tag"] span')?.textContent || "",
      href: tile.querySelector('[data-test-name="game-tile-play-for-real-button"]')?.getAttribute("href") || "",
    }))
  );
}

async function createConfiguredPage(browser, context) {
  const page = context ? await context.newPage() : await browser.newPage();
  await page.setViewport?.({ width: 1440, height: 1000 });
  await page.setViewportSize?.({ width: 1440, height: 1000 });
  await page.setUserAgent?.(
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131 Safari/537.36"
  );
  if (typeof page.setRequestInterception === "function") {
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      const resourceType = request.resourceType?.();
      if (["font", "image", "media"].includes(resourceType)) {
        request.abort().catch(() => {});
        return;
      }
      request.continue().catch(() => {});
    });
  }
  return page;
}

async function launchBrowser() {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION) {
    const [{ default: chromium }, { default: puppeteer }] = await Promise.all([
      import("@sparticuz/chromium"),
      import("puppeteer-core"),
    ]);
    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
  }

  const { chromium } = await import("playwright");
  const configuredPath = String(process.env.UNIBET_PILOT_BROWSER_PATH || "").trim();
  const macChromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const executablePath = configuredPath || (existsSync(macChromePath) ? macChromePath : null);
  try {
    return await chromium.launch({
      ...(executablePath ? { executablePath } : { channel: "chrome" }),
      headless: true,
    });
  } catch {
    return chromium.launch({ headless: true });
  }
}

export async function collectUnibetPilotSample({
  sourceUrls = parseSourceUrls(process.env.UNIBET_PILOT_URLS || process.env.UNIBET_PILOT_URL),
  sourceUrl,
  timeoutMs = DEFAULT_UNIBET_PILOT_TIMEOUT_MS,
} = {}) {
  const urls = parseSourceUrls(sourceUrl || sourceUrls);
  const resolvedUrls = urls.length ? urls : DEFAULT_UNIBET_PILOT_URLS;
  const browser = await launchBrowser();
  let context = null;
  try {
    context = typeof browser.newContext === "function" ? await browser.newContext() : null;
    const results = await Promise.all(
      resolvedUrls.map(async (url) => {
        let page = null;
        try {
          page = await createConfiguredPage(browser, context);
          const rows = await collectRows(page, url, timeoutMs);
          return { url, rows };
        } catch (error) {
          return {
            url,
            error: String(error instanceof Error ? error.message : error).slice(0, 160),
          };
        } finally {
          await page?.close();
        }
      })
    );

    const successfulResults = results.filter((result) => Array.isArray(result.rows));
    const rows = successfulResults.flatMap((result) => result.rows);
    const successfulUrls = successfulResults.map((result) => result.url);
    const failedSources = results
      .filter((result) => result.error)
      .map(({ url, error }) => ({ url, error }));

    const sample = createUnibetPilotSample({ rows, sourceUrls: successfulUrls });
    sample.failedSources = failedSources;
    return sample;
  } finally {
    await context?.close();
    await browser.close();
  }
}
