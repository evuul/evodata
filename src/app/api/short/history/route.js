export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import fs from "fs/promises";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "src", "app", "data", "shortHistory.json");

export async function GET() {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8").catch(() => "[]");
    let items = [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Normalisera och filtrera
        items = parsed
          .map(o => ({
            date: String(o?.date ?? o?.d ?? ""),
            percent: Number(o?.percent ?? o?.p),
          }))
          .filter(x => x.date && Number.isFinite(x.percent));
      }
    } catch {}

    return new Response(
      JSON.stringify({
        items,
        count: items.length,
        updatedAt: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}