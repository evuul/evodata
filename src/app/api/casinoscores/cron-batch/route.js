// src/app/api/casinoscores/cron-batch/route.js
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

import { saveSample, getLatestSample } from "@/lib/csStore";

const SECRET = process.env.CASINOSCORES_CRON_SECRET || "";
const BASE = "https://casinoscores.com";

// Hur länge en mätpunkt räknas som "färsk"
const TTL_MS = 9 * 60 * 1000;

// Default hur många sidor vi kör parallellt (kan överstyras via ?batchSize=)
const DEFAULT_BATCH_SIZE = 2;
const MAX_BATCH_SIZE = 4;

// OBS: vi ignorerar "crazy-time:a" just nu
const SLUGS = [
  "crazy-time",
  // "crazy-time:a",
  "monopoly-big-baller",
  "funky-time",
  "lightning-storm",
  "crazy-balls",
  "ice-fishing",
  "xxxtreme-lightning-roulette",
  "monopoly-live",
  "red-door-roulette",
  "auto-roulette",
  "speed-baccarat-a",
  "super-andar-bahar",
  "lightning-dice",
  "lightning-roulette",
  "bac-bo",
];

function resJSON(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function okAuth(req) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (token && SECRET && token === SECRET) return true;
  const authHeader = req.headers.get("authorization") || "";
  return SECRET && authHeader === `Bearer ${SECRET}`;
}

/* -------------------------------------------------------------------------- */
/*                          Robust parsing + sanity-check                      */
/* -------------------------------------------------------------------------- */

// Hårdare parser: läs bara siffror, släng bort extrema längder (skydd mot "exponent-skräp")
function parsePlayersFromTextStrict(text) {
  if (typeof text !== "string") return null;
  const digits = text.replace(/[^\d]/g, "");
  if (!digits) return null;

  // Max 6 siffror (< 1 000 000). Justera vid behov.
  if (digits.length > 6) return null;

  const n = Number.parseInt(digits, 10);
  if (!Number.isFinite(n)) return null;
  return n;
}

// Rimlighetsintervall — justera efter din erfarenhet
const MIN_REASONABLE = 50;       // Sätt lägre om du vill tillåta pyttelåga bord
const MAX_REASONABLE = 100000;   // Inga bord ska ligga i hundratusental

function isReasonable(n) {
  if (!Number.isFinite(n)) return false;
  if (n <= 0) return false;
  if (n > MAX_REASONABLE) return false;
  if (n < MIN_REASONABLE) return false;
  return true;
}

// Selector för räknaren
const SELECTOR = '#playersCounter, [data-testid="player-counter"]';

/**
 * Läs “stabil” siffra: samma rimliga tal två gånger i rad.
 * Vi läser all text i counter-elementet (inkl. när varje siffra ligger i egen <span>).
 */
async function readStablePlayers(page, attempts = 8, delayMs = 250) {
  let prev = null;

  for (let i = 0; i < attempts; i++) {
    // Säkerställ att elementet finns
    try {
      await page.waitForSelector(SELECTOR, { timeout: 6000 });
    } catch {
      // prova igen
    }

    const current = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;

      // Ta alla textnoder under elementet
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let s = "";
      let node;
      while ((node = walker.nextNode())) {
        if (node.nodeValue) s += node.nodeValue;
      }
      return s;
    }, SELECTOR);

    const parsed = parsePlayersFromTextStrict(current || "");

    // Stabilt om samma som förra och rimligt
    if (parsed != null && parsed === prev && isReasonable(parsed)) {
      return parsed;
    }

    prev = parsed;
    await page.waitForTimeout(delayMs);
  }

  // Sista chans: returnera bara om rimligt
  return isReasonable(prev) ? prev : null;
}

/**
 * Skrapa EN slug på en redan skapad sida (ingen interception sätts här inne).
 * Sparar ENDAST om vi lyckas läsa ett stabilt & rimligt värde.
 */
