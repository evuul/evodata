import { kv } from "@vercel/kv";

export async function GET() {
  try {
    // skriv ett testvärde
    await kv.set("kv-test-key", `Hello KV! ${Date.now()}`, { ex: 60 }); // 60 sek TTL

    // läs tillbaka värdet
    const val = await kv.get("kv-test-key");

    return new Response(
      JSON.stringify({ ok: true, value: val }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err?.message || String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}