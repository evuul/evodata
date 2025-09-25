// src/app/api/casinoscores/players/[game]/route.js
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

import { saveSample } from "@/lib/csStore";

// Endast bas-slugs här (utan :a). A styrs via ?variant=a.
const ALLOWED = new Set([
  "crazy-time",
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
]);

const BASE = "https://casinoscores.com";
const TTL_MS = 9 * 60 * 1000;

const g = globalThis;
g.__CS_CACHE__ ??= new Map(); // key: `${slug}:${variant}` -> { ts, data, etag }

function resJSON(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extra,
    },
  });
}

function makeEtag(obj) {
  const s = JSON.stringify(obj);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return `W/"${h.toString(16)}"`;
}

// ---------- Plain fetch ----------
function extractPlayersFromHTML(html) {
  // 1) Exakta element
  const idMatch = html.match(/id=["']playersCounter["'][^>]*>([\s\S]*?)<\/\s*div\s*>/i);
  if (idMatch) {
    const n = parseInt(idMatch[1].replace(/[^\d]/g, ""), 10);
    if (Number.isFinite(n)) return { players: n, via: "plain:id" };
  }
  const dtidMatch = html.match(/data-testid=["']player-counter["'][^>]*>([\s\S]*?)<\/\s*div\s*>/i);
  if (dtidMatch) {
    const n = parseInt(dtidMatch[1].replace(/[^\d]/g, ""), 10);
    if (Number.isFinite(n)) return { players: n, via: "plain:data-testid" };
  }
  // 2) Rensa och leta efter “NNN players”
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  const m = text.match(/([\d\s.,\u00A0]{1,12})\s*players/i);
  if (m) {
    const n = parseInt(m[1].replace(/[^\d]/g, ""), 10);
    if (Number.isFinite(n)) return { players: n, via: "plain:players-word" };
  }
  return { players: null, via: "plain:none" };
}

async function plainFetch(url) {
  const r = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari",
      "Accept-Language": "sv-SE,sv;q=0.9,en;q=0.8",
      "Accept": "text/html,application/xhtml+xml",
      "Referer": "https://www.google.com/",
    },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return await r.text();
}

// ---------- Puppeteer fallback (fungerar på Vercel) ----------
async function tryPuppeteer({ url, variant }) {
  try {
    const chromium = await import("@sparticuz/chromium");
    const puppeteer = await import("puppeteer-core");

    const execPath = await chromium.executablePath();

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: execPath,
      headless: chromium.headless, // true på Vercel
    });

    const page = await browser.newPage();

    // Trimma bandbredd: blocka tunga resurser
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const type = req.resourceType();
      if (["image", "media", "font", "stylesheet"].includes(type)) return req.abort();
      req.continue();
    });

    await page.setExtraHTTPHeaders({ "Accept-Language": "sv-SE,sv;q=0.9,en;q=0.8" });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Stäng eventuella cookie/popups snabbt (best-effort)
    try {
      const allowBtn = await page.$('button:has-text("Allow"), button:has-text("Accept")');
      if (allowBtn) await allowBtn.click({ delay: 10 }).catch(() => {});
    } catch {}

    const SELECTOR = '#playersCounter, [data-testid="player-counter"]';

    // Crazy Time A kräver klick på variant
    if (variant === "a") {
      // Försök klicka på “Crazy Time A”
      const clicks = [
        'button:has-text("Crazy Time A")',
        'a:has-text("Crazy Time A")',
        '[role="tab"]:has-text("Crazy Time A")',
        'text/Crazy\\s*Time\\s*A/i',
      ];
      let done = false;
      for (const sel of clicks) {
        try {
          const locator = await page.$(sel);
          if (locator) {
            await locator.click({ delay: 10 });
            done = true;
            break;
          }
        } catch {}
      }
      // liten väntan så siffran hinner ändras
      await page.waitForTimeout(600);
    }

    // Läs counter
    await page.waitForSelector(SELECTOR, { timeout: 8000 }).catch(() => {});
    const txt =
      (await page.$eval(SELECTOR, (el) => (el.textContent || "").trim()).catch(() => "")) || "";

    let players = parseInt(txt.replace(/[^\d]/g, ""), 10);

    // Om fortfarande NaN → försök från bodyText
    if (!Number.isFinite(players)) {
      const bodyText = await page.evaluate(() => document.body?.innerText || "");
      const m = bodyText.match(/([\d][\d\s,.]{2,})\s*players/i);
      if (m) {
        const n = parseInt(m[1].replace(/[^\d]/g, ""), 10);
        if (Number.isFinite(n)) players = n;
      }
    }

    await browser.close();
    return { players: Number.isFinite(players) ? players : null, via: `puppeteer${variant === "a" ? ":a" : ""}` };
  } catch (e) {
    console.warn("[CS] puppeteer failed:", e?.message || e);
    return { players: null, via: "puppeteer-failed" };
  }
}

