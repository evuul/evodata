// Provides a protected connectivity check for the configured KV store.

import { kv } from "@vercel/kv";
import { requireCronAuth, resolveCronSecret } from "@/lib/cronAuth";
import { logApiError } from "@/lib/apiErrors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

const SECRET = resolveCronSecret(process.env.DEBUG_KV_SECRET, process.env.CRON_SECRET);
const RESPONSE_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

function json(payload, status) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: RESPONSE_HEADERS,
  });
}

export async function GET(request) {
  const auth = requireCronAuth(request, SECRET, "Debug access is not configured");
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status);

  try {
    await kv.set("kv-test-key", `Hello KV! ${Date.now()}`, { ex: 60 });
    const val = await kv.get("kv-test-key");
    return json({ ok: true, value: val }, 200);
  } catch (err) {
    logApiError({ route: "debug/kv", stage: "connectivity-check", error: err });
    return json({ ok: false, error: "KV connectivity check failed" }, 500);
  }
}
