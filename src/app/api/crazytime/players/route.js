// export const dynamic = "force-dynamic";
// export const runtime = "nodejs";
// export const maxDuration = 30;

// const TARGET_URL = "https://casinoscores.com/crazy-time/";

// let cache = { ts: 0, data: null, etag: null };
// const TTL_MS = 9 * 60 * 1000;

// function resJSON(data, status = 200, extra = {}) {
//   return new Response(JSON.stringify(data), {
//     status,
//     headers: {
//       "Content-Type": "application/json; charset=utf-8",
//       "Cache-Control": "no-store",
//       ...extra,
//     },
//   });
// }
// function makeEtag(payload) {
//   const s = JSON.stringify(payload);
//   let h = 0;
//   for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
//   return `W/"${h.toString(16)}"`;
// }

// // --- HTML parsing: försök hitta spelarräknaren ---
// function extractPlayersFromHTML(html) {
//   const idMatch = html.match(/id=["']playersCounter["'][^>]*>([\s\S]*?)<\/\s*div\s*>/i);
//   if (idMatch) {
//     const n = parseInt(idMatch[1].replace(/[^\d]/g, ""), 10);
//     if (Number.isFinite(n)) return { players: n, via: "plain:id" };
//   }
//   const dtidMatch = html.match(/data-testid=["']player-counter["'][^>]*>([\s\S]*?)<\/\s*div\s*>/i);
//   if (dtidMatch) {
//     const n = parseInt(dtidMatch[1].replace(/[^\d]/g, ""), 10);
//     if (Number.isFinite(n)) return { players: n, via: "plain:data-testid" };
//   }
//   // fallback: “… players”
//   const text = html
//     .replace(/<script[\s\S]*?<\/script>/gi, " ")
//     .replace(/<style[\s\S]*?<\/style>/gi, " ")
//     .replace(/<[^>]+>/g, " ");
//   const m = text.match(/([\d\s.,\u00A0]{1,12})\s*players/i);
//   if (m) {
//     const n = parseInt(m[1].replace(/[^\d]/g, ""), 10);
//     if (Number.isFinite(n)) return { players: n, via: "plain:players-word" };
//   }
//   return { players: null, via: "plain:none" };
// }

// async function plainFetch() {
//   const r = await fetch(TARGET_URL, {
//     headers: {
//       "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari",
//       "Accept-Language": "sv-SE,sv;q=0.9,en;q=0.8",
//       "Accept": "text/html,application/xhtml+xml",
//       "Referer": "https://www.google.com/",
//     },
//     cache: "no-store",
//   });
//   if (!r.ok) throw new Error(`HTTP ${r.status}`);
//   const html = await r.text();
//   return html;
// }

// // --- Playwright-fallback (körs endast lokalt, hoppar över i Vercel) ---
// async function tryPlaywright() {
//   // Skippa i Vercel (för tungt i serverless): använd plainFetch där
//   if (process.env.VERCEL) {
//     return { players: null, via: "playwright-skip-vercel" };
//   }
//   try {
//     const { chromium } = await import("playwright"); // dynamisk import
//     const browser = await chromium.launch({ headless: true });
//     const page = await browser.newPage();

//     await page.route("**/*", (route) => {
//       const type = route.request().resourceType();
//       if (["image", "media", "font", "stylesheet"].includes(type)) {
//         return route.abort();
//       }
//       route.continue();
//     });

//     await page.setExtraHTTPHeaders({ "Accept-Language": "sv-SE,sv;q=0.9,en;q=0.8" });
//     await page.goto(TARGET_URL, { waitUntil: "domcontentloaded", timeout: 30000 });

//     const SELECTOR = '#playersCounter, [data-testid="player-counter"]';
//     let players = null;

//     try {
//       await page.waitForSelector(SELECTOR, { timeout: 8000 });
//       const txt = await page.$eval(SELECTOR, (el) => (el.textContent || "").trim());
//       const n = parseInt(txt.replace(/[^\d]/g, ""), 10);
//       if (Number.isFinite(n)) players = n;
//     } catch {
//       // sista fallback: leta stor siffra i bodytext
//       const bodyText = await page.evaluate(() => document.body?.innerText || "");
//       const m = bodyText.match(/(^|\D)(\d{3,})(\D|$)/);
//       if (m) {
//         const n = parseInt(m[2], 10);
//         if (Number.isFinite(n)) players = n;
//       }
//     }

//     await browser.close();
//     return { players, via: "playwright" };
//   } catch (e) {
//     console.warn("[CT] Playwright fallback failed:", e?.message || e);
//     return { players: null, via: "playwright-failed", err: String(e?.message || e) };
//   }
// }

// export async function GET(req) {
//   try {
//     const { searchParams } = new URL(req.url);
//     const debug = searchParams.get("debug") === "1";

//     // Cache
//     const now = Date.now();
//     if (cache.data && now - cache.ts < TTL_MS && !debug) {
//       const inm = req.headers.get("if-none-match");
//       if (inm && inm === cache.etag) return new Response(null, { status: 304, headers: { ETag: cache.etag } });
//       return resJSON({ ok: true, source: "cache", ...cache.data }, 200, { ETag: cache.etag });
//     }

//     // 1) Plain HTML
//     const html = await plainFetch();
//     const plain = extractPlayersFromHTML(html);

//     let players = plain.players;
//     let via = plain.via;

//     // 2) Om inte hittat → Playwright (lokalt)
//     if (!Number.isFinite(players)) {
//       const p = await tryPlaywright();
//       players = p.players;
//       via = p.via;
//     }

//     // Debug-läge
//     if (debug) {
//       const sample = html.slice(0, 1500);
//       return resJSON(
//         {
//           ok: Number.isFinite(players),
//           players: Number.isFinite(players) ? players : null,
//           via,
//           hint: "debug=1 visar HTML-snutt från plain fetch",
//           htmlSample: sample,
//         },
//         Number.isFinite(players) ? 200 : 503
//       );
//     }

//     if (!Number.isFinite(players)) {
//       return resJSON({ ok: false, error: "Hittade inte players", via }, 503, { "Retry-After": "60" });
//     }

//     const data = { url: TARGET_URL, players, fetchedAt: new Date().toISOString(), via };
//     const etag = makeEtag(data);
//     cache = { ts: Date.now(), data, etag };

//     return resJSON({ ok: true, ...data }, 200, { ETag: etag });
//   } catch (err) {
//     const msg = err?.message || String(err);
//     console.error("[CrazyTime] 500:", msg);
//     return resJSON({ ok: false, error: msg }, 500);
//   }
// }