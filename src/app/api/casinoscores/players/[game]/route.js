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

// ---------- Plain fetch (för default-varianten) ----------
function extractPlayersFromHTML(html) {
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
      Accept: "text/html,application/xhtml+xml",
      Referer: "https://www.google.com/",
    },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return await r.text();
}

// ---------- Playwright (behövs för variant=a) ----------
async function tryPlaywright({ url, variant }) {
  // Kör inte Playwright i Vercel
  if (process.env.VERCEL) return { players: null, via: "playwright-skip-vercel" };

  try {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Trimma nätverk
    await page.route("**/*", (route) => {
      const t = route.request().resourceType();
      if (["image", "media", "font", "stylesheet"].includes(t)) return route.abort();
      route.continue();
    });
    await page.setExtraHTTPHeaders({ "Accept-Language": "sv-SE,sv;q=0.9,en;q=0.8" });

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Cookie-knapp ibland
    try {
      const btn = page.getByRole("button", { name: /allow|accept/i });
      if (await btn.isVisible({ timeout: 1500 })) await btn.click({ timeout: 1500 });
    } catch {}

    // Hjälpare: hämta nuvarande players
    const SELECTOR = '#playersCounter, [data-testid="player-counter"]';
    async function getCount() {
      try {
        const txt = await page.$eval(SELECTOR, (el) => (el.textContent || "").trim());
        const n = parseInt((txt || "").replace(/[^\d]/g, ""), 10);
        return Number.isFinite(n) ? n : null;
      } catch {
        return null;
      }
    }

    // Om A-variant: klicka på fliken/knappen och vänta på ändring
    if (variant === "a") {
      const before = await getCount();

      // 1) Klick-försök med flera selektorer
      const tries = [
        'button:has-text("Crazy Time A")',
        'a:has-text("Crazy Time A")',
        '[role="tab"]:has-text("Crazy Time A")',
        '//*[self::button or self::a or @role="tab" or @role="button"][contains(normalize-space(.), "Crazy Time A")]',
        'text=/^\\s*Crazy\\s*Time\\s*A\\s*$/i',
      ];

      let clicked = false;
      for (const sel of tries) {
        try {
          const loc = sel.startsWith("//") ? page.locator(`xpath=${sel}`) : page.locator(sel);
          if (await loc.first().isVisible({ timeout: 1500 })) {
            await loc.first().click({ timeout: 2000 });
            clicked = true;
            break;
          }
        } catch {}
      }

      // 2) Sista utväg: hitta textnod och klicka närmsta klickbara förälder
      if (!clicked) {
        try {
          const handle = await page.evaluateHandle(() => {
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
            let node;
            while ((node = walker.nextNode())) {
              if (node.nodeValue && /crazy\s*time\s*a/i.test(node.nodeValue)) {
                let el = node.parentElement;
                while (el && el !== document.body) {
                  if (
                    el.matches(
                      'button,a,[role="button"],[role="tab"],.MuiTab-root,.tab,[class*="tab"],[class*="TwTab"]'
                    )
                  )
                    return el;
                  el = el.parentElement;
                }
              }
            }
            return null;
          });
          if (handle) {
            await handle.asElement().click();
            clicked = true;
          }
        } catch {}
      }

      // 3) Vänta på att fliken faktiskt blir aktiv eller att räknaren ändras
      if (clicked) {
        // Liten paus så UI hinner byta
        await page.waitForTimeout(500);

        // vänta på aria-selected eller class=.active nära “Crazy Time A”
        await Promise.race([
          page
            .locator(':is([aria-selected="true"], .active):has-text("Crazy Time A")')
            .first()
            .waitFor({ timeout: 2000 })
            .catch(() => {}),
          (async () => {
            // vänta på att siffra byts
            const target = await getCount();
            if (target !== null && before !== null && target === before) {
              await page.waitForTimeout(1000);
            }
          })(),
        ]);
      }
    }

    // Läs räknaren (oavsett variant)
    await page.waitForSelector(SELECTOR, { timeout: 8000 });
    const afterTxt = await page.$eval(SELECTOR, (el) => (el.textContent || "").trim());
    const players = parseInt((afterTxt || "").replace(/[^\d]/g, ""), 10);

    await browser.close();
    return {
      players: Number.isFinite(players) ? players : null,
      via: variant === "a" ? "playwright:a" : "playwright",
    };
  } catch (e) {
    return { players: null, via: "playwright-failed" };
  }
}

// ---------- Route ----------
export async function GET(req, ctx) {
  try {
    // Vänta in params i dynamiska API:er
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

    if (variant === "default") {
      // För standard-varianten: försök plain först (billigt)
      try {
        const html = await plainFetch(url);
        const plain = extractPlayersFromHTML(html);
        players = plain.players;
        via = plain.via;
      } catch {
        via = "plain:error";
      }
      if (!Number.isFinite(players)) {
        const pw = await tryPlaywright({ url, variant });
        players = pw.players;
        via = pw.via;
      }
    } else {
      // För A-variant: gå direkt på Playwright (måste klicka)
      const pw = await tryPlaywright({ url, variant: "a" });
      players = pw.players;
      via = pw.via;
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

    // Persist: spara under "crazy-time" resp. "crazy-time:a"
    const seriesKey = `${slug}${variant === "a" ? ":a" : ""}`;
    try {
      await saveSample(seriesKey, data.fetchedAt, players);
    } catch {}

    const etag = makeEtag(data);
    g.__CS_CACHE__.set(cacheKey, { ts: Date.now(), data, etag });

    return resJSON({ ok: true, ...data }, 200, { ETag: etag });
  } catch (err) {
    return resJSON({ ok: false, error: err?.message || String(err) }, 500);
  }
}