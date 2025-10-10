// src/app/api/casinoscores/cron-batch/route.js
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

import { saveSample, getLatestSample } from "@/lib/csStore";

const SECRET = process.env.CASINOSCORES_CRON_SECRET || "";
const BASE = "https://casinoscores.com";

// hur länge en mätpunkt räknas som "färsk"
const TTL_MS = 9 * 60 * 1000;

// default: hur många sidor i parallell
const DEFAULT_BATCH_SIZE = 3;

// hård tidsbudget (ms) för en körning, lämna lite marginal till Vercels 30s
const DEADLINE_MS = 22_000;

const SLUGS = [
  "crazy-time",
  // "crazy-time:a", // fortsatt avstängd
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

function parsePlayersFromText(text) {
  if (typeof text !== "string") return null;
  const cleaned = text.replace(/[^\d]/g, "");
  if (!cleaned) return null;
  const n = parseInt(cleaned, 10);
  return Number.isFinite(n) ? n : null;
}

const SELECTOR = '#playersCounter, [data-testid="player-counter"]';

// ---- EN slug på en existerande page ----
async function scrapeOne(page, id) {
  const started = Date.now();
  const [slug, variant] = id.split(":");
  const url = `${BASE}/${slug}/`;

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15_000 });

    // Cookie-knapp (best effort)
    try {
      const buttonXPath =
        "//button[contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'allow') or contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'accept')]";
      const [btn] = await page.$x(buttonXPath);
      if (btn) await btn.click({ delay: 30 });
    } catch {}

    // Variant A om efterfrågat
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
        if (toggled) await page.waitForTimeout(250);
      } catch {}
    }

    // kortare selector-timeout så vi inte bränner budgeten när sidan krånglar
    await page.waitForSelector(SELECTOR, { timeout: 4_000 }).catch(() => {});
    const handle = await page.$(SELECTOR);
    const txt = handle ? await page.evaluate((el) => (el.textContent || "").trim(), handle) : "";
    if (handle) { try { await handle.dispose(); } catch {} }

    const n = parsePlayersFromText(txt);
    const ok = Number.isFinite(n);
    if (!ok) {
      return {
        id, ok: false, players: null, fetchedAt: null,
        error: "No numeric player count found", durationMs: Date.now() - started
      };
    }

    const seriesKey = `${slug}${variant === "a" ? ":a" : ""}`;
    const tsIso = new Date().toISOString();
    try { await saveSample(seriesKey, tsIso, n); } catch {}

    return { id, ok: true, players: n, fetchedAt: tsIso, durationMs: Date.now() - started };
  } catch (error) {
    return {
      id, ok: false, players: null, fetchedAt: null,
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - started,
    };
  }
}

// ---- Vercel (puppeteer-core + @sparticuz/chromium) ----
async function runOnVercel(staleIds, batchSize, deadlineAt) {
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
      if (Date.now() > deadlineAt) break; // hårt avbrott

      const chunk = staleIds.slice(i, i + batchSize);
      const pages = await Promise.all(chunk.map(() => browser.newPage()));

      // blockera tunga resurser
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

// ---- Lokalt (Playwright) ----
async function runLocally(staleIds, batchSize, deadlineAt) {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });

  const out = [];
  try {
    for (let i = 0; i < staleIds.length; i += batchSize) {
      if (Date.now() > deadlineAt) break; // hårt avbrott

      const chunk = staleIds.slice(i, i + batchSize);
      const pages = await Promise.all(chunk.map(() => browser.newPage()));

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

export async function GET(req) {
  if (!okAuth(req)) return resJSON({ ok: false, error: "Unauthorized" }, 401);

  const url = new URL(req.url);
  const limitParam = url.searchParams.get("limit");
  const batchParam = url.searchParams.get("batchSize");
  const engineParam = (url.searchParams.get("engine") || "").toLowerCase(); // "puppeteer"|"playwright"|""

  const limit = Math.max(0, Math.min(SLUGS.length, Number(limitParam) || SLUGS.length));
  const batchSize = Math.max(1, Math.min(6, Number(batchParam) || DEFAULT_BATCH_SIZE));
  const deadlineAt = Date.now() + DEADLINE_MS;

  // 1) vilka slugs är stale?
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

  // begränsa mängden per körning
  if (limit && staleIds.length > limit) staleIds = staleIds.slice(0, limit);

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
    });
  }

  // 2) skrapa bara stale, med tidsbudget
  const run =
    process.env.VERCEL || engineParam === "puppeteer"
      ? runOnVercel
      : runLocally;

  const results = await run(staleIds, batchSize, deadlineAt);

  // 3) bygg svar + inkludera fresh-skips
  const byId = new Map(results.map((r) => [r.id, r]));
  const merged = SLUGS.map((id) => {
    if (byId.has(id)) return byId.get(id);
    const probe = staleCheck.find((x) => x.id === id);
    if (probe?.fresh) return { id, ok: true, players: null, fetchedAt: null, status: "fresh-cache" };
    return { id, ok: false, players: null, fetchedAt: null, status: "no-sample" };
  });

  const fetched = results.filter((r) => r.ok).length;

  return resJSON({
    ok: fetched === staleIds.length, // blir false om vi slog i deadline (det är okej)
    fetched,
    total: SLUGS.length,
    staleTried: staleIds.length,
    skippedFresh: freshList.length,
    results: merged,
    ts: new Date().toISOString(),
    meta: { batchSize, limit, deadlineMs: DEADLINE_MS },
  });
}

export async function POST(req) {
  return GET(req);
}