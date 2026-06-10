export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import { requireCronAuth, resolveCronSecret } from "@/lib/cronAuth";

const CACHE_CONTROL = "no-store, max-age=0, must-revalidate";
const SECRET = resolveCronSecret(process.env.CRON_SECRET);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": CACHE_CONTROL,
    },
  });
}

async function runCron(request) {
  try {
    const auth = requireCronAuth(request, SECRET, "CRON_SECRET is not configured");
    if (!auth.ok) {
      return json(
        {
          ok: false,
          status: auth.status,
          refreshed: false,
          error: auth.error,
          timestamp: new Date().toISOString(),
        },
        auth.status
      );
    }

    const origin = new URL(request.url).origin;
    const res = await fetch(`${origin}/api/short/snapshot?force=1`, {
      method: "POST",
      cache: "no-store",
    });

    let payload = null;
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        payload = await res.json();
      } catch {
        payload = null;
      }
    }

    const ok = res.ok && payload?.ok !== false;
    return json({
      ok,
      status: res.status,
      refreshed: payload?.ok ?? false,
      ignored: Boolean(payload?.ignored),
      date: payload?.date ?? null,
      percent: payload?.percent ?? null,
      totalDays: payload?.totalDays ?? null,
      cached: Boolean(payload?.cached),
      stale: Boolean(payload?.stale),
      error: payload?.error ?? null,
      timestamp: new Date().toISOString(),
    }, ok ? 200 : 502);
  } catch (error) {
    return json(
      {
        ok: false,
        status: 0,
        refreshed: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
}

export async function GET(request) {
  return runCron(request);
}

export async function POST(request) {
  return runCron(request);
}
