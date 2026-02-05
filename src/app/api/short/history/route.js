export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import { loadShortHistory } from "@/lib/shortHistoryStore";

const CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=600";

export async function GET() {
  try {
    const items = await loadShortHistory();

    return new Response(
      JSON.stringify({
        items,
        count: items.length,
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
