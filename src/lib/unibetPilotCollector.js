// Collects Evolution game counts from Unibet in an isolated headless-browser session.

import { createUnibetPilotSample } from "./unibetPilot.js";
import { existsSync } from "node:fs";

export const DEFAULT_UNIBET_PILOT_URL = "https://www.unibet.mt/livecasino/gameshows";

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
  sourceUrl = process.env.UNIBET_PILOT_URL || DEFAULT_UNIBET_PILOT_URL,
  timeoutMs = 25_000,
} = {}) {
  const browser = await launchBrowser();
  let context = null;
  try {
    context = typeof browser.newContext === "function" ? await browser.newContext() : null;
    const page = context ? await context.newPage() : await browser.newPage();
    await page.setViewport?.({ width: 1440, height: 1000 });
    await page.setViewportSize?.({ width: 1440, height: 1000 });
    await page.setUserAgent?.(
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131 Safari/537.36"
    );
    await page.goto(sourceUrl, { waitUntil: "domcontentloaded", timeout: timeoutMs });
    await page.waitForSelector('[data-test-name="game-tile"]', { timeout: timeoutMs });
    await page.waitForFunction(
      () => document.querySelectorAll('[data-test-name="player-activity-tag"] span').length >= 3,
      { timeout: timeoutMs }
    );

    const rows = await page.$$eval('[data-test-name="game-tile"]', (tiles) =>
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

    return createUnibetPilotSample({ rows, sourceUrl });
  } finally {
    await context?.close();
    await browser.close();
  }
}
