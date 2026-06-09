export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import { EVO_LEI, resolveFiShortSnapshot } from "@/lib/fiShortRegister";
import { loadShortHistory, saveShortHistory, upsertShortHistoryEntry } from "@/lib/shortHistoryStore";

const CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=600";

export async function GET() {
  try {
    const history = await loadShortHistory();
    let items = history;
    let refreshed = false;

    try {
      const snapshot = await resolveFiShortSnapshot({ lei: EVO_LEI, force: true });
      if (Number.isFinite(Number(snapshot?.totalPercent))) {
        const date = typeof snapshot.observedDate === "string" && snapshot.observedDate ? snapshot.observedDate : null;
        const percent = Number(snapshot.totalPercent);
        const result = upsertShortHistoryEntry(history, {
          date: date ?? new Date().toISOString().slice(0, 10),
          percent,
        });
        if (result.changed) {
          items = await saveShortHistory(result.items);
          refreshed = true;
        } else {
          items = result.items;
        }
      }
    } catch {
      items = history;
    }

    return new Response(
      JSON.stringify({
        items,
        count: items.length,
        refreshed,
        updatedAt: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", "Cache-Control": CACHE_CONTROL },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Cache-Control": CACHE_CONTROL },
    });
  }
}
