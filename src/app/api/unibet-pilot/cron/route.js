// Runs the isolated Unibet reliability pilot without updating production lobby data.

import { requireCronAuth, resolveCronSecret } from "@/lib/cronAuth";
import { collectUnibetPilotSample } from "@/lib/unibetPilotCollector";
import { createUnibetPilotFailure } from "@/lib/unibetPilot";
import { appendUnibetPilotSample } from "@/lib/unibetPilotStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const SECRET = resolveCronSecret(process.env.UNIBET_PILOT_CRON_SECRET, process.env.CRON_SECRET);

const json = (data, status = 200) =>
  Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });

export async function POST(request) {
  const auth = requireCronAuth(request, SECRET, "UNIBET_PILOT_CRON_SECRET is not configured");
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status);

  const startedAt = Date.now();
  try {
    const sample = await collectUnibetPilotSample();
    sample.durationMs = Date.now() - startedAt;
    await appendUnibetPilotSample(sample);
    return json({
      ok: true,
      pilot: true,
      isolated: true,
      sample: {
        collectedAt: sample.collectedAt,
        durationMs: sample.durationMs,
        gameCount: sample.gameCount,
        totalPlayers: sample.totalPlayers,
      },
    });
  } catch (error) {
    const failure = createUnibetPilotFailure(error);
    failure.durationMs = Date.now() - startedAt;
    try {
      await appendUnibetPilotSample(failure);
    } catch {
      // Preserve the collector error if pilot storage is also unavailable.
    }
    return json({ ok: false, pilot: true, isolated: true, error: failure.error }, 502);
  }
}

export async function GET() {
  return json({ ok: false, error: "Method not allowed" }, 405);
}