async function scrapeOne(page, id) {
  const started = Date.now();
  const [slug, variant] = id.split(":");
  const url = `${BASE}/${slug}/`;

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });

    // Cookie-knapp (best effort)
    try {
      const buttonXPath =
        "//button[contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'allow') or " +
        "contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'accept')]";
      const [btn] = await page.$x(buttonXPath);
      if (btn) await btn.click({ delay: 40 });
    } catch {}

    // Variant A (om du aktiverar den i SLUGS senare)
    if (variant === "a") {
      try {
        const toggled = await page.evaluate(() => {
          const s = document.querySelector('[data-testid="crazytime-a-switch"]');
          if (!s) return false;
          const second = s.querySelector(':scope > div:nth-child(2)');
          if (!second) return false;
          second.click();
          return true;
        });
        if (toggled) await page.waitForTimeout(350);
      } catch {}
    }

    // Läs stabil siffra
    const n = await readStablePlayers(page, 8, 250);

    if (!Number.isFinite(n)) {
      return {
        id,
        ok: false,
        players: null,
        fetchedAt: null,
        error: "No stable/valid numeric player count found",
        durationMs: Date.now() - started,
      };
    }

    // Dubbelkolla rimlighet
    if (!isReasonable(n)) {
      return {
        id,
        ok: false,
        players: null,
        fetchedAt: null,
        error: `Unreasonable value ${n}`,
        durationMs: Date.now() - started,
      };
    }

    // Spara
    const seriesKey = `${slug}${variant === "a" ? ":a" : ""}`;
    const tsIso = new Date().toISOString();
    try { await saveSample(seriesKey, tsIso, n); } catch {}

    return {
      id,
      ok: true,
      players: n,
      fetchedAt: tsIso,
      durationMs: Date.now() - started,
    };
  } catch (error) {
    return {
      id,
      ok: false,
      players: null,
      fetchedAt: null,
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - started,
    };
  }
}

/* -------------------------------------------------------------------------- */
/*                         Motorer: Vercel / Lokalt                            */
/* -------------------------------------------------------------------------- */

/** Vercel (puppeteer-core + @sparticuz/chromium) med requestInterception */
async function runOnVercel(staleIds, batchSize) {
  const [{ default: chromium }, puppeteerModule] = await Promise.all([
    import("@sparticuz/chromium"),
    import("puppeteer-core"),
  ]);
  const puppeteer = puppeteerModule.default || puppeteerModule;

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
    ignoreHTTPSErrors: true,
  });

  const out = [];
  try {
    for (let i = 0; i < staleIds.length; i += batchSize) {
      const chunk = staleIds.slice(i, i + batchSize);
      const pages = await Promise.all(chunk.map(() => browser.newPage()));

      // Blockera tunga resurser
      await Promise.all(
        pages.map(async (page) => {
          await page.setExtraHTTPHeaders({ "Accept-Language": "sv-SE,sv;q=0.9,en;q=0.8" });
          await page.setUserAgent(
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36"
          );
          await page.setRequestInterception(true);
          page.on("request", (req) => {
            const type = req.resourceType();
            if (["image", "media", "font", "stylesheet"].includes(type)) req.abort();
            else req.continue();
          });
        })
      );

      try {
        const results = await Promise.all(
          pages.map((page, idx) =>
            scrapeOne(page, chunk[idx]).finally(() => page.close().catch(() => {}))
          )
        );
        out.push(...results);
      } finally {
        await Promise.all(pages.map((p) => (p.isClosed?.() ? null : p.close().catch(() => {}))));
      }
    }
  } finally {
    await browser.close();
  }
  return out;
}

