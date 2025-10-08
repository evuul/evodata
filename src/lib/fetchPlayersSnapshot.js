// src/lib/fetchPlayersSnapshot.js

import { GAMES } from "@/config/games";

function buildUrl(origin, game, { force = false, cron = false } = {}) {
  const params = new URLSearchParams();
  if (force) params.set("force", "1");
  if (cron) params.set("cron", "1");
  if (game.apiVariant) params.set("variant", game.apiVariant);
  const qs = params.toString();
  return `${origin}/api/casinoscores/players/${game.apiSlug}${qs ? `?${qs}` : ""}`;
}

export async function fetchPlayersSnapshot({ origin, force = false, includeMeta = false, cronMode = false } = {}) {
  const results = [];

  for (const game of GAMES) {
    const started = Date.now();
    try {
      const res = await fetch(buildUrl(origin, game, { force, cron: cronMode }), { cache: "no-store" });
      let payload = null;
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        try {
          payload = await res.json();
        } catch {
          payload = null;
        }
      }

      const ok = payload?.ok === true && Number.isFinite(payload?.players);
      results.push({
        id: game.id,
        slug: game.apiSlug,
        variant: game.apiVariant || null,
        status: res.status,
        ok,
        players: payload?.players ?? null,
        fetchedAt: payload?.fetchedAt ?? null,
        error: ok ? null : payload?.error || res.statusText || "Unknown error",
        durationMs: Date.now() - started,
        meta: includeMeta ? payload : undefined,
      });
    } catch (error) {
      results.push({
        id: game.id,
        slug: game.apiSlug,
        variant: game.apiVariant || null,
        status: 0,
        ok: false,
        players: null,
        fetchedAt: null,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - started,
        meta: includeMeta ? null : undefined,
      });
    }
  }

  return results;
}
