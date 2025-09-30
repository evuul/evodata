export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { getLatestSample } from "@/lib/csStore";

const SLUGS = [
  "crazy-time",
  "crazy-time:a",
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
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function GET() {
  try {
    const items = [];
    let newestTs = 0;

    for (const slug of SLUGS) {
      const sample = await getLatestSample(slug);
      if (sample) {
        newestTs = Math.max(newestTs, sample.ts);
        items.push({
          id: slug,
          players: sample.value,
          fetchedAt: new Date(sample.ts).toISOString(),
          ageSeconds: Math.max(0, Math.round((Date.now() - sample.ts) / 1000)),
        });
      } else {
        items.push({ id: slug, players: null, fetchedAt: null, ageSeconds: null });
      }
    }

    return resJSON({
      ok: true,
      items,
      updatedAt: newestTs ? new Date(newestTs).toISOString() : null,
    });
  } catch (err) {
    return resJSON({ ok: false, error: err?.message || String(err) }, 500);
  }
}
