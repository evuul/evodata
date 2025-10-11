// src/app/api/casinoscores/players/[game]/route.js
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

import { saveSample, getLatestSample, normalizePlayers } from "@/lib/csStore";

// Endast bas-slugs här (utan :a). A styrs via ?variant=a.
export const ALLOWED_SLUGS = [
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
];

const ALLOWED = new Set(ALLOWED_SLUGS);

const BASE = "https://casinoscores.com";
const TTL_MS = 30 * 1000;

const LOBBY_API =
  "https://api.casinoscores.com/cg-neptune-notification-center/api/evolobby/playercount/latest";
const LOBBY_TTL_MS = 30 * 1000;

const g = globalThis;
g.__CS_CACHE__ ??= new Map(); // key: `${slug}:${variant}` -> { ts, data, etag }
g.__CS_LOBBY__ ??= { ts: 0, data: null };

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

const LOBBY_KEY_MAP = new Map([
  ["crazy-time", { default: "crazyTime", a: "crazyTimeA" }],
  ["monopoly-big-baller", "monopolyBigBallerLive"],
  ["funky-time", "funkyTime"],
  ["lightning-storm", "lightningStorm"],
  ["crazy-balls", "crazyBalls"],
  ["ice-fishing", "iceFishing"],
  ["xxxtreme-lightning-roulette", "xxxtremeLightningRoulette"],
  ["monopoly-live", "monopolyLive"],
  ["red-door-roulette", "redDoorRoulette"],
  ["auto-roulette", "autoRoulette"],
  ["speed-baccarat-a", "speedBaccaratA"],
  ["super-andar-bahar", "superAndarBahar"],
  ["lightning-dice", "lightningDice"],
  ["lightning-roulette", "lightningRoulette"],
  ["bac-bo", "bacBo"],
]);

function lobbyKeyFor(slug, variant) {
  const entry = LOBBY_KEY_MAP.get(slug);
  if (!entry) return null;
  if (typeof entry === "string") return entry;
  if (variant === "a" && entry.a) return entry.a;
  return entry.default ?? null;
}

