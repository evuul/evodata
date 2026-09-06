// Runs the lobby collector on Cloudflare's schedule and refreshes Hourly after a completed day.

export async function runLobbySchedule(cron, env, fetchImpl = fetch) {
  const base = new URL(env.CRON_BASE_URL);
  if (base.protocol !== "https:" || base.username || base.password || !env.CRON_SECRET) {
    throw new Error("Lobby scheduler configuration is incomplete");
  }
  const routes = {
    "7,17,27,37,47,57 * * * *": "/api/casinoscores/cron",
    "35 3 * * *": "/api/casinoscores/lobby/materialize",
  };
  const path = routes[cron];
  if (!path) throw new Error("Unexpected lobby schedule");
  const response = await fetchImpl(new URL(path, base.origin), {
    method: "POST", redirect: "error",
    headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok) throw new Error(`Lobby job failed (${response.status})`);
  const result = await response.json();
  if (result.ok !== true || result.hourly?.reason === "storage-unavailable" || result.hourlyBaseline?.ok === false) {
    throw new Error("Lobby job reported an unsuccessful refresh");
  }
  return { ok: true, skipped: result.skipped === true };
}

const worker = {
  async scheduled(event, env) {
    await runLobbySchedule(event.cron, env);
  },
  async fetch() {
    return new Response("Not found", { status: 404 });
  },
};

export default worker;