/** Lokalt (Playwright) med page.route */
async function runLocally(staleIds, batchSize) {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });

  const out = [];
  try {
    for (let i = 0; i < staleIds.length; i += batchSize) {
      const chunk = staleIds.slice(i, i + batchSize);
      const pages = await Promise.all(chunk.map(() => browser.newPage()));

      // Blockera tunga resurser
      await Promise.all(
        pages.map(async (page) => {
          await page.route("**/*", (route) => {
            const t = route.request().resourceType();
            if (["image", "media", "font", "stylesheet"].includes(t)) return route.abort();
            route.continue();
          });
          await page.setExtraHTTPHeaders({ "Accept-Language": "sv-SE,sv;q=0.9,en;q=0.8" });
        })
      );

      try {
        const results = await Promise.all(
          pages.map((page, idx) =>
            scrapeOne(page, chunk[idx]).finally(() => page.close().catch(() => {}))
          )
        );
        out.push(...results);
      } finally {
        await Promise.all(pages.map((p) => (p.isClosed?.() ? null : p.close().catch(() => {}))));
      }
    }
  } finally {
    await browser.close();
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/*                                   Route                                     */
/* -------------------------------------------------------------------------- */

export async function GET(req) {
  if (!okAuth(req)) return resJSON({ ok: false, error: "Unauthorized" }, 401);

  const url = new URL(req.url);
  // tillåt begränsning för test / undvika timeouts
  const limitParam = url.searchParams.get("limit");
  const batchSizeParam = url.searchParams.get("batchSize");

  const batchSize = Math.max(
    1,
    Math.min(MAX_BATCH_SIZE, Number.parseInt(batchSizeParam || String(DEFAULT_BATCH_SIZE), 10) || DEFAULT_BATCH_SIZE)
  );

  // 1) Hitta vilka slugs som är stale
  const now = Date.now();
  const staleCheck = await Promise.all(
    SLUGS.map(async (id) => {
      const latest = await getLatestSample(id).catch(() => null);
      if (!latest) return { id, fresh: false, reason: "no-sample" };
      const fresh = now - latest.ts < TTL_MS;
      return { id, fresh, reason: fresh ? "fresh-cache" : "stale" };
    })
  );

  const freshList = staleCheck.filter((x) => x.fresh);
  let staleIds = staleCheck.filter((x) => !x.fresh).map((x) => x.id);

  // Begränsa antal stale att köra (för att undvika timeout), om angivet
  const limit = Number.isFinite(Number(limitParam)) ? Number(limitParam) : undefined;
  if (limit && limit > 0) staleIds = staleIds.slice(0, limit);

  if (staleIds.length === 0) {
    return resJSON({
      ok: true,
      fetched: 0,
      total: SLUGS.length,
      skippedFresh: freshList.length,
      results: staleCheck.map((x) =>
        x.fresh
          ? { id: x.id, ok: true, players: null, fetchedAt: null, status: "fresh-cache" }
          : { id: x.id, ok: true, players: null, fetchedAt: null, status: "no-sample" }
      ),
      ts: new Date().toISOString(),
      meta: { batchSize, limit: limit || null },
    });
  }

  // 2) Skrapa bara stale
  const results = await (process.env.VERCEL
    ? runOnVercel(staleIds, batchSize)
    : runLocally(staleIds, batchSize));

  // 3) Svar + inkludera fresh-skips
  const byId = new Map(results.map((r) => [r.id, r]));
  const merged = SLUGS.map((id) => {
    if (byId.has(id)) return byId.get(id);
    const probe = staleCheck.find((x) => x.id === id);
    if (probe?.fresh) return { id, ok: true, players: null, fetchedAt: null, status: "fresh-cache" };
    return { id, ok: false, players: null, fetchedAt: null, status: "no-sample" };
  });

  const fetched = results.filter((r) => r.ok).length;

  return resJSON({
    ok: fetched === staleIds.length,
    fetched,
    total: SLUGS.length,
    staleTried: staleIds.length,
    skippedFresh: freshList.length,
    results: merged,
    ts: new Date().toISOString(),
    meta: { batchSize, limit: limit || null },
  });
}

export async function POST(req) {
  return GET(req);
}