export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { getLatestSample } from "@/lib/csStore";
import { SERIES_SLUGS, CRAZY_TIME_A_RESET_MS } from "../shared";

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

    for (const slug of SERIES_SLUGS) {
      const sample = await getLatestSample(slug);
      const usable =
        slug === "crazy-time:a" && sample && sample.ts < CRAZY_TIME_A_RESET_MS
          ? null
          : sample;
      if (usable) {
        newestTs = Math.max(newestTs, usable.ts);
        items.push({
          id: slug,
          players: usable.value,
          fetchedAt: new Date(usable.ts).toISOString(),
          ageSeconds: Math.max(0, Math.round((Date.now() - usable.ts) / 1000)),
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