// ---------- Route ----------
export async function GET(req, ctx) {
  try {
    // Vänta in params för Next 15
    const paramsMaybe = ctx?.params;
    const params =
      paramsMaybe && typeof paramsMaybe.then === "function" ? await paramsMaybe : paramsMaybe || {};
    const slug = params.game;

    if (!slug || !ALLOWED.has(slug)) {
      return resJSON({ ok: false, error: "Unknown or disallowed game slug" }, 400);
    }

    const { searchParams } = new URL(req.url);
    const variant = (searchParams.get("variant") || "").toLowerCase() === "a" ? "a" : "default";
    const force = searchParams.get("force") === "1";
    const debug = searchParams.get("debug") === "1";
    const url = `${BASE}/${slug}/`;
    const cacheKey = `${slug}:${variant}`;

    // Cache per variant
    const entry = g.__CS_CACHE__.get(cacheKey);
    const now = Date.now();
    if (!force && entry && now - entry.ts < TTL_MS && !debug) {
      const inm = req.headers.get("if-none-match");
      if (inm && inm === entry.etag) return new Response(null, { status: 304, headers: { ETag: entry.etag } });
      return resJSON({ ok: true, source: "cache", ...entry.data }, 200, { ETag: entry.etag });
    }

    let players = null;
    let via = "unknown";

    // 1) Försök billig plain fetch först (gäller även ice-fishing m.fl.)
    try {
      const html = await plainFetch(url);
      const plain = extractPlayersFromHTML(html);
      players = plain.players;
      via = plain.via;
    } catch {
      via = "plain:error";
    }

    // 2) Om vi inte hittade siffra – kör puppeteer (funkar på Vercel)
    if (!Number.isFinite(players)) {
      const pp = await tryPuppeteer({ url, variant });
      players = pp.players;
      via = pp.via;
    }

    if (debug) {
      return resJSON({
        ok: Number.isFinite(players),
        slug,
        variant,
        via,
        players: Number.isFinite(players) ? players : null,
      });
    }

    if (!Number.isFinite(players)) {
      // 503 om vi fortfarande inte får fram något
      return resJSON({ ok: false, error: "Hittade inte players", slug, variant, via }, 503, {
        "Retry-After": "60",
      });
    }

    const data = {
      slug,
      variant,
      players,
      fetchedAt: new Date().toISOString(),
    };

    // Persist i timeseries: “crazy-time” resp. “crazy-time:a”
    const seriesKey = `${slug}${variant === "a" ? ":a" : ""}`;
    try {
      await saveSample(seriesKey, data.fetchedAt, players);
    } catch {}

    const etag = makeEtag(data);
    g.__CS_CACHE__.set(cacheKey, { ts: Date.now(), data, etag });

    return resJSON({ ok: true, ...data }, 200, { ETag: etag });
  } catch (err) {
    console.error("[CS] 500:", err?.message || err);
    return resJSON({ ok: false, error: err?.message || String(err) }, 500);
  }
}