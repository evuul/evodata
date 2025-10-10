// src/app/api/casinoscores/cron-batch/route.js
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

import { saveSample, getLatestSample } from "@/lib/csStore";

const SECRET = process.env.CASINOSCORES_CRON_SECRET || "";
const BASE = "https://casinoscores.com";

// Hur länge en mätpunkt räknas som "färsk"
const TTL_MS = 9 * 60 * 1000;

// Hur många sidor vi kör parallellt (kan styras via query ?batchSize=2)
const DEFAULT_BATCH_SIZE = 3;
// Max antal slugs per körning (kan styras via query ?limit=4)
const DEFAULT_LIMIT = Infinity;

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

function parsePlayersFromText(text) {
  if (typeof text !== "string") return null;
  const cleaned = text.replace(/[^\d]/g, "");
  if (!cleaned) return null;
  const n = parseInt(cleaned, 10);
  return Number.isFinite(n) ? n : null;
}

// Samma parser som i [game]-routen (förenklad för fall-back från rå HTML)
function extractPlayersFromHTML(html) {
  if (typeof html !== "string" || !html) return null;
  // 1) Försök fånga texten i kända element
  const idMatch = html.match(/id=["']playersCounter["'][^>]*>([\s\S]*?)<\/\s*div\s*>/i);
  if (idMatch) {
    const n = parseInt(idMatch[1].replace(/[^\d]/g, ""), 10);
    if (Number.isFinite(n)) return n;
  }
  const dtidMatch = html.match(/data-testid=["']player-counter["'][^>]*>([\s\S]*?)<\/\s*div\s*>/i);
  if (dtidMatch) {
    const n = parseInt(dtidMatch[1].replace(/[^\d]/g, ""), 10);
    if (Number.isFinite(n)) return n;
  }
  // 2) Ta bort script/style och plocka första "NNNN players"
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  const m = text.match(/([\d\s.,\u00A0]{1,12})\s*players/i);
  if (m) {
    const n = parseInt(m[1].replace(/[^\d]/g, ""), 10);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

const SELECTOR = '#playersCounter, [data-testid="player-counter"]';

/** Robust läsning: vänta på siffror, scanna kandidater, fall back till page.content() */
async function readPlayersOnPage(page) {
  // 1) Vänta upp till 12s på att kända element innehåller siffror
  try {
    const value = await page.waitForFunction(
      (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const txt = (el.textContent || "").trim();
        const d = (txt || "").replace(/[^\d]/g, "");
        if (!d) return null;
        const n = parseInt(d, 10);
        return Number.isFinite(n) ? n : null;
      },
      { timeout: 12000 },
      SELECTOR
    );
    const n = await value.jsonValue();
    if (Number.isFinite(n)) return n;
  } catch {
    // fortsätt till nästa strategi
  }

  // 2) Scanna flera kandidater direkt i DOM
  try {
    const n = await page.evaluate(() => {
      function pickNum(s) {
        if (!s) return null;
        const d = s.replace(/[^\d]/g, "");
        if (!d) return null;
        const v = parseInt(d, 10);
        return Number.isFinite(v) ? v : null;
      }

      const selectors = [
        '#playersCounter',
        '[data-testid="player-counter"]',
        '[class*="player"]',
        '[class*="counter"]',
        '[class*="players"]',
      ];

      for (const sel of selectors) {
        const nodes = Array.from(document.querySelectorAll(sel));
        for (const el of nodes) {
          const n = pickNum((el.textContent || "").trim());
          if (Number.isFinite(n)) return n;
        }
      }

      // Som sista försök: leta efter textnoder med ordet "players"
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const t = node.nodeValue || "";
        if (/players/i.test(t)) {
          const n = pickNum(t);
          if (Number.isFinite(n)) return n;
        }
      }

      return null;
    });
    if (Number.isFinite(n)) return n;
  } catch {
    // fortsätt till fallback
  }

  // 3) Fallback: page.content() → HTML-parser
  try {
    const html = await page.content();
    const n = extractPlayersFromHTML(html);
    if (Number.isFinite(n)) return n;
  } catch {}

  return null;
}

/** Skrapa EN slug på en redan skapad sida (ingen interception här inne!) */
async function scrapeOne(page, id) {
  const started = Date.now();
  const [slug, variant] = id.split(":");
  const url = `${BASE}/${slug}/`;

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });

    // Cookie-knapp (best effort)
    try {
      const buttonXPath =
        "//button[contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'allow') or contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'accept')]";
      const [btn] = await page.$x(buttonXPath);
      if (btn) await btn.click({ delay: 40 });
    } catch {}

    // Variant A-omslag om efterfrågat
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
        if (toggled) {
          await page.waitForTimeout(350);
        }
      } catch {}
    }

    // → robust läsning
    const n = await readPlayersOnPage(page);
    const ok = Number.isFinite(n);
    if (!ok) {
      return {
        id, ok: false, players: null, fetchedAt: null,
        error: "No numeric player count found",
        durationMs: Date.now() - started
      };
    }

    const seriesKey = `${slug}${variant === "a" ? ":a" : ""}`;
    const tsIso = new Date().toISOString();
    try { await saveSample(seriesKey, tsIso, n); } catch {}

    return {
      id, ok: true, players: n, fetchedAt: tsIso,
      durationMs: Date.now() - started
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

/** Vercel (puppeteer-core + @sparticuz/chromium) med requestInterception */
async function runOnVercel(staleIds, batchSize) {
  const [{ default: chromium }, puppeteerModule] = await Promise.all([
    import("@sparticuz/chromium"),
    import("puppeteer-core"),
  ]);
  const puppeteer = puppeteerModule.default || puppeteerModule;

  const browser = await puppeteer.launch({
    args: [
      ...chromium.args,
      "--lang=sv-SE",
      "--disable-blink-features=AutomationControlled"
    ],
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

      await Promise.all(
        pages.map(async (page) => {
          // Liten stealth: maskera webdriver-flaggan
          await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, "webdriver", { get: () => undefined });
          });
          // Header + UA
          await page.setExtraHTTPHeaders({ "Accept-Language": "sv-SE,sv;q=0.9,en;q=0.8" });
          await page.setUserAgent(
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36"
          );
          // Blockera tunga resurser
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
  const limit = Math.max(1, Number(url.searchParams.get("limit")) || DEFAULT_LIMIT);
  const batchSize = Math.max(1, Number(url.searchParams.get("batchSize")) || DEFAULT_BATCH_SIZE);

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
  const staleIdsAll = staleCheck.filter((x) => !x.fresh).map((x) => x.id);
  const staleIds = staleIdsAll.slice(0, limit); // respektera ev. ?limit=

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

  // 3) Skrapa bara stale
  const results = await (process.env.VERCEL
    ? runOnVercel(staleIds, batchSize)
    : runLocally(staleIds, batchSize));

  // 4) Svar + inkludera fresh-skips
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
    meta: { batchSize, limit, deadlineMs: 22000 },
  });
}

export async function POST(req) {
  return GET(req);
}