async function fetchLobbyCounts(force = false) {
  const cache = g.__CS_LOBBY__;
  const now = Date.now();
  if (!force && cache.data && now - cache.ts < LOBBY_TTL_MS) {
    return cache.data;
  }

  const res = await fetch(LOBBY_API, {
    headers: {
      Accept: "application/json",
      "Accept-Language": "sv-SE,sv;q=0.9,en;q=0.8",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari",
      Referer: "https://casinoscores.com/",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Lobby HTTP ${res.status}`);
  }

  const data = await res.json();
  cache.ts = now;
  cache.data = data;
  return data;
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

function parsePlayersFromText(text) {
  if (typeof text !== "string") return null;
  const cleaned = text.replace(/[^\d]/g, "");
  if (!cleaned) return null;
  const parsed = parseInt(cleaned, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

async function waitForPlayerCount(page, selector, timeout = 15000) {
  try {
    const handle = await page.waitForFunction(
      (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const text = (el.textContent || "").trim();
        const digits = text.replace(/[^\d]/g, "");
        if (!digits) return null;
        const value = parseInt(digits, 10);
        return Number.isFinite(value) ? value : null;
      },
      { timeout },
      selector
    );
    const result = await handle.jsonValue();
    await handle.dispose().catch(() => {});
    return Number.isFinite(result) ? result : null;
  } catch {
    return null;
  }
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
        return parsePlayersFromText(txt);
      } catch {
        return null;
      }
    }

    async function clickCrazyTimeASwitch() {
      try {
        const clicked = await page.evaluate(() => {
          const switcher = document.querySelector('[data-testid="crazytime-a-switch"]');
          if (!switcher) return false;
          const second = switcher.querySelector(':scope > div:nth-child(2)');
          if (!second) return false;
          second.click();
          return true;
        });
        return !!clicked;
      } catch {
        return false;
      }
    }

    async function waitForCrazyTimeAActive() {
      await page
        .waitForFunction(
          () => {
            const switcher = document.querySelector('[data-testid="crazytime-a-switch"]');
            if (!switcher) return false;
            const second = switcher.querySelector(':scope > div:nth-child(2)');
            if (!second) return false;
            return second.classList.contains('tw:bg-cornflower');
          },
          undefined,
          { timeout: 3000 }
        )
        .catch(() => {});
    }

    // Om A-variant: toggla till Crazy Time A och vänta på att siffran uppdateras
    if (variant === "a") {
      const before = await getCount();
      let clicked = await clickCrazyTimeASwitch();

      if (!clicked) {
        // Fallback – försök gamla selektorer
        const tries = [
          'button:has-text("Crazy Time A")',
          'a:has-text("Crazy Time A")',
          '[role="tab"]:has-text("Crazy Time A")',
          '//*[self::button or self::a or @role="tab" or @role="button"][contains(normalize-space(.), "Crazy Time A")]',
          'text=/^\\s*Crazy\\s*Time\\s*A\\s*$/i',
        ];

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
      }

      if (clicked) {
        await waitForCrazyTimeAActive();
        if (Number.isFinite(before)) {
          await page
            .waitForFunction(
              ({ selector, prev }) => {
                const el = document.querySelector(selector);
                if (!el) return false;
                const txt = (el.textContent || '').replace(/[^\d]/g, '');
                const val = parseInt(txt, 10);
                return Number.isFinite(val) && val !== prev;
              },
              { selector: SELECTOR, prev: before },
              { timeout: 4000 }
            )
            .catch(() => {});
        } else {
          await page.waitForTimeout(500);
        }
      }
    }

    // Läs räknaren (oavsett variant)
    const players =
      (await waitForPlayerCount(page, SELECTOR, 15000)) ?? (await getCount());

    await browser.close();
    return {
      players: Number.isFinite(players) ? players : null,
      via: variant === "a" ? "playwright:a" : "playwright",
    };
  } catch (error) {
    console.error("[players][playwright] failed", { url, variant, error });
    return {
      players: null,
      via: "playwright-failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ---------- Puppeteer (för Vercel) ----------
async function tryPuppeteer({ url, variant }) {
  if (!process.env.VERCEL) return { players: null, via: "puppeteer-skip" };

  try {
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

    const page = await browser.newPage();

    await page.setExtraHTTPHeaders({ "Accept-Language": "sv-SE,sv;q=0.9,en;q=0.8" });
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36"
    );
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const type = req.resourceType();
      if (["image", "media", "font", "stylesheet"].includes(type)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Cookie-knapp ibland
    try {
      const buttonXPath = "//button[contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'allow') or contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'accept')]";
      const [btn] = await page.$x(buttonXPath);
      if (btn) await btn.click({ delay: 50 });
    } catch {}

    const SELECTOR = "#playersCounter, [data-testid=\"player-counter\"]";

    async function getCount() {
      try {
        const handle = await page.$(SELECTOR);
        if (!handle) return null;
        const txt = await page.evaluate((el) => (el.textContent || "").trim(), handle);
        await handle.dispose();
        return parsePlayersFromText(txt);
      } catch {
        return null;
      }
    }

    async function clickCrazyTimeASwitch() {
      try {
        const clicked = await page.evaluate(() => {
          const switcher = document.querySelector('[data-testid="crazytime-a-switch"]');
          if (!switcher) return false;
          const second = switcher.querySelector(':scope > div:nth-child(2)');
          if (!second) return false;
          second.click();
          return true;
        });
        if (clicked) return true;
      } catch {}

      const selectors = [
        "button.MuiTab-root",
        "a.MuiTab-root",
        "[role=tab]",
        "button",
        "a",
      ];

      for (const sel of selectors) {
        const handles = await page.$$(sel);
        for (const handle of handles) {
          try {
            const text = await page.evaluate((el) => (el.textContent || "").trim(), handle);
            if (/crazy\s*time\s*a/i.test(text || "")) {
              await handle.click({ delay: 20 });
              return true;
            }
          } catch {}
          finally {
            try {
              await handle.dispose();
            } catch {}
          }
        }
      }

      try {
        const [xpHandle] = await page.$x(
          "//*[self::button or self::a or @role='tab' or @role='button' or contains(@class,'tab')][contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'crazy time a')]"
        );
        if (xpHandle) {
          await xpHandle.click({ delay: 20 });
          await xpHandle.dispose();
          return true;
        }
      } catch {}

      return await page.evaluate(() => {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
          if (node.nodeValue && /crazy\s*time\s*a/i.test(node.nodeValue)) {
            let el = node.parentElement;
            while (el && el !== document.body) {
              if (
                el.matches(
                  "button, a, [role='button'], [role='tab'], .MuiTab-root, .tab, [class*='tab'], [class*='TwTab']"
                )
              ) {
                el.click();
                return true;
              }
              el = el.parentElement;
            }
          }
        }
        return false;
      });
    }

    async function waitForCrazyTimeAActive() {
      await page
        .waitForFunction(() => {
          const switcher = document.querySelector('[data-testid="crazytime-a-switch"]');
          if (!switcher) return false;
          const second = switcher.querySelector(':scope > div:nth-child(2)');
          if (!second) return false;
          return second.classList.contains('tw:bg-cornflower');
        }, { timeout: 3000 })
        .catch(() => {});
    }

    if (variant === "a") {
      const before = await getCount();
      const clicked = await clickCrazyTimeASwitch();
      if (clicked) {
        await waitForCrazyTimeAActive();
        if (before != null) {
          await page
            .waitForFunction(
              (selector, prev) => {
                const el = document.querySelector(selector);
                if (!el) return false;
                const txt = (el.textContent || "").replace(/[^\d]/g, "");
                const val = parseInt(txt, 10);
                return Number.isFinite(val) && val !== prev;
              },
              { timeout: 4000 },
              SELECTOR,
              before
            )
            .catch(() => {});
        } else {
          await page.waitForTimeout(500);
        }
      }
    }

    const players =
      (await waitForPlayerCount(page, SELECTOR, 15000)) ?? (await getCount());

    await browser.close();

    return {
      players: Number.isFinite(players) ? players : null,
      via: variant === "a" ? "puppeteer:a" : "puppeteer",
    };
  } catch (error) {
    console.error("[players][puppeteer] failed", { url, variant, error });
    return {
      players: null,
      via: "puppeteer-failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runHeadlessFetch(opts) {
  if (process.env.VERCEL) return tryPuppeteer(opts);
  return tryPlaywright(opts);
}

// ---------- Route ----------
export async function GET(req, ctx) {
  try {
    // Vänta in params i dynamiska API:er
    const paramsMaybe = ctx?.params;
    const params =
      paramsMaybe && typeof paramsMaybe.then === "function"
        ? await paramsMaybe
        : paramsMaybe || {};
    const slug = params.game;

    if (!slug || !ALLOWED.has(slug)) {
      return resJSON(
        { ok: false, error: "Unknown or disallowed game slug" },
        400
      );
    }

    const { searchParams } = new URL(req.url);
    const variant =
      (searchParams.get("variant") || "").toLowerCase() === "a"
        ? "a"
        : "default";
    const force = searchParams.get("force") === "1";
    const debug = searchParams.get("debug") === "1";
    const url = `${BASE}/${slug}/`;
    const cacheKey = `${slug}:${variant}`;
    const seriesKey = `${slug}${variant === "a" ? ":a" : ""}`;

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
    let viaDetail = null;
    let plainError = null;
    let lobbyError = null;
    let fetchedAtOverride = null;

    const lobbyKey = lobbyKeyFor(slug, variant);
    if (lobbyKey) {
      try {
        const lobby = await fetchLobbyCounts(force);
        const raw = lobby?.gameShowPlayerCounts?.[lobbyKey];
        const normalized = normalizePlayers(raw);
        if (normalized != null) {
          players = normalized;
          via = "lobby-api";
          fetchedAtOverride = lobby?.createdAt ? new Date(lobby.createdAt).toISOString() : null;
          if (lobby?.id || lobby?.createdAt) {
            viaDetail = [
              lobby?.id ? `id=${lobby.id}` : null,
              lobby?.createdAt ? `createdAt=${lobby.createdAt}` : null,
            ]
              .filter(Boolean)
              .join(" ");
          }
        } else {
          lobbyError = `No lobby value for ${lobbyKey}`;
        }
      } catch (error) {
        lobbyError = error instanceof Error ? error.message : String(error);
      }
    }

    if (!Number.isFinite(players)) {
      if (variant === "default") {
        // För standard-varianten: försök plain först (billigt)
        try {
          const html = await plainFetch(url);
          const plain = extractPlayersFromHTML(html);
          players = plain.players;
          via = plain.via;
        } catch (error) {
          via = "plain:error";
          plainError = error instanceof Error ? error.message : String(error);
        }
        if (!Number.isFinite(players)) {
          const headless = await runHeadlessFetch({ url, variant });
          players = headless.players;
          via = headless.via;
          viaDetail = headless.error || null;
        }
      } else {
        // För A-variant: gå direkt på Playwright (måste klicka)
        const headless = await runHeadlessFetch({ url, variant: "a" });
        players = headless.players;
        via = headless.via;
        viaDetail = headless.error || null;
      }
    }

    if (debug) {
      return resJSON({
        ok: Number.isFinite(players),
        slug,
        variant,
        via,
        viaDetail,
        lobbyKey,
        lobbyError,
        plainError,
        players: Number.isFinite(players) ? players : null,
      });
    }

    if (!Number.isFinite(players)) {
      const fallback = await getLatestSample(seriesKey).catch(() => null);
      if (fallback) {
        const data = {
          slug,
          variant,
          players: fallback.value,
          fetchedAt: new Date(fallback.ts).toISOString(),
          stale: true,
        };
        const payload = {
          ok: true,
          ...data,
          via: via === "unknown" ? "fallback-cache" : `${via}-fallback`,
          viaDetail,
          lobbyError,
          plainError,
          source: "cache",
        };
        const etag = makeEtag({ slug, variant, players: data.players, fetchedAt: data.fetchedAt, stale: true });
        g.__CS_CACHE__.set(cacheKey, { ts: Date.now(), data: payload, etag });
        return resJSON(payload, 200, { ETag: etag, "Cache-Control": "no-store" });
      }

      return resJSON(
        {
          ok: false,
          error: "Hittade inte players",
          slug,
          variant,
          via,
          viaDetail,
          lobbyError,
          plainError,
        },
        503,
        {
          "Retry-After": "60",
        }
      );
    }

    const data = {
      slug,
      variant,
      players,
      fetchedAt: fetchedAtOverride || new Date().toISOString(),
      stale: false,
    };
    const payload = {
      ok: true,
      ...data,
      via,
      viaDetail,
      lobbyError,
      plainError,
    };

    // Persist: spara under "crazy-time" resp. "crazy-time:a"
    try {
      await saveSample(seriesKey, data.fetchedAt, players);
    } catch {}

    const etag = makeEtag(data);
    g.__CS_CACHE__.set(cacheKey, { ts: Date.now(), data: payload, etag });

    return resJSON(payload, 200, { ETag: etag });
  } catch (err) {
    return resJSON({ ok: false, error: err?.message || String(err) }, 500);
  }
}